export interface User {
  id: string;
  username: string;
  displayName: string;
  email?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  status?: 'ONLINE' | 'OFFLINE';
  lastSeenAt?: string;
  createdAt?: string;
}

export interface FriendRequest {
  id: string;
  senderId: string;
  receiverId: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  createdAt: string;
  sender?: User;
  receiver?: User;
}

export interface FriendItem {
  friendshipId: string;
  friend: User;
  lastMessage?: {
    id: string;
    content: string;
    type: 'TEXT' | 'IMAGE' | 'FILE';
    createdAt: string;
    senderId: string;
    status: string;
  } | null;
  unreadCount: number;
  createdAt: string;
}

export interface Message {
  id: string;
  tempId?: string;
  senderId: string;
  receiverId: string;
  content: string;
  type: 'TEXT' | 'IMAGE' | 'FILE';
  fileUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  status: 'SENT' | 'DELIVERED' | 'SEEN';
  replyToId?: string | null;
  replyTo?: {
    id: string;
    content: string;
    type: string;
    senderId: string;
    sender?: {
      id: string;
      username: string;
      displayName: string;
    };
  } | null;
  isDeleted: boolean;
  deletedFor?: string | null;
  createdAt: string;
  updatedAt?: string;
  sender?: User;
}

export interface CallRecord {
  id: string;
  callerId: string;
  receiverId: string;
  type: 'AUDIO' | 'VIDEO';
  status: 'MISSED' | 'REJECTED' | 'COMPLETED' | 'BUSY';
  durationSeconds: number;
  createdAt: string;
  caller?: User;
  receiver?: User;
}

export type CallState = 'IDLE' | 'OUTGOING' | 'INCOMING' | 'CONNECTED';
export type CallType = 'AUDIO' | 'VIDEO';
