import { create } from 'zustand';
import { User, FriendItem, FriendRequest, Message } from '../types';
import { api } from '../services/api';
import { getSocket } from '../services/socket';
import { sounds } from '../services/sounds';

interface ChatState {
  friends: FriendItem[];
  activeFriend: User | null;
  messages: Record<string, Message[]>; // friendId -> Message[]
  hasMoreMessages: Record<string, boolean>;
  messageCursors: Record<string, string | null>;
  onlineUserIds: string[];
  typingUsers: Record<string, boolean>; // friendId -> boolean
  receivedRequests: FriendRequest[];
  sentRequests: FriendRequest[];
  activeTab: 'chats' | 'friends' | 'requests' | 'search' | 'profile';
  replyingToMessage: Message | null;
  lightboxMedia: { url: string; fileName?: string } | null;

  setActiveFriend: (friend: User | null) => void;
  setActiveTab: (tab: 'chats' | 'friends' | 'requests' | 'search' | 'profile') => void;
  setReplyingToMessage: (msg: Message | null) => void;
  setLightboxMedia: (media: { url: string; fileName?: string } | null) => void;

  fetchFriends: () => Promise<void>;
  fetchRequests: () => Promise<void>;
  fetchMessages: (friendId: string, isInitial?: boolean) => Promise<void>;

  sendMessage: (data: {
    receiverId: string;
    content?: string;
    type?: 'TEXT' | 'IMAGE' | 'FILE';
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;
  }) => Promise<void>;

  deleteMessage: (messageId: string, mode: 'for_me' | 'for_everyone') => Promise<void>;
  markSeen: (friendId: string) => Promise<void>;
  emitTyping: (receiverId: string, isTyping: boolean) => void;

  sendFriendRequest: (targetUsernameOrId: string) => Promise<{ success: boolean; message: string; autoAccepted?: boolean }>;
  acceptFriendRequest: (requestId: string) => Promise<void>;
  declineFriendRequest: (requestId: string) => Promise<void>;
  cancelFriendRequest: (requestId: string) => Promise<void>;
  unfriend: (friendId: string) => Promise<void>;
  blockUser: (friendId: string) => Promise<void>;

  // Socket event integrations
  handleNewMessage: (msg: Message, currentUserId: string) => void;
  handleMessageSent: (msg: Message) => void;
  handleUserStatusChange: (userId: string, status: 'ONLINE' | 'OFFLINE') => void;
  handleInitialOnlineFriends: (onlineFriendIds: string[]) => void;
  handleUserTyping: (senderId: string, isTyping: boolean) => void;
  handleMessagesSeen: (byUserId: string) => void;
  handleMessageDeleted: (messageId: string) => void;
  handleMessageDeletedForMe: (messageId: string) => void;
  handleFriendRequestReceived: (request: FriendRequest) => void;
  handleFriendRequestAccepted: (friend: User) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  friends: [],
  activeFriend: null,
  messages: {},
  hasMoreMessages: {},
  messageCursors: {},
  onlineUserIds: [],
  typingUsers: {},
  receivedRequests: [],
  sentRequests: [],
  activeTab: 'chats',
  replyingToMessage: null,
  lightboxMedia: null,

  setActiveFriend: (friend) => {
    set({ activeFriend: friend, replyingToMessage: null });
    if (friend) {
      get().fetchMessages(friend.id, true);
      get().markSeen(friend.id);
    }
  },

  setActiveTab: (tab) => set({ activeTab: tab }),
  setReplyingToMessage: (msg) => set({ replyingToMessage: msg }),
  setLightboxMedia: (media) => set({ lightboxMedia: media }),

  fetchFriends: async () => {
    try {
      const res = await api.get('/friends');
      set({ friends: res.data.friends || [] });
    } catch (e) {
      console.error('Fetch friends failed:', e);
    }
  },

  fetchRequests: async () => {
    try {
      const res = await api.get('/friends/requests');
      set({
        receivedRequests: res.data.received || [],
        sentRequests: res.data.sent || [],
      });
    } catch (e) {
      console.error('Fetch requests failed:', e);
    }
  },

