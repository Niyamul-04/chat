import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { verifyFriendship } from './messages';
import { config } from '../config';

const router = Router();

const callRecordSchema = z.object({
  receiverId: z.string().min(1),
  type: z.enum(['AUDIO', 'VIDEO']),
  status: z.enum(['MISSED', 'REJECTED', 'COMPLETED', 'BUSY']),
  durationSeconds: z.number().int().min(0).default(0),
});

// GET /api/calls/config - return ICE servers (STUN + optional TURN)
router.get('/config', authMiddleware, async (_req: AuthRequest, res: Response): Promise<void> => {
  const iceServers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ];

  if (config.turnUrl) {
    const turnServer: any = { urls: config.turnUrl };
    if (config.turnUsername) turnServer.username = config.turnUsername;
    if (config.turnCredential) turnServer.credential = config.turnCredential;
    iceServers.push(turnServer);
  }

  res.json({ iceServers });
});

// GET /api/calls/history/:targetUserId
router.get('/history/:targetUserId', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const currentUserId = req.user!.id;
    const { targetUserId } = req.params;

    const isFriend = await verifyFriendship(currentUserId, targetUserId);
    if (!isFriend) {
      res.status(403).json({ error: 'Only friends can view call history.' });
      return;
    }

    const calls = await prisma.callRecord.findMany({
      where: {
        OR: [
          { callerId: currentUserId, receiverId: targetUserId },
          { callerId: targetUserId, receiverId: currentUserId },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        caller: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        receiver: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
    });

    res.json({ calls });
  } catch (error) {
    console.error('Fetch calls error:', error);
    res.status(500).json({ error: 'Failed to fetch call history' });
  }
});

// POST /api/calls/record
router.post('/record', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const parseResult = callRecordSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0].message });
      return;
    }

    const currentUserId = req.user!.id;
    const { receiverId, type, status, durationSeconds } = parseResult.data;

    // Strict friendship check
    const isFriend = await verifyFriendship(currentUserId, receiverId);
    if (!isFriend) {
      res.status(403).json({ error: 'Calls are only permitted between accepted friends.' });
      return;
    }

    const callRecord = await prisma.callRecord.create({
      data: {
        callerId: currentUserId,
        receiverId,
        type,
        status,
        durationSeconds,
      },
      include: {
        caller: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        receiver: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
    });

    res.status(201).json({ call: callRecord });
  } catch (error) {
    console.error('Save call record error:', error);
    res.status(500).json({ error: 'Failed to save call record' });
  }
});

export default router;
