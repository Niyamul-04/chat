import { Router, Response } from 'express';
import { upload, activeStorage } from '../middleware/upload';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { prisma } from '../prisma';

const router = Router();

// POST /api/uploads/chat - upload file or image for chat
router.post('/chat', authMiddleware, upload.single('file'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file provided or invalid file format.' });
      return;
    }

    const uploaded = await activeStorage.uploadFile(req.file);

    const isImage = req.file.mimetype.startsWith('image/');

    res.json({
      url: uploaded.url,
      fileName: uploaded.fileName,
      fileSize: uploaded.size,
      mimeType: req.file.mimetype,
      type: isImage ? 'IMAGE' : 'FILE',
    });
  } catch (error: any) {
    console.error('File upload error:', error);
    res.status(500).json({ error: error.message || 'File upload failed' });
  }
});

// POST /api/uploads/avatar - upload profile avatar
router.post('/avatar', authMiddleware, upload.single('avatar'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No avatar image provided.' });
      return;
    }

    if (!req.file.mimetype.startsWith('image/')) {
      res.status(400).json({ error: 'Avatar must be an image file.' });
      return;
    }

    const uploaded = await activeStorage.uploadFile(req.file);

    // Update user profile in database
    const updatedUser = await prisma.user.update({
      where: { id: req.user!.id },
      data: { avatarUrl: uploaded.url },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
        status: true,
      },
    });

    res.json({
      message: 'Avatar updated successfully',
      avatarUrl: uploaded.url,
      user: updatedUser,
    });
  } catch (error: any) {
    console.error('Avatar upload error:', error);
    res.status(500).json({ error: error.message || 'Avatar upload failed' });
  }
});

export default router;
