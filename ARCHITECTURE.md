# ChatSphere Architecture & Technical Design

## 1. System Overview
**ChatSphere** is a production-grade, real-time chat and WebRTC audio/video calling application. It enforces strict relational boundaries (only accepted friends can converse or call), rich multimedia messaging, and responsive UI with glassmorphism aesthetics.

```mermaid
graph TD
    Client[React + Vite + Tailwind Client] <-->|HTTP / REST (JWT)| Server[Express.js API Server]
    Client <-->|WebSocket (Socket.IO)| Server
    Client <-->|WebRTC Peer-to-Peer Audio/Video| PeerClient[Peer Client]
    Server <-->|Prisma ORM| DB[(SQLite Database)]
    Server <-->|Multer / FS| Storage[Uploads Storage]
```

## 2. Directory Structure
```text
chat/
├── package.json               # Root scripts (concurrently dev, build, seed)
├── README.md                  # Detailed setup, WebRTC notes, deployment guide
├── server/
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   ├── prisma/
│   │   └── schema.prisma      # Models: User, FriendRequest, Friendship, Message, CallRecord
│   ├── src/
│   │   ├── config.ts          # App configuration & env loader
│   │   ├── prisma.ts          # Prisma client singleton
│   │   ├── index.ts           # Express & Socket.io server bootstrap
│   │   ├── middleware/
│   │   │   ├── auth.ts        # JWT cookie & Bearer verification
│   │   │   ├── rateLimiter.ts # Express-rate-limit
│   │   │   └── upload.ts      # Multer file validation (10MB limit)
│   │   ├── routes/
│   │   │   ├── auth.ts        # Signup, login, logout, me, change-password
│   │   │   ├── users.ts       # Search, profile, avatar
│   │   │   ├── friends.ts     # Requests, accept, decline, unfriend, block
│   │   │   ├── messages.ts    # History, pagination, delete
│   │   │   └── uploads.ts     # File/image upload endpoints
│   │   ├── socket/
│   │   │   ├── index.ts       # Socket.IO auth and room joins
│   │   │   ├── chat.ts        # Real-time messages, seen/delivered, typing
│   │   │   └── webrtc.ts      # Audio/Video call signaling (offer/answer/ice/end)
│   │   └── seed.ts            # Seeds 3 demo accounts (alice, bob, charlie)
│   └── uploads/               # Stored media with secure static serving
└── client/
    ├── package.json
    ├── vite.config.ts
    ├── tsconfig.json
    ├── tailwind.config.js
    ├── index.html
    └── src/
        ├── App.tsx
        ├── main.tsx
        ├── index.css          # Glassmorphism, animations, theme tokens
        ├── types/             # Shared TypeScript models
        ├── store/
        │   ├── authStore.ts   # Auth state & user credentials
        │   ├── chatStore.ts   # Active chat, messages, unread counts, typing
        │   ├── callStore.ts   # WebRTC call state, media streams, audio/video toggles
        │   └── themeStore.ts  # Light / Dark mode persistence
        ├── services/
        │   ├── api.ts         # Axios/Fetch client with credentials
        │   ├── socket.ts      # Socket.IO client instance
        │   ├── webrtc.ts      # PeerConnection manager, STUN/TURN configs
        │   └── sound.ts       # Web Audio API procedural ringtones & message chimes
        ├── components/
        │   ├── auth/          # Login & Signup with strength meter
        │   ├── layout/        # Responsive 3-pane and mobile navigation
        │   ├── sidebar/       # Recent chats, friend search, request badges
        │   ├── chat/          # MessageList, MessageBubble, InputBar, Lightbox, EmojiPicker
        │   ├── call/          # IncomingCallModal, ActiveCallView, PiP Self-view
        │   └── common/        # Avatar, Badges, Modals, Toasts
        └── pages/
            ├── AuthPage.tsx
            └── ChatPage.tsx
```

## 3. Data Schema (Prisma)
- **User**: `id`, `username` (unique), `displayName`, `passwordHash`, `avatarUrl`, `bio`, `status` (ONLINE/OFFLINE), `lastSeenAt`, `createdAt`
- **FriendRequest**: `id`, `senderId`, `receiverId`, `status` (PENDING, ACCEPTED, DECLINED), `createdAt`
- **Friendship**: `id`, `user1Id`, `user2Id`, `status` (ACTIVE, BLOCKED), `blockedById`, `createdAt`
- **Message**: `id`, `senderId`, `receiverId`, `content`, `type` (TEXT, IMAGE, FILE), `fileUrl`, `fileName`, `fileSize`, `status` (SENT, DELIVERED, SEEN), `replyToId`, `isDeleted`, `deletedFor`, `createdAt`
- **CallRecord**: `id`, `callerId`, `receiverId`, `type` (AUDIO, VIDEO), `status` (MISSED, REJECTED, COMPLETED, BUSY), `durationSeconds`, `createdAt`

## 4. Security & Server-Side Friend Enforcement
- Every message emit and call offer performs a relational check against `Friendship` with `ACTIVE` status.
- Non-friends are rejected at both API endpoint and Socket.IO level.
- Uploads validate MIME types and enforce 10MB maximum file size.
