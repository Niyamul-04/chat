import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
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

// Initialize Socket.io with permissive CORS for local dev / prod
const io = new SocketIOServer(server, {
  cors: {
    origin: (origin, callback) => {
      // Allow local development and specified clientUrl
      if (!origin || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:') || origin === config.clientUrl) {
        callback(null, true);
      } else {
        callback(null, true); // Permissive for testing across local network
      }
    },
    credentials: true,
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
});

app.set('io', io);

// Security and utility middlewares
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow media loading across ports
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

// Health check
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

// Global Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error occurred.',
  });
});

// Setup Socket handlers
setupSocketIO(io);

// Start server
server.listen(config.port, () => {
  console.log(`🚀 ChatSphere Server running on http://localhost:${config.port}`);
  console.log(`🔌 WebSockets listening on port ${config.port}`);
});
