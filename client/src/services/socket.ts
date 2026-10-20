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
      reconnectionAttempts: 20,
      reconnectionDelay: 500,
    });
  } else if (!socket.connected) {
    const token = localStorage.getItem('chatsphere_token');
    if (token) {
      socket.auth = { token };
    }
    socket.connect();
  }
  return socket;
}

export function connectSocket(token?: string): Socket {
  if (token) {
    localStorage.setItem('chatsphere_token', token);
  }
  const s = getSocket();
  if (token) {
    s.auth = { token };
  }
  if (!s.connected) {
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
