# ChatSphere 🌐 — Production Real-Time Chat & WebRTC Calling Web Application

ChatSphere is a modern, production-grade real-time chat and WebRTC audio/video calling application built with TypeScript, React, Express, Socket.IO, and SQLite with Prisma ORM.

---

## ✨ Features

- **Authentication**: User ID (unique username) + password, bcrypt hashing, JWT session, password strength meter.
- **Strict Friends-Only Relations**:
  - Search any user by their unique User ID.
  - Send, accept, decline, and cancel friend requests with real-time badges.
  - **Enforced Server-Side**: Non-friends cannot send messages, files, or call signals; inputs and call buttons are locked until accepted.
  - Options to unfriend and block users.
- **Real-Time Messaging**:
  - Instant delivery with Socket.IO.
  - Delivery indicators: Sent (✓), Delivered (✓✓), Seen (✓✓ cyan).
  - Real-time typing indicators, online/offline presence, and last seen timestamps.
  - Emoji picker, replies with quote previews, message deletion ("for me" and "for everyone").
  - Infinite scroll / paginated message history.
- **File & Media Sharing**:
  - Image and file uploads (PDF, DOCX, ZIP, etc.) up to 10MB with Multer.
  - Drag-and-drop file upload directly onto chat.
  - Clipboard paste support (take a screenshot and press `Ctrl+V`).
  - Full-screen Lightbox image viewer with zoom and direct download.
- **Peer-to-Peer Audio & Video Calling (WebRTC)**:
  - Audio and video call buttons in chat header.
  - High-end incoming call modal with pulsing ring effect and procedural Web Audio API ringtone.
  - In-call controls: Mute/Unmute microphone, Camera on/off, Call timer, End call.
  - Draggable Picture-in-Picture (PiP) local video preview.
  - Call history drawer with completed, missed, and rejected records.
- **UI/UX & Design**:
  - Glassmorphic aesthetic, dark mode / light mode toggle with localStorage persistence.
  - Responsive design for mobile, tablet, laptop, and desktop.
  - Built-in procedural sound effects (Web Audio API) for zero broken asset dependencies.
  - Browser notifications for new messages.

---

## 🛠 Tech Stack

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Zustand, Lucide React, Framer Motion.
- **Backend**: Node.js, Express, Socket.IO, Prisma ORM, SQLite (`dev.db`).
- **Media & RTC**: Multer local disk storage (abstracted for S3/Cloudinary), WebRTC native API with Google STUN + configurable TURN.
- **Security**: Zod schema validation, Helmet security headers, CORS with credentials, express-rate-limit.

---

## 🚀 Quick Start (One-Command Run)

### 1. Prerequisites
- Node.js v18+ (Node v20 or v22 recommended)
- npm v9+

### 2. Install Dependencies
Run the install command from the root directory:
```bash
npm run install:all
```
*(Or install in root, server, and client folders individually)*

### 3. Database Setup & Demo Seed
Initialize the SQLite database and seed demo users:
```bash
npm run seed
```

This creates 3 ready-to-test accounts (password for all is `Password123!`):
- `alice` (Friends with `bob`, received request from `charlie`)
- `bob` (Friends with `alice`)
- `charlie` (Sent friend request to `alice`)

### 4. Start Both Server & Client
From the project root:
```bash
npm run dev
```

