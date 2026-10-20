import { io, Socket } from 'socket.io-client';
import { SERVER_URL } from './api';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const token = localStorage.getItem('chatsphere_token');
    socket = io(SERVER_URL, {
      autoConnect: true,
      withCredentials: true,
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 30,
      reconnectionDelay: 500,
      timeout: 10000,
    });
  }
  return socket;
}

export function connectSocket(token?: string): Socket {
  if (token) {
    localStorage.setItem('chatsphere_token', token);
  }
  const currentToken = token || localStorage.getItem('chatsphere_token');
  const s = getSocket();
  if (currentToken) {
    s.auth = { token: currentToken };
  }
  if (s.disconnected) {
    s.connect();
  }
  return s;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