  fetchMessages: async (friendId: string, isInitial = false) => {
    try {
      const cursor = isInitial ? undefined : get().messageCursors[friendId];
      const res = await api.get(`/messages/${friendId}`, {
        params: { cursor, limit: 30 },
      });

      const newBatch: Message[] = res.data.messages || [];
      const nextCursor: string | null = res.data.nextCursor || null;

      set((state) => {
        const existing = isInitial ? [] : state.messages[friendId] || [];
        // Prepend older messages for pagination or set initial
        const combined = isInitial ? newBatch : [...newBatch, ...existing];
        return {
          messages: { ...state.messages, [friendId]: combined },
          messageCursors: { ...state.messageCursors, [friendId]: nextCursor },
          hasMoreMessages: { ...state.hasMoreMessages, [friendId]: !!nextCursor },
        };
      });
    } catch (e: any) {
      if (e.response?.status === 403) {
        // Forbidden: Not friends
        set((state) => ({
          messages: { ...state.messages, [friendId]: [] },
        }));
      }
    }
  },

  sendMessage: async ({ receiverId, content = '', type = 'TEXT', fileUrl, fileName, fileSize }) => {
    const replyToId = get().replyingToMessage?.id;
    try {
      const res = await api.post('/messages/send', {
        receiverId,
        content,
        type,
        fileUrl,
        fileName,
        fileSize,
        replyToId,
      });

      const message: Message = res.data.message;
      set({ replyingToMessage: null });

      set((state) => {
        const existing = state.messages[receiverId] || [];
        // Strict deduplication: Don't append if message ID already exists
        if (existing.some((m) => m.id === message.id)) {
          return state;
        }
        return {
          messages: { ...state.messages, [receiverId]: [...existing, message] },
        };
      });

      get().fetchFriends(); // update last message and ordering
    } catch (e: any) {
      throw new Error(e.response?.data?.error || 'Failed to send message');
    }
  },

  deleteMessage: async (messageId: string, mode: 'for_me' | 'for_everyone') => {
    await api.delete(`/messages/${messageId}`, { params: { mode } });
    if (mode === 'for_everyone') {
      get().handleMessageDeleted(messageId);
    } else {
      get().handleMessageDeletedForMe(messageId);
    }
  },

  markSeen: async (friendId: string) => {
    try {
      await api.post(`/messages/mark-seen/${friendId}`);
      // Update unread badges locally
      set((state) => ({
        friends: state.friends.map((f) => (f.friend.id === friendId ? { ...f, unreadCount: 0 } : f)),
      }));
    } catch (e) {}
  },

  emitTyping: (receiverId: string, isTyping: boolean) => {
    const socket = getSocket();
    socket.emit('typing', { receiverId, isTyping });
  },

  sendFriendRequest: async (targetUsernameOrId: string) => {
    try {
      const res = await api.post('/friends/request', { targetUsernameOrId });
      await get().fetchRequests();
      await get().fetchFriends();
      return { success: true, message: res.data.message, autoAccepted: res.data.autoAccepted };
    } catch (e: any) {
      return {
        success: false,
        message: e.response?.data?.error || 'Failed to send friend request.',
      };
    }
  },

  acceptFriendRequest: async (requestId: string) => {
    try {
      await api.post(`/friends/accept/${requestId}`);
      await get().fetchRequests();
      await get().fetchFriends();
    } catch (e) {
      console.error('Accept request error:', e);
    }
  },

  declineFriendRequest: async (requestId: string) => {
    try {
      await api.post(`/friends/decline/${requestId}`);
      await get().fetchRequests();
    } catch (e) {
      console.error('Decline request error:', e);
    }
  },

  cancelFriendRequest: async (requestId: string) => {
    try {
      await api.post(`/friends/cancel/${requestId}`);
      await get().fetchRequests();
    } catch (e) {
      console.error('Cancel request error:', e);
    }
  },

  unfriend: async (friendId: string) => {
    try {
      await api.post(`/friends/unfriend/${friendId}`);
      set((state) => ({
        friends: state.friends.filter((f) => f.friend.id !== friendId),
        activeFriend: state.activeFriend?.id === friendId ? null : state.activeFriend,
      }));
    } catch (e) {
      console.error('Unfriend error:', e);
    }
  },

  blockUser: async (friendId: string) => {
    try {
      await api.post(`/friends/block/${friendId}`);
      set((state) => ({
        friends: state.friends.filter((f) => f.friend.id !== friendId),
        activeFriend: state.activeFriend?.id === friendId ? null : state.activeFriend,
      }));
    } catch (e) {
      console.error('Block user error:', e);
    }
  },

