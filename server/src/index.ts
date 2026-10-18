import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import { config } from './config';
import { apiLimiter } from './middleware/rateLimiter';
import { setupSocketIO } from './socket';

import authRoutes from './routes/auth';
import usersRoutes from './routes/users';
import friendsRoutes from './routes/friends';
import messagesRoutes from './routes/messages';
import uploadsRoutes from './routes/uploads';
import callsRoutes from './routes/calls';

const app = express();
const server = http.createServer(app);

// Ensure uploads directory exists on disk
if (!fs.existsSync(config.uploadDir)) {
  fs.mkdirSync(config.uploadDir, { recursive: true });
}

// Initialize Socket.io with permissive CORS for local dev / prod
const io = new SocketIOServer(server, {
  cors: {
    origin: (origin, callback) => {
      // Allow local development and specified clientUrl
      if (!origin || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:') || origin === config.clientUrl) {
        callback(null, true);
      } else {
        callback(null, true); // Permissive for testing across local network and cloud deploys
      }
    },
    credentials: true,
    methods: ['GET', 'POST'],
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
});

app.set('io', io);

// Security and utility middlewares
app.use(
  helmet({
    contentSecurityPolicy: false, // Prevent CSP from blocking inline Vite chunks or WebRTC
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow media loading across ports/domains
  })
);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:') || origin === config.clientUrl) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));
app.use(cookieParser());

// Static uploads serving
app.use('/uploads', express.static(config.uploadDir));

// API rate limiter
app.use('/api', apiLimiter);

// Health check endpoint for Render / monitoring
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', name: 'ChatSphere API', timestamp: new Date() });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/uploads', uploadsRoutes);
app.use('/api/calls', callsRoutes);

// Optional static frontend serving if client is built alongside server
const candidatePaths = [
  path.resolve(__dirname, '../../client/dist'),
  path.resolve(__dirname, '../client/dist'),
  path.resolve(process.cwd(), 'client/dist'),
  path.resolve(process.cwd(), '../client/dist'),
];
const finalClientDist = candidatePaths.find((p) => fs.existsSync(path.join(p, 'index.html')));

if (finalClientDist) {
  console.log(`📦 Serving static client from: ${finalClientDist}`);
  app.use(express.static(finalClientDist));
  app.get('*', (req: Request, res: Response, next: NextFunction) => {
    if (
      req.path.startsWith('/api') ||
      req.path.startsWith('/uploads') ||
      req.path.startsWith('/socket.io') ||
      req.path.startsWith('/health')
    ) {
      return next();
    }
    res.sendFile(path.join(finalClientDist, 'index.html'));
  });
}

// Global Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error occurred.',
  });
});

// Setup Socket handlers
setupSocketIO(io);

// Resolve listening port from process.env.PORT (Render) or config
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : config.port;

// Listen on 0.0.0.0 for cloud hosting compatibility (Render, Railway, Fly.io)
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 ChatSphere Server running on port ${PORT} (0.0.0.0)`);
  console.log(`🔌 WebSockets listening on port ${PORT}`);
});