- **Frontend Client**: [http://localhost:5173](http://localhost:5173)
- **Backend API & Sockets**: [http://localhost:5000](http://localhost:5000)

---

## 🧪 How to Test End-to-End

### Testing Real-Time Chat & Friendship:
1. Open **Browser Window 1** (e.g. Chrome) and navigate to `http://localhost:5173`.
   - Click "Alice" quick login button or sign in with ID `alice` / `Password123!`.
2. Open **Browser Window 2** (e.g. Incognito window or Firefox) at `http://localhost:5173`.
   - Click "Bob" quick login button or sign in with ID `bob` / `Password123!`.
3. Notice Bob shows up as online with a green badge in Alice's chats list.
4. Click on Bob in Alice's list:
   - Type a message and see it appear instantly on Bob's screen.
   - Watch the typing indicator live when Bob is typing.
   - Observe message status change from `Sent` to `Seen`.
   - Send an emoji or attach an image / document (or paste from clipboard).
   - Click the image to view it full-screen in the Lightbox.

### Testing Audio / Video Calls:
1. In Alice's chat window with Bob, click either the **Phone (Audio)** or **Video camera** button in the header.
2. Bob will immediately receive the incoming call modal with sound and ringing animation.
3. Click **Accept** in Bob's window:
   - Camera/mic permissions will be requested.
   - The active call screen opens with the live call timer.
   - In video mode, Bob and Alice see each other's stream, along with a draggable local picture-in-picture window.
   - Test muting the microphone or disabling the camera.
   - Click **End** to finish the call and view the record in the call history drawer.

### Testing Friend Request Enforcement:
1. Log in as `charlie`.
2. Charlie is **not yet friends** with Alice (request is pending):
   - Charlie cannot send messages or call Alice. The input displays: *"Only accepted friends can chat or send files."*
3. Log in as `alice` and go to the **Requests** tab:
   - Alice sees Charlie's request under Received requests with **Accept** and **Decline** buttons.
   - Click **Accept**.
   - Instantly, both Alice and Charlie's chat inputs unlock, and calling becomes available!

---

## ⚙️ Environment Variables

### Server (`server/.env`)
| Variable | Description | Default |
| :--- | :--- | :--- |
| `PORT` | Express server port | `5000` |
| `CLIENT_URL` | Allowed client origin for CORS | `http://localhost:5173` |
| `JWT_SECRET` | Secret key used to sign JWTs | `chatsphere_super_secret_jwt_key_2026_dev_prod` |
| `DATABASE_URL` | Prisma SQLite or PostgreSQL URL | `file:./dev.db` |
| `TURN_URL` | Optional WebRTC TURN server URL | *(blank)* |
| `TURN_USERNAME`| Optional TURN username | *(blank)* |
| `TURN_CREDENTIAL`| Optional TURN credential | *(blank)* |

---

## 📡 WebRTC & TURN Server Setup (Calls Across Networks)

WebRTC uses **STUN** servers (free Google STUN is preconfigured) to establish peer-to-peer connections when both peers have open or standard NAT.

However, when users are on **symmetric NATs, 4G/5G mobile carriers, or corporate/campus firewalls**, direct P2P connections can fail. To guarantee 100% call reliability worldwide, configure a **TURN relay server**:

1. Obtain a TURN server (free tier available at [Metered.ca](https://www.metered.ca/tools/openrelay/) or deploy `coturn` on a cloud VM).
2. Add your TURN credentials to `server/.env`:
```env
TURN_URL=turn:standard.relay.metered.ca:80
TURN_USERNAME=your-username-token
TURN_CREDENTIAL=your-credential-key
```
3. The server will automatically deliver these credentials via `/api/calls/config` to clients upon connection.

---

## 🌐 Production Deployment Guide

### Deploying the Backend (e.g. Render / Railway / Fly.io)
1. Set the build command:
   ```bash
   npm run build
   ```
2. Set the start command:
   ```bash
   npm run start
   ```
3. Set environment variables (`DATABASE_URL`, `JWT_SECRET`, `CLIENT_URL`, `PORT`).
   - For PostgreSQL: change `provider = "sqlite"` to `provider = "postgresql"` in `prisma/schema.prisma` and supply a standard Postgres connection string.

### Deploying the Frontend (e.g. Vercel / Netlify / Cloudflare Pages)
1. In `client/src/services/api.ts`, update `SERVER_URL` to point to your live backend domain (or configure `VITE_API_URL` environment variable).
2. Set build command: `npm run build`
3. Set output directory: `dist`

---

## 🔒 Security Measures Included
- **Server-Side Authorization**: Every single socket message emit, call offer, and API request queries friendship status on the server before dispatching.
- **XSS & Injection Protection**: Parameterized Prisma queries prevent SQL injection, and inputs are sanitized.
- **Strict File Upload Validation**: Multer rejects prohibited file types and enforces a 10MB maximum payload limit.
- **Rate Limiting**: Protects authentication and general endpoints against brute-force attacks.
