import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { Server } from 'socket.io';

const router = Router();

const sendRequestSchema = z.object({
  targetUsernameOrId: z.string().min(1, 'Target user is required'),
});

// Helper to get socket.io instance
function getIO(res: Response): Server | null {
  return res.req.app.get('io') || null;
}

// GET /api/friends - list all active friends
router.get('/', authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  try {
    const currentUserId = req.user!.id;

    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [
          { user1Id: currentUserId },
          { user2Id: currentUserId },
        ],
        status: 'ACTIVE',
      },
      include: {
        user1: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            bio: true,
            status: true,
            lastSeenAt: true,
          },
        },
        user2: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            bio: true,
            status: true,
            lastSeenAt: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const friends = await Promise.all(
      friendships.map(async (f) => {
        const friend = f.user1Id === currentUserId ? f.user2 : f.user1;

        // Get latest message between current user and friend
        const lastMessage = await prisma.message.findFirst({
          where: {
            OR: [
              { senderId: currentUserId, receiverId: friend.id },
              { senderId: friend.id, receiverId: currentUserId },
            ],
            isDeleted: false,
          },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            content: true,
            type: true,
            createdAt: true,
            senderId: true,
            status: true,
          },
        });

        // Count unread messages from this friend
        const unreadCount = await prisma.message.count({
          where: {
            senderId: friend.id,
            receiverId: currentUserId,
            status: { in: ['SENT', 'DELIVERED'] },
            isDeleted: false,
          },
        });

        return {
          friendshipId: f.id,
          friend,
          lastMessage,
          unreadCount,
          createdAt: f.createdAt,
        };
      })
    );

    res.json({ friends });
  } catch (error) {
    console.error('Fetch friends error:', error);
    res.status(500).json({ error: 'Failed to fetch friends' });
  }
});

// GET /api/friends/requests - list pending received and sent requests
router.get('/requests', authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  try {
    const currentUserId = req.user!.id;

    const received = await prisma.friendRequest.findMany({
      where: {
        receiverId: currentUserId,
        status: 'PENDING',
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            bio: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const sent = await prisma.friendRequest.findMany({
      where: {
        senderId: currentUserId,
        status: 'PENDING',
      },
      include: {
        receiver: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            bio: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ received, sent });
  } catch (error) {
    console.error('Fetch requests error:', error);
    res.status(500).json({ error: 'Failed to fetch friend requests' });
  }
});

// POST /api/friends/request - send friend request
router.post('/request', authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  try {
    const parseResult = sendRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0].message });
      return;
    }

    const currentUserId = req.user!.id;
    const { targetUsernameOrId } = parseResult.data;

    // Find target user by username or ID
    const targetUser = await prisma.user.findFirst({
      where: {
        OR: [
          { id: targetUsernameOrId },
          { username: targetUsernameOrId.toLowerCase() },
        ],
      },
    });

    if (!targetUser) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    if (targetUser.id === currentUserId) {
      res.status(400).json({ error: 'You cannot send a friend request to yourself.' });
      return;
    }

    // Check existing friendship
    const existingFriendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { user1Id: currentUserId, user2Id: targetUser.id },
          { user1Id: targetUser.id, user2Id: currentUserId },
        ],
      },
    });

    if (existingFriendship) {
      if (existingFriendship.status === 'ACTIVE') {
        res.status(400).json({ error: 'You are already friends with this user.' });
        return;
      }
      if (existingFriendship.status === 'BLOCKED') {
        res.status(403).json({ error: 'Unable to send friend request to this user.' });
        return;
      }
    }

    // Check existing pending request
    const existingSent = await prisma.friendRequest.findFirst({
      where: {
        senderId: currentUserId,
        receiverId: targetUser.id,
        status: 'PENDING',
      },
    });

    if (existingSent) {
      res.status(400).json({ error: 'A friend request has already been sent to this user.' });
      return;
    }

    // Check if the other person already sent a request to current user
    const reversePending = await prisma.friendRequest.findFirst({
      where: {
        senderId: targetUser.id,
        receiverId: currentUserId,
        status: 'PENDING',
      },
    });

    if (reversePending) {
      // Auto-accept the request!
      await prisma.friendRequest.update({
        where: { id: reversePending.id },
        data: { status: 'ACCEPTED' },
      });

      const newFriendship = await prisma.friendship.create({
        data: {
          user1Id: targetUser.id,
          user2Id: currentUserId,
          status: 'ACTIVE',
        },
      });

      const io = getIO(res);
      if (io) {
        io.to(`user:${targetUser.id}`).emit('friend_request_accepted', {
          friendship: newFriendship,
          friend: req.user,
        });
        io.to(`user:${currentUserId}`).emit('friend_request_accepted', {
          friendship: newFriendship,
          friend: targetUser,
        });
      }

      res.json({
        message: 'Mutual request detected! You are now friends.',
        autoAccepted: true,
      });
      return;
    }

    // Create new friend request (upsert or create)
    const newRequest = await prisma.friendRequest.upsert({
      where: {
        senderId_receiverId: {
          senderId: currentUserId,
          receiverId: targetUser.id,
        },
      },
      update: {
        status: 'PENDING',
        createdAt: new Date(),
      },
      create: {
        senderId: currentUserId,
        receiverId: targetUser.id,
        status: 'PENDING',
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            bio: true,
          },
        },
      },
    });

    // Real-time socket notification to receiver
    const io = getIO(res);
    if (io) {
      io.to(`user:${targetUser.id}`).emit('friend_request_received', {
        request: newRequest,
      });
    }

    res.status(201).json({
      message: 'Friend request sent successfully.',
      request: newRequest,
    });
  } catch (error) {
    console.error('Send request error:', error);
    res.status(500).json({ error: 'Failed to send friend request.' });
  }
});

