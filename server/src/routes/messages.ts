import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { Server } from 'socket.io';

const router = Router();

function getIO(res: Response): Server | null {
  return res.req.app.get('io') || null;
}

// Helper to verify friendship
export async function verifyFriendship(user1Id: string, user2Id: string): Promise<boolean> {
  const friendship = await prisma.friendship.findFirst({
    where: {
      OR: [
        { user1Id, user2Id },
        { user1Id: user2Id, user2Id: user1Id },
      ],
      status: 'ACTIVE',
    },
  });
  return !!friendship;
}

const sendMessageSchema = z.object({
  receiverId: z.string().min(1, 'Receiver ID is required'),
  content: z.string().max(4000).default(''),
  type: z.enum(['TEXT', 'IMAGE', 'FILE']).default('TEXT'),
  fileUrl: z.string().optional(),
  fileName: z.string().optional(),
  fileSize: z.number().optional(),
  replyToId: z.string().optional(),
});

// GET /api/messages/:targetUserId - fetch paginated message history
router.get('/:targetUserId', authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  try {
    const currentUserId = req.user!.id;
    const { targetUserId } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 30, 100);
    const cursor = req.query.cursor as string | undefined;

    // Strict friendship check
    const isFriend = await verifyFriendship(currentUserId, targetUserId);
    if (!isFriend) {
      res.status(403).json({
        error: 'Forbidden. You can only view chat history with accepted friends.',
        isFriend: false,
      });
      return;
    }

    const whereClause: any = {
      OR: [
        { senderId: currentUserId, receiverId: targetUserId },
        { senderId: targetUserId, receiverId: currentUserId },
      ],
    };

    if (cursor) {
      whereClause.createdAt = { lt: new Date(cursor) };
    }

    const messages = await prisma.message.findMany({
      where: whereClause,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        sender: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
        replyTo: {
          select: {
            id: true,
            content: true,
            type: true,
            senderId: true,
            sender: {
              select: { id: true, username: true, displayName: true },
            },
          },
        },
      },
    });

    // Filter out messages deleted "for me"
    const filteredMessages = messages
      .filter((msg) => {
        if (!msg.deletedFor) return true;
        const deletedUserIds = msg.deletedFor.split(',');
        return !deletedUserIds.includes(currentUserId);
      })
      .map((msg) => {
        if (msg.isDeleted) {
          return {
            ...msg,
            content: 'This message was deleted',
            fileUrl: null,
            fileName: null,
            fileSize: null,
          };
        }
        return msg;
      });

    // Automatically mark delivered messages as seen if received by current user
    await prisma.message.updateMany({
      where: {
        senderId: targetUserId,
        receiverId: currentUserId,
        status: { in: ['SENT', 'DELIVERED'] },
      },
      data: { status: 'SEEN' },
    });

    const nextCursor = messages.length === limit ? messages[messages.length - 1].createdAt.toISOString() : null;

    res.json({
      messages: filteredMessages.reverse(), // chronologically ascending for UI
      nextCursor,
    });
  } catch (error) {
    console.error('Fetch messages error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// POST /api/messages/send
router.post('/send', authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  try {
    const parseResult = sendMessageSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0].message });
      return;
    }

    const currentUserId = req.user!.id;
    const { receiverId, content, type, fileUrl, fileName, fileSize, replyToId } = parseResult.data;

    // Strict friendship check
    const isFriend = await verifyFriendship(currentUserId, receiverId);
    if (!isFriend) {
      res.status(403).json({
        error: 'Forbidden. You can only send messages to accepted friends.',
      });
      return;
    }

    if (type === 'TEXT' && !content.trim()) {
      res.status(400).json({ error: 'Message content cannot be empty' });
      return;
    }

    const newMessage = await prisma.message.create({
      data: {
        senderId: currentUserId,
        receiverId,
        content: content.trim(),
        type,
        fileUrl,
        fileName,
        fileSize,
        replyToId: replyToId || null,
        status: 'SENT',
      },
      include: {
        sender: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
        replyTo: {
          select: {
            id: true,
            content: true,
            type: true,
            senderId: true,
            sender: {
              select: { id: true, username: true, displayName: true },
            },
          },
        },
      },
    });

    // Update friendship's updatedAt to sort recent chats
    await prisma.friendship.updateMany({
      where: {
        OR: [
          { user1Id: currentUserId, user2Id: receiverId },
          { user1Id: receiverId, user2Id: currentUserId },
        ],
      },
      data: { updatedAt: new Date() },
    });

    const io = getIO(res);
    if (io) {
      // Send to receiver room and sender room
      io.to(`user:${receiverId}`).emit('new_message', newMessage);
      io.to(`user:${currentUserId}`).emit('message_sent', newMessage);
    }

    res.status(201).json({ message: newMessage });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// DELETE /api/messages/:messageId
router.delete('/:messageId', authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  try {
    const { messageId } = req.params;
    const currentUserId = req.user!.id;
    const mode = (req.query.mode as string) || 'for_everyone'; // 'for_me' or 'for_everyone'

    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      res.status(404).json({ error: 'Message not found' });
      return;
    }

    const io = getIO(res);

    if (mode === 'for_everyone') {
      if (message.senderId !== currentUserId) {
        res.status(403).json({ error: 'You can only delete your own messages for everyone.' });
        return;
      }

      const updated = await prisma.message.update({
        where: { id: messageId },
        data: {
          isDeleted: true,
          content: 'This message was deleted',
          fileUrl: null,
          fileName: null,
          fileSize: null,
        },
      });

      if (io) {
        io.to(`user:${message.senderId}`).emit('message_deleted', { messageId });
        io.to(`user:${message.receiverId}`).emit('message_deleted', { messageId });
      }

      res.json({ message: 'Message deleted for everyone', updated });
      return;
    }

    if (mode === 'for_me') {
      const existingDeletedFor = message.deletedFor ? message.deletedFor.split(',') : [];
      if (!existingDeletedFor.includes(currentUserId)) {
        existingDeletedFor.push(currentUserId);
      }

      await prisma.message.update({
        where: { id: messageId },
        data: {
          deletedFor: existingDeletedFor.join(','),
        },
      });

      if (io) {
        io.to(`user:${currentUserId}`).emit('message_deleted_for_me', { messageId });
      }

      res.json({ message: 'Message deleted for you' });
      return;
    }

    res.status(400).json({ error: 'Invalid deletion mode' });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

// POST /api/messages/mark-seen/:targetUserId
router.post('/mark-seen/:targetUserId', authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  try {
    const currentUserId = req.user!.id;
    const { targetUserId } = req.params;

    await prisma.message.updateMany({
      where: {
        senderId: targetUserId,
        receiverId: currentUserId,
        status: { not: 'SEEN' },
      },
      data: { status: 'SEEN' },
    });

    const io = getIO(res);
    if (io) {
      io.to(`user:${targetUserId}`).emit('messages_seen', {
        byUserId: currentUserId,
        seenAt: new Date().toISOString(),
      });
    }

    res.json({ message: 'Messages marked as seen' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark messages seen' });
  }
});

export default router;
