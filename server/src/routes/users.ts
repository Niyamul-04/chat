import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

const updateProfileSchema = z.object({
  displayName: z.string().min(2).max(50).optional(),
  bio: z.string().max(250).optional(),
  avatarUrl: z.string().url().or(z.string().startsWith('/uploads/')).optional(),
});

// GET /api/users/search?q=alice
router.get('/search', authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  try {
    const query = ((req.query.q as string) || '').trim().toLowerCase();
    const currentUserId = req.user!.id;

    const whereClause: any = {
      id: { not: currentUserId },
    };

    if (query) {
      whereClause.OR = [
        { username: { contains: query } },
        { displayName: { contains: query } },
      ];
    }

    const matchedUsers = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
        status: true,
        lastSeenAt: true,
        createdAt: true,
      },
      orderBy: [{ status: 'desc' }, { createdAt: 'desc' }],
      take: 50,
    });

    // Check relationship status for each user
    const usersWithStatus = await Promise.all(
      matchedUsers.map(async (u) => {
        // Check active friendship
        const friendship = await prisma.friendship.findFirst({
          where: {
            OR: [
              { user1Id: currentUserId, user2Id: u.id },
              { user1Id: u.id, user2Id: currentUserId },
            ],
          },
        });

        // Check pending friend requests
        const sentRequest = await prisma.friendRequest.findFirst({
          where: {
            senderId: currentUserId,
            receiverId: u.id,
            status: 'PENDING',
          },
        });

        const receivedRequest = await prisma.friendRequest.findFirst({
          where: {
            senderId: u.id,
            receiverId: currentUserId,
            status: 'PENDING',
          },
        });

        let relationship: 'NONE' | 'FRIENDS' | 'REQUEST_SENT' | 'REQUEST_RECEIVED' | 'BLOCKED' = 'NONE';
        if (friendship) {
          relationship = friendship.status === 'BLOCKED' ? 'BLOCKED' : 'FRIENDS';
        } else if (sentRequest) {
          relationship = 'REQUEST_SENT';
        } else if (receivedRequest) {
          relationship = 'REQUEST_RECEIVED';
        }

        return {
          ...u,
          relationship,
          requestId: sentRequest?.id || receivedRequest?.id,
        };
      })
    );

    res.json({ users: usersWithStatus });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
});

// GET /api/users/:id
router.get('/:id', authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  try {
    const { id } = req.params;
    const currentUserId = req.user!.id;

    const user = await prisma.user.findFirst({
      where: { OR: [{ id }, { username: id.toLowerCase() }] },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
        status: true,
        lastSeenAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Determine relationship
    const friendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { user1Id: currentUserId, user2Id: user.id },
          { user1Id: user.id, user2Id: currentUserId },
        ],
      },
    });

    res.json({
      user,
      isFriend: friendship?.status === 'ACTIVE',
      isBlocked: friendship?.status === 'BLOCKED',
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// PUT /api/users/profile
router.put('/profile', authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  try {
    const parseResult = updateProfileSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0].message });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user!.id },
      data: parseResult.data,
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
        status: true,
        lastSeenAt: true,
      },
    });

    res.json({ message: 'Profile updated successfully', user: updatedUser });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

export default router;
