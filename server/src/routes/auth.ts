import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../prisma';
import { authMiddleware, generateToken, AuthRequest } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimiter';

const router = Router();

const signupSchema = z.object({
  username: z
    .string()
    .min(3, 'User ID must be at least 3 characters')
    .max(30, 'User ID cannot exceed 30 characters')
    .regex(/^[a-zA-Z0-9_.-]+$/, 'User ID can only contain letters, numbers, underscores, and dashes')
    .transform((val) => val.toLowerCase()),
  displayName: z.string().min(2, 'Display name must be at least 2 characters').max(50),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const loginSchema = z.object({
  username: z.string().min(1, 'User ID or Email is required').transform((val) => val.toLowerCase()),
  password: z.string().min(1, 'Password is required'),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
});

const googleAuthSchema = z.object({
  email: z.string().email('Valid email is required').optional(),
  displayName: z.string().optional(),
  googleId: z.string().optional(),
  avatarUrl: z.string().optional(),
  credential: z.string().optional(),
});

const forgotPasswordSchema = z.object({
  identifier: z.string().min(1, 'User ID or Email is required'),
});

const resetPasswordSchema = z.object({
  identifier: z.string().min(1, 'User ID or Email is required'),
  resetCode: z.string().min(4, 'Reset code is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
});

function setAuthCookie(res: Response, token: string) {
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  });
}

// POST /api/auth/signup
router.post('/signup', authLimiter, async (req, res): Promise<void> => {
  try {
    const parseResult = signupSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0].message });
      return;
    }

    const { username, displayName, email, password } = parseResult.data;

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username },
          ...(email ? [{ email }] : []),
        ],
      },
    });

    if (existingUser) {
      if (existingUser.username === username) {
        res.status(409).json({ error: 'User ID is already taken. Please choose another.' });
      } else {
        res.status(409).json({ error: 'Email is already registered. Please sign in.' });
      }
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Default avatar with initials or gradient svg
    const defaultAvatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`;

    const newUser = await prisma.user.create({
      data: {
        username,
        displayName,
        email: email || null,
        passwordHash,
        avatarUrl: defaultAvatar,
        status: 'ONLINE',
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        email: true,
        avatarUrl: true,
        bio: true,
        status: true,
        createdAt: true,
      },
    });

    const token = generateToken({ id: newUser.id, username: newUser.username });
    setAuthCookie(res, token);

    res.status(201).json({
      message: 'Account created successfully',
      user: newUser,
      token,
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error during registration' });
  }
});

// POST /api/auth/login
router.post('/login', authLimiter, async (req, res): Promise<void> => {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0].message });
      return;
    }

    const { username: identifier, password } = parseResult.data;

    // Allow login by username OR email
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: identifier },
          { email: identifier },
        ],
      },
    });

    if (!user) {
      res.status(401).json({ error: 'Invalid User ID/Email or password.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid User ID/Email or password.' });
      return;
    }

    // Set online status
    await prisma.user.update({
      where: { id: user.id },
      data: { status: 'ONLINE', lastSeenAt: new Date() },
    });

    const token = generateToken({ id: user.id, username: user.username });
    setAuthCookie(res, token);

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        status: 'ONLINE',
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error during login' });
  }
});

// POST /api/auth/google - Sign in or Sign up with Google Account
router.post('/google', authLimiter, async (req, res): Promise<void> => {
  try {
    const parseResult = googleAuthSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0].message });
      return;
    }

    let { email, displayName, googleId, avatarUrl, credential } = parseResult.data;

    // If client sent Google One Tap / GSI JWT credential, decode it
    if (credential && !email) {
      try {
        const parts = credential.split('.');
        if (parts.length === 3) {
          const payloadJson = Buffer.from(parts[1], 'base64').toString('utf8');
          const payload = JSON.parse(payloadJson);
          email = payload.email;
          displayName = displayName || payload.name || payload.given_name;
          googleId = googleId || payload.sub;
          avatarUrl = avatarUrl || payload.picture;
        }
      } catch (decodeErr) {
        console.warn('Failed to decode Google credential token:', decodeErr);
      }
    }

    if (!email) {
      res.status(400).json({ error: 'Google email could not be determined.' });
      return;
    }

    email = email.toLowerCase().trim();

    // Check if user already exists with this email or googleId
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          ...(googleId ? [{ googleId }] : []),
        ],
      },
    });

    if (user) {
      // Existing user: update googleId or avatar if missing
      const updateData: any = { status: 'ONLINE', lastSeenAt: new Date() };
      if (!user.googleId && googleId) updateData.googleId = googleId;
      if (!user.avatarUrl && avatarUrl) updateData.avatarUrl = avatarUrl;
      if (!user.email) updateData.email = email;

      user = await prisma.user.update({
        where: { id: user.id },
        data: updateData,
      });
    } else {
      // New user: derive a valid, unique username from email
      const baseUsername = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_.-]/g, '').slice(0, 20) || 'user';
      let candidateUsername = baseUsername;
      let counter = 1;

      while (await prisma.user.findUnique({ where: { username: candidateUsername } })) {
        candidateUsername = `${baseUsername.slice(0, 15)}_${counter++}`;
      }

      const randomPassword = (await bcrypt.genSalt(10)) + Math.random().toString(36);
      const passwordHash = await bcrypt.hash(randomPassword, 10);
      const userAvatar = avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${candidateUsername}`;

      user = await prisma.user.create({
        data: {
          username: candidateUsername,
          displayName: displayName || baseUsername,
          email,
          googleId: googleId || null,
          passwordHash,
          avatarUrl: userAvatar,
          status: 'ONLINE',
        },
      });
    }

    const token = generateToken({ id: user.id, username: user.username });
    setAuthCookie(res, token);

    res.json({
      message: 'Google login successful',
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        status: 'ONLINE',
      },
      token,
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({ error: 'Failed to authenticate with Google' });
  }
});

