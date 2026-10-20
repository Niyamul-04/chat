import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { prisma } from '../prisma';
import { verifyFriendship } from '../routes/messages';

interface AuthenticatedSocket extends Socket {
  data: {
    user: {
      id: string;
      username: string;
      displayName: string;
      avatarUrl?: string | null;
    };
  };
}

// Track active socket connections per user ID (for multi-tab presence)
const activeUserSockets = new Map<string, Set<string>>();
// Track active calls: userId -> inCallWithUserId
const activeCalls = new Map<string, string>();

export function setupSocketIO(io: SocketIOServer) {
  // Authentication middleware
  io.use(async (socket: Socket, next) => {
    try {
      let token = socket.handshake.auth?.token;

      // Also check headers or cookie if token not in auth payload
      if (!token && socket.handshake.headers.cookie) {
        const cookies = socket.handshake.headers.cookie.split(';').reduce((acc: any, cur) => {
          const [key, val] = cur.trim().split('=');
          acc[key] = decodeURIComponent(val);
          return acc;
        }, {});
        token = cookies['token'];
      }

      if (!token) {
        return next(new Error('Authentication failed. No token provided.'));
      }

      const decoded = jwt.verify(token, config.jwtSecret) as { id: string; username: string };
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { id: true, username: true, displayName: true, avatarUrl: true },
      });

      if (!user) {
        return next(new Error('User not found'));
      }

      socket.data.user = user;
      next();
    } catch (err) {
      console.error('Socket auth failed:', err);
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', async (rawSocket: Socket) => {
    const socket = rawSocket as AuthenticatedSocket;
    const user = socket.data.user;
    const userId = user.id;

    // Join personal room
    socket.join(`user:${userId}`);

    // Update connection tracker
    if (!activeUserSockets.has(userId)) {
      activeUserSockets.set(userId, new Set());
    }
    activeUserSockets.get(userId)!.add(socket.id);

    // Update online status in database
    try {
      await prisma.user.updateMany({
        where: { id: userId },
        data: { status: 'ONLINE', lastSeenAt: new Date() },
      });
    } catch (e) {
      // safe ignore
    }

    // Notify friends that this user is online
    const userFriendships = await prisma.friendship.findMany({
      where: {
        OR: [{ user1Id: userId }, { user2Id: userId }],
        status: 'ACTIVE',
      },
    });

    userFriendships.forEach((f) => {
      const friendId = f.user1Id === userId ? f.user2Id : f.user1Id;
      io.to(`user:${friendId}`).emit('user_status_changed', {
        userId,
        status: 'ONLINE',
      });
    });

    // Send online status list of friends to this connecting user
    const friendIds = userFriendships.map((f) => (f.user1Id === userId ? f.user2Id : f.user1Id));
    const onlineFriendIds = friendIds.filter((id) => activeUserSockets.has(id) && activeUserSockets.get(id)!.size > 0);
    socket.emit('initial_online_friends', { onlineFriendIds });

    // ---------------- CHAT EVENTS ----------------
    socket.on('send_message', async (data, callback) => {
      try {
        const { receiverId, content, type = 'TEXT', fileUrl, fileName, fileSize, replyToId, tempId } = data;

        // SERVER-SIDE CHECK: Strict friend verification
        const isFriend = await verifyFriendship(userId, receiverId);
        if (!isFriend) {
          if (callback) callback({ error: 'Cannot send messages to non-friends.' });
          socket.emit('error_message', { message: 'You can only message accepted friends.' });
          return;
        }

        const msgContent = content ? content.trim() : '';
        if (type === 'TEXT' && !msgContent) {
          if (callback) callback({ error: 'Message cannot be empty.' });
          return;
        }

        const newMessage = await prisma.message.create({
          data: {
            senderId: userId,
            receiverId,
            content: msgContent,
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

        const messagePayload = tempId ? { ...newMessage, tempId } : newMessage;

        // 1. Instant socket emission to receiver and sender (zero network lag!)
        io.to(`user:${receiverId}`).emit('new_message', newMessage);
        io.to(`user:${userId}`).emit('message_sent', messagePayload);

        // 2. Immediate client callback acknowledgment
        if (callback) callback({ success: true, message: messagePayload });

        // 3. Update friendship's updatedAt asynchronously in background
        prisma.friendship.updateMany({
          where: {
            OR: [
              { user1Id: userId, user2Id: receiverId },
              { user1Id: receiverId, user2Id: userId },
            ],
          },
          data: { updatedAt: new Date() },
        }).catch((err) => {
          console.error('Error updating friendship timestamp:', err);
        });
      } catch (err: any) {
        console.error('Socket send_message error:', err);
        if (callback) callback({ error: 'Failed to send message.' });
      }
    });

    socket.on('typing', async ({ receiverId, isTyping }) => {
      const isFriend = await verifyFriendship(userId, receiverId);
      if (isFriend) {
        io.to(`user:${receiverId}`).emit('user_typing', {
          senderId: userId,
          isTyping,
        });
      }
    });

    socket.on('mark_seen', async ({ senderId }) => {
      await prisma.message.updateMany({
        where: {
          senderId,
          receiverId: userId,
          status: { in: ['SENT', 'DELIVERED'] },
        },
        data: { status: 'SEEN' },
      });

      io.to(`user:${senderId}`).emit('messages_seen', {
        byUserId: userId,
        seenAt: new Date().toISOString(),
      });
    });

    // ---------------- WEBRTC CALLING EVENTS ----------------
    socket.on('call_initiate', async ({ receiverId, type }, callback) => {
      try {
        // SERVER-SIDE CHECK: Strict friend verification
        const isFriend = await verifyFriendship(userId, receiverId);
        if (!isFriend) {
          if (callback) callback({ error: 'Calls are only permitted between accepted friends.' });
          socket.emit('call_error', { message: 'You can only call accepted friends.' });
          return;
        }

        // Check if receiver is online
        const receiverSockets = activeUserSockets.get(receiverId);
        if (!receiverSockets || receiverSockets.size === 0) {
          // Record missed call
          await prisma.callRecord.create({
            data: {
              callerId: userId,
              receiverId,
              type,
              status: 'MISSED',
              durationSeconds: 0,
            },
          });
          if (callback) callback({ error: 'User is offline.', status: 'OFFLINE' });
          socket.emit('call_offline', { receiverId });
          return;
        }

        // Check if receiver is already in a call
        if (activeCalls.has(receiverId)) {
          await prisma.callRecord.create({
            data: {
              callerId: userId,
              receiverId,
              type,
              status: 'BUSY',
              durationSeconds: 0,
            },
          });
          if (callback) callback({ error: 'User is currently on another call.', status: 'BUSY' });
          socket.emit('call_busy', { receiverId });
          return;
        }

        // Emit incoming call to receiver
        io.to(`user:${receiverId}`).emit('incoming_call', {
          caller: user,
          type, // 'AUDIO' or 'VIDEO'
        });

        if (callback) callback({ success: true });
      } catch (err: any) {
        console.error('Call initiate error:', err);
        if (callback) callback({ error: 'Failed to initiate call.' });
      }
    });

    socket.on('call_response', async ({ callerId, accepted, type }) => {
      if (accepted) {
        // Mark both in call
        activeCalls.set(userId, callerId);
        activeCalls.set(callerId, userId);

        io.to(`user:${callerId}`).emit('call_accepted', {
          receiver: user,
          type,
        });
      } else {
        // Log rejected call
        await prisma.callRecord.create({
          data: {
            callerId,
            receiverId: userId,
            type: type || 'AUDIO',
            status: 'REJECTED',
            durationSeconds: 0,
          },
        });

        io.to(`user:${callerId}`).emit('call_rejected', {
          receiverId: userId,
        });
      }
    });

    socket.on('call_signal', async ({ targetUserId, signal }) => {
      // Forward WebRTC SDP (offer/answer) or ICE candidate
      const isFriend = await verifyFriendship(userId, targetUserId);
      if (isFriend) {
        io.to(`user:${targetUserId}`).emit('call_signal', {
          senderId: userId,
          signal,
        });
      }
    });

    socket.on('call_end', async ({ targetUserId, durationSeconds = 0, type = 'AUDIO', status = 'COMPLETED' }) => {
      activeCalls.delete(userId);
      if (targetUserId) {
        activeCalls.delete(targetUserId);

        // Record call in DB
        await prisma.callRecord.create({
          data: {
            callerId: userId,
            receiverId: targetUserId,
            type,
            status,
            durationSeconds,
          },
        }).catch(() => {});

        io.to(`user:${targetUserId}`).emit('call_ended', {
          byUserId: userId,
          durationSeconds,
        });
      }
    });

    // ---------------- DISCONNECT ----------------
    socket.on('disconnect', async () => {
      const userSockets = activeUserSockets.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          activeUserSockets.delete(userId);

          // Handle call cleanup if in call
          const peerId = activeCalls.get(userId);
          if (peerId) {
            activeCalls.delete(userId);
            activeCalls.delete(peerId);
            io.to(`user:${peerId}`).emit('call_ended', {
              byUserId: userId,
              reason: 'disconnected',
            });
          }

          // Update user status to OFFLINE
          const now = new Date();
          try {
            await prisma.user.updateMany({
              where: { id: userId },
              data: { status: 'OFFLINE', lastSeenAt: now },
            });
          } catch (e) {
            // safe ignore
          }

          // Notify friends
          userFriendships.forEach((f) => {
            const friendId = f.user1Id === userId ? f.user2Id : f.user1Id;
            io.to(`user:${friendId}`).emit('user_status_changed', {
              userId,
              status: 'OFFLINE',
              lastSeenAt: now.toISOString(),
            });
          });
        }
      }
    });
  });
}
