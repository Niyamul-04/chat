# ChatSphere

A fast, privacy-focused real-time messaging and peer-to-peer WebRTC voice/video calling web application built with TypeScript, React, Express, Socket.IO, and Prisma.

---

## Overview

ChatSphere was built to deliver a smooth, WhatsApp-like messaging experience without relying on bloated third-party SDKs. It pairs direct peer-to-peer WebRTC communication with strict server-side contact authorization: users can only exchange messages, attachments, or media calls once a mutual contact request has been sent and accepted.

Key design goals:
- **Low-latency real-time sync**: Socket.IO handles live delivery receipts, typing states, and WebRTC SDP/ICE signaling.
- **Privacy-first relations**: Server-enforced authorization blocks unsolicited messages, media, and call attempts.
- **Lightweight footprint**: WebRTC transfers audio and video directly between peers, keeping server bandwidth minimal. Procedural audio (Web Audio API) generates ringtones and alerts without external asset dependencies.
- **Mobile-first ergonomics**: Responsive layout featuring a bottom navigation bar on handheld screens and a split-pane workstation view on desktop.

---

## Tech Stack

### Client
- **Framework**: React 18, Vite, TypeScript
- **State Management**: Zustand
- **Styling & Motion**: Tailwind CSS, Framer Motion, Lucide Icons
- **Real-Time & Media**: Socket.IO Client, Native WebRTC API, Web Audio API

### Server
- **Runtime**: Node.js, Express, TypeScript
- **WebSockets**: Socket.IO
- **Database & ORM**: SQLite (development) / PostgreSQL (production) with Prisma ORM
- **Authentication**: JWT (httpOnly cookies & Bearer tokens), bcryptjs password hashing
- **Security & Storage**: Helmet, CORS, express-rate-limit, Multer (local disk storage with clean interface for S3/Cloudinary)

---

## Core Architecture & Features

### 1. Request-Gated Contact System
- Every user registers with a unique User ID (`@username`).
- Anyone can discover public profiles in the Explore directory and send a connection request.
- The server validates friendships at both the database and socket layer: chat inputs, file uploads, and WebRTC call buttons remain disabled until the recipient accepts the request.
- Full contact management: accept, decline, cancel pending requests, unfriend, or block users.

### 2. Real-Time Messaging & Status Receipts
- WhatsApp-style message delivery lifecycle:
  - `✓` Sent (persisted in database)
  - `✓✓` Delivered (received by recipient's client)
  - `✓✓` Seen (read by recipient in active conversation)
- Optimistic updates with client-side deduplication to eliminate race conditions and double messages.
- Real-time typing indicators, online/offline presence tracking, and last seen timestamps.
- Quote replies, emoji picker, and message deletion ("for me" or "for everyone").

### 3. Peer-to-Peer Voice & Video Calls (WebRTC)
- In-band WebRTC signaling over Socket.IO (`call_initiate`, `call_response`, `call_signal`, `call_end`).
- Preconfigured with Google STUN servers; supports custom TURN relays for symmetric NAT and restrictive cellular networks.
- In-call controls: mute microphone, toggle camera, call duration counter, and a draggable Picture-in-Picture (PiP) local stream.
- Procedural ringtones, dial tones, and notification chimes generated in real time using the browser's Web Audio API.
- Call history logging (completed, missed, and rejected records).

### 4. File & Attachment Handling
- Support for images and documents (PDF, DOCX, ZIP, etc.) up to 10MB.
- Drag-and-drop file upload directly onto the chat viewport.
- Clipboard paste support (`Ctrl+V`) for immediate screenshot sharing.
- Built-in lightbox for full-screen image inspection and downloads.

---

## Getting Started

### Prerequisites
- Node.js 18.x or higher (v20+ recommended)
- npm 9.x or higher

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Niyamul-04/chat.git
   cd chat
   ```

2. **Install all dependencies:**
   ```bash
   npm run install:all
   ```

3. **Initialize the database & seed demo accounts:**
   ```bash
   npm run seed
   ```
   This generates the SQLite database (`server/prisma/dev.db`) and seeds three test accounts (password for all: `Password123!`):
   - `@alice`
   - `@bob`
   - `@charlie`

4. **Start the development servers:**
   ```bash
   npm run dev
   ```
   - Frontend: `http://localhost:5173`
   - Backend API & Sockets: `http://localhost:5000`

---

## Environment Variables

### Server Configuration (`server/.env`)

| Variable | Description | Default |
| :--- | :--- | :--- |
| `PORT` | HTTP & WebSocket server port | `5000` |
| `CLIENT_URL` | Allowed client origin for CORS | `http://localhost:5173` |
| `JWT_SECRET` | Secret key used to sign session tokens | `chatsphere_jwt_secret_dev` |
| `DATABASE_URL` | Prisma database connection string | `file:./dev.db` |
| `TURN_URL` | *(Optional)* TURN server host for WebRTC | *(empty)* |
| `TURN_USERNAME`| *(Optional)* TURN authentication username | *(empty)* |
| `TURN_CREDENTIAL`| *(Optional)* TURN authentication credential | *(empty)* |

### Client Configuration (`client/.env`)

| Variable | Description | Default |
| :--- | :--- | :--- |
| `VITE_SERVER_URL` | URL of the backend API and Socket.IO server | `http://localhost:5000` |

---

## Production Deployment

### Backend (Render, Railway, or VPS)
1. Set the root directory to `server/`.
2. Set build command:
   ```bash
   npm install && npm run build
   ```
3. Set start command:
   ```bash
   npm run start
   ```
4. Define production environment variables: `DATABASE_URL`, `JWT_SECRET`, and `CLIENT_URL` (pointing to your frontend domain).
5. *(Optional)* Switch Prisma datasource to PostgreSQL in `server/prisma/schema.prisma` for production scaling.

### Frontend (Vercel, Netlify, or Cloudflare Pages)
1. Set the root directory to `client/`.
2. Set build command: `npm run build`
3. Set output directory: `dist`
4. Set environment variable: `VITE_SERVER_URL=https://your-backend-domain.com`

---

## License

This project is open-source and available under the [MIT License](LICENSE).