// POST /api/auth/forgot-password - Request password reset code
router.post('/forgot-password', authLimiter, async (req, res): Promise<void> => {
  try {
    const parseResult = forgotPasswordSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0].message });
      return;
    }

    const identifier = parseResult.data.identifier.toLowerCase().trim();

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: identifier },
          { email: identifier },
        ],
      },
    });

    if (!user) {
      res.status(404).json({ error: 'No account found with this User ID or Email.' });
      return;
    }

    // Generate 6-digit verification code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const resetExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: resetCode,
        resetExpires,
      },
    });

    console.log(`🔑 [PASSWORD RESET] Reset code for user ${user.username} (${user.email || 'no-email'}): ${resetCode}`);

    res.json({
      success: true,
      message: `A 6-digit password reset code has been sent. Use code: ${resetCode}`,
      resetCode, // provided so user can easily enter and reset
      username: user.username,
      email: user.email,
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process forgot password request.' });
  }
});

// POST /api/auth/reset-password - Submit new password with reset code
router.post('/reset-password', authLimiter, async (req, res): Promise<void> => {
  try {
    const parseResult = resetPasswordSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0].message });
      return;
    }

    const { identifier, resetCode, newPassword } = parseResult.data;
    const cleanIdentifier = identifier.toLowerCase().trim();

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: cleanIdentifier },
          { email: cleanIdentifier },
        ],
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    if (!user.resetToken || user.resetToken !== resetCode.trim()) {
      res.status(400).json({ error: 'Invalid or incorrect reset code.' });
      return;
    }

    if (!user.resetExpires || user.resetExpires < new Date()) {
      res.status(400).json({ error: 'Reset code has expired. Please request a new one.' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newPasswordHash,
        resetToken: null,
        resetExpires: null,
      },
    });

    res.json({
      success: true,
      message: 'Password has been reset successfully! You can now log in with your new password.',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password.' });
  }
});

// POST /api/auth/logout
router.post('/logout', authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  try {
    if (req.user?.id) {
      await prisma.user.update({
        where: { id: req.user.id },
        data: { status: 'OFFLINE', lastSeenAt: new Date() },
      });
    }

    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/',
    });

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Failed to logout' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
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
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch current user' });
  }
});

// POST /api/auth/change-password
router.post('/change-password', authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  try {
    const parseResult = changePasswordSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0].message });
      return;
    }

    const { currentPassword, newPassword } = parseResult.data;

    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      res.status(400).json({ error: 'Current password does not match.' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newPasswordHash },
    });

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update password' });
  }
});

export default router;