// POST /api/friends/accept/:requestId - accept friend request
router.post('/accept/:requestId', authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  try {
    const { requestId } = req.params;
    const currentUserId = req.user!.id;

    const request = await prisma.friendRequest.findUnique({
      where: { id: requestId },
      include: {
        sender: {
          select: { id: true, username: true, displayName: true, avatarUrl: true, bio: true, status: true },
        },
        receiver: {
          select: { id: true, username: true, displayName: true, avatarUrl: true, bio: true, status: true },
        },
      },
    });

    if (!request || request.receiverId !== currentUserId) {
      res.status(404).json({ error: 'Friend request not found or unauthorized.' });
      return;
    }

    if (request.status === 'ACCEPTED') {
      res.status(400).json({ error: 'Request is already accepted.' });
      return;
    }

    // Update request
    await prisma.friendRequest.update({
      where: { id: requestId },
      data: { status: 'ACCEPTED' },
    });

    // Create or reactivate Friendship
    const friendship = await prisma.friendship.upsert({
      where: {
        user1Id_user2Id: {
          user1Id: request.senderId,
          user2Id: request.receiverId,
        },
      },
      update: {
        status: 'ACTIVE',
        blockedById: null,
      },
      create: {
        user1Id: request.senderId,
        user2Id: request.receiverId,
        status: 'ACTIVE',
      },
    });

    const io = getIO(res);
    if (io) {
      // Notify sender that their request was accepted
      io.to(`user:${request.senderId}`).emit('friend_request_accepted', {
        friendship,
        friend: request.receiver,
      });
      // Notify receiver as well to update UI
      io.to(`user:${currentUserId}`).emit('friend_request_accepted', {
        friendship,
        friend: request.sender,
      });
    }

    res.json({
      message: 'Friend request accepted!',
      friend: request.sender,
      friendship,
    });
  } catch (error) {
    console.error('Accept request error:', error);
    res.status(500).json({ error: 'Failed to accept friend request.' });
  }
});

// POST /api/friends/decline/:requestId - decline friend request
router.post('/decline/:requestId', authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  try {
    const { requestId } = req.params;
    const currentUserId = req.user!.id;

    const request = await prisma.friendRequest.findUnique({
      where: { id: requestId },
    });

    if (!request || request.receiverId !== currentUserId) {
      res.status(404).json({ error: 'Friend request not found.' });
      return;
    }

    await prisma.friendRequest.update({
      where: { id: requestId },
      data: { status: 'DECLINED' },
    });

    res.json({ message: 'Friend request declined.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to decline friend request.' });
  }
});

// POST /api/friends/cancel/:requestId - cancel sent request
router.post('/cancel/:requestId', authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  try {
    const { requestId } = req.params;
    const currentUserId = req.user!.id;

    const request = await prisma.friendRequest.findUnique({
      where: { id: requestId },
    });

    if (!request || request.senderId !== currentUserId) {
      res.status(404).json({ error: 'Friend request not found.' });
      return;
    }

    await prisma.friendRequest.delete({
      where: { id: requestId },
    });

    const io = getIO(res);
    if (io) {
      io.to(`user:${request.receiverId}`).emit('friend_request_cancelled', {
        requestId,
      });
    }

    res.json({ message: 'Friend request cancelled.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to cancel friend request.' });
  }
});