  // Real-time Socket Event Handlers
  handleNewMessage: (msg: Message, currentUserId: string) => {
    const otherUserId = msg.senderId === currentUserId ? msg.receiverId : msg.senderId;
    const isActiveChat = get().activeFriend?.id === otherUserId;

    // Only play sound and trigger notification if message is from the other person
    if (msg.senderId !== currentUserId) {
      sounds.playMessageReceived();

      if (Notification.permission === 'granted' && document.hidden) {
        new Notification(`New message from ${msg.sender?.displayName || 'ChatSphere'}`, {
          body: msg.content || (msg.type === 'IMAGE' ? 'Sent an image' : 'Sent a file'),
          icon: msg.sender?.avatarUrl || undefined,
        });
      }
    }

    set((state) => {
      const existing = state.messages[otherUserId] || [];
      // Strict deduplication: Don't append if already in state
      if (existing.some((m) => m.id === msg.id)) {
        return state;
      }
      const updatedMessages = [...existing, msg];

      const updatedFriends = state.friends.map((f) => {
        if (f.friend.id === otherUserId) {
          return {
            ...f,
            lastMessage: {
              id: msg.id,
              content: msg.content,
              type: msg.type,
              createdAt: msg.createdAt,
              senderId: msg.senderId,
              status: msg.status,
            },
            unreadCount: isActiveChat ? 0 : f.unreadCount + 1,
          };
        }
        return f;
      });

      return {
        messages: { ...state.messages, [otherUserId]: updatedMessages },
        friends: updatedFriends,
      };
    });

    if (isActiveChat) {
      get().markSeen(otherUserId);
    }
  },

  handleMessageSent: (msg: Message) => {
    const otherUserId = msg.receiverId;
    set((state) => {
      const existing = state.messages[otherUserId] || [];
      // avoid duplicates if already appended
      if (existing.some((m) => m.id === msg.id)) {
        return state;
      }
      return {
        messages: { ...state.messages, [otherUserId]: [...existing, msg] },
      };
    });
    get().fetchFriends();
  },

  handleUserStatusChange: (userId: string, status: 'ONLINE' | 'OFFLINE') => {
    set((state) => {
      const setOnline = new Set(state.onlineUserIds);
      if (status === 'ONLINE') {
        setOnline.add(userId);
      } else {
        setOnline.delete(userId);
      }
      return {
        onlineUserIds: Array.from(setOnline),
        friends: state.friends.map((f) =>
          f.friend.id === userId ? { ...f, friend: { ...f.friend, status } } : f
        ),
      };
    });
  },

  handleInitialOnlineFriends: (onlineFriendIds: string[]) => {
    set({ onlineUserIds: onlineFriendIds });
  },

  handleUserTyping: (senderId: string, isTyping: boolean) => {
    set((state) => ({
      typingUsers: { ...state.typingUsers, [senderId]: isTyping },
    }));
  },

  handleMessagesSeen: (byUserId: string) => {
    set((state) => {
      const friendMsgs = state.messages[byUserId];
      if (!friendMsgs) return state;
      return {
        messages: {
          ...state.messages,
          [byUserId]: friendMsgs.map((m) => ({ ...m, status: 'SEEN' })),
        },
      };
    });
  },

  handleMessageDeleted: (messageId: string) => {
    set((state) => {
      const updatedMessages: Record<string, Message[]> = {};
      for (const [friendId, msgs] of Object.entries(state.messages)) {
        updatedMessages[friendId] = msgs.map((m) =>
          m.id === messageId
            ? {
                ...m,
                isDeleted: true,
                content: 'This message was deleted',
                fileUrl: null,
                fileName: null,
                fileSize: null,
              }
            : m
        );
      }
      return { messages: updatedMessages };
    });
  },

  handleMessageDeletedForMe: (messageId: string) => {
    set((state) => {
      const updatedMessages: Record<string, Message[]> = {};
      for (const [friendId, msgs] of Object.entries(state.messages)) {
        updatedMessages[friendId] = msgs.filter((m) => m.id !== messageId);
      }
      return { messages: updatedMessages };
    });
  },

  handleFriendRequestReceived: (request: FriendRequest) => {
    sounds.playMessageReceived();
    set((state) => ({
      receivedRequests: [request, ...state.receivedRequests],
    }));
  },

  handleFriendRequestAccepted: (_friend: User) => {
    get().fetchFriends();
    get().fetchRequests();
  },
}));