// POST /api/friends/unfriend/:friendUserId - unfriend a user
router.post('/unfriend/:friendUserId', authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  try {
    const { friendUserId } = req.params;
    const currentUserId = req.user!.id;

    // Delete friendship
    await prisma.friendship.deleteMany({
      where: {
        OR: [
          { user1Id: currentUserId, user2Id: friendUserId },
          { user1Id: friendUserId, user2Id: currentUserId },
        ],
      },
    });

    // Reset any requests
    await prisma.friendRequest.deleteMany({
      where: {
        OR: [
          { senderId: currentUserId, receiverId: friendUserId },
          { senderId: friendUserId, receiverId: currentUserId },
        ],
      },
    });

    const io = getIO(res);
    if (io) {
      io.to(`user:${friendUserId}`).emit('unfriended', { byUserId: currentUserId });
      io.to(`user:${currentUserId}`).emit('unfriended', { byUserId: friendUserId });
    }

    res.json({ message: 'User unfriended successfully.' });
  } catch (error) {
    console.error('Unfriend error:', error);
    res.status(500).json({ error: 'Failed to unfriend.' });
  }
});

// POST /api/friends/block/:targetUserId - block a user
router.post('/block/:targetUserId', authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  try {
    const { targetUserId } = req.params;
    const currentUserId = req.user!.id;

    const friendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { user1Id: currentUserId, user2Id: targetUserId },
          { user1Id: targetUserId, user2Id: currentUserId },
        ],
      },
    });

    if (friendship) {
      await prisma.friendship.update({
        where: { id: friendship.id },
        data: {
          status: 'BLOCKED',
          blockedById: currentUserId,
        },
      });
    } else {
      await prisma.friendship.create({
        data: {
          user1Id: currentUserId,
          user2Id: targetUserId,
          status: 'BLOCKED',
          blockedById: currentUserId,
        },
      });
    }

    const io = getIO(res);
    if (io) {
      io.to(`user:${targetUserId}`).emit('blocked', { byUserId: currentUserId });
      io.to(`user:${currentUserId}`).emit('blocked', { targetUserId });
    }

    res.json({ message: 'User blocked.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to block user.' });
  }
});

// POST /api/friends/unblock/:targetUserId - unblock
router.post('/unblock/:targetUserId', authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  try {
    const { targetUserId } = req.params;
    const currentUserId = req.user!.id;

    await prisma.friendship.deleteMany({
      where: {
        OR: [
          { user1Id: currentUserId, user2Id: targetUserId },
          { user1Id: targetUserId, user2Id: currentUserId },
        ],
        status: 'BLOCKED',
        blockedById: currentUserId,
      },
    });

    res.json({ message: 'User unblocked.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to unblock user.' });
  }
});

// GET /api/friends/status/:targetUserId - check friendship status
router.get('/status/:targetUserId', authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  try {
    const { targetUserId } = req.params;
    const currentUserId = req.user!.id;

    const friendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { user1Id: currentUserId, user2Id: targetUserId },
          { user1Id: targetUserId, user2Id: currentUserId },
        ],
      },
    });

    if (friendship) {
      if (friendship.status === 'ACTIVE') {
        res.json({ status: 'FRIENDS', friendshipId: friendship.id });
        return;
      }
      if (friendship.status === 'BLOCKED') {
        res.json({
          status: 'BLOCKED',
          blockedByMe: friendship.blockedById === currentUserId,
        });
        return;
      }
    }

    const sentRequest = await prisma.friendRequest.findFirst({
      where: { senderId: currentUserId, receiverId: targetUserId, status: 'PENDING' },
    });
    if (sentRequest) {
      res.json({ status: 'REQUEST_SENT', requestId: sentRequest.id });
      return;
    }

    const receivedRequest = await prisma.friendRequest.findFirst({
      where: { senderId: targetUserId, receiverId: currentUserId, status: 'PENDING' },
    });
    if (receivedRequest) {
      res.json({ status: 'REQUEST_RECEIVED', requestId: receivedRequest.id });
      return;
    }

    res.json({ status: 'NONE' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get relationship status.' });
  }
});

export default router;
