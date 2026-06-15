# PeerDrop 🚀

PeerDrop is a lightning-fast, highly secure, browser-to-browser Peer-to-Peer (P2P) file sharing web application. It allows users to securely stream files directly to one another without storing the files on an intermediate server.
<br>
Webite Demonstration Video:https://drive.google.com/file/d/1hyGDWfTxbjUe4PTDPeR-VEyKWalqc43o/view?usp=share_link
<br>
Deployed website link:https://peer-drop-nu.vercel.app/dashboard

## ✨ Core Features

- **Direct P2P File Transfers:** Built on top of WebRTC Data Channels, ensuring files are streamed directly between peers using end-to-end encryption.
- **Lightning Fast Speeds:** Highly optimized chunking (64KB chunks) and memory management to completely prevent browser UI freezing or render thrashing, easily handling large files up to 100MB.
- **Zero Server Storage:** The backend is solely used for signaling (Socket.io) and authentication. Your files are never uploaded to our servers, ensuring total privacy.
- **Robust Room Architecture:** Senders create secure, unique rooms and share the link with a peer. Rooms automatically self-destruct upon inactivity or disconnection to prevent "ghost sessions."
- **Smart Drag & Drop:** Intuitive UI using `react-dropzone` that automatically filters out unzipped folders, prevents file bombs (max 10 files), and intelligently blocks files exceeding 100MB without crashing.
- **Admin & User Dashboards:** Separate metrics and history views for end-users and administrators.
- **JWT Authentication:** Secure user registration and login system.

## 🛠️ Tech Stack

### Frontend
- **Framework:** React (Bootstrapped with Vite)
- **Styling:** Tailwind CSS + Lucide Icons
- **P2P Engine:** WebRTC (RTCPeerConnection, RTCDataChannel)
- **Routing:** React Router v6
- **State/Hooks:** Context API, Custom React Hooks (`useWebRTC`, `useSocket`)

### Backend
- **Environment:** Node.js + Express
- **Realtime Signaling:** Socket.io
- **Database:** MongoDB (Mongoose ORM)
- **Authentication:** JSON Web Tokens (JWT) & bcrypt

## 🧠 Advanced Technical Implementations

- **WebRTC Backpressure Management:** Dynamically monitors `bufferedAmount` to throttle `FileReader` ingestion, preventing memory explosions and dropped packets during massive file transfers.
- **Memory Leak Protection:** Proactively tracks and executes `URL.revokeObjectURL()` on all received Blob data immediately upon unmounting, preventing browser RAM overload.
- **STUN Redundancy:** Employs multiple fallback Google STUN servers to guarantee successful ICE negotiation and connection establishment even when primary servers are rate-limited.
- **Front-End Timeouts:** Room idleness (2 minutes) and waiting timeouts (5 minutes) are fully offloaded to the client browsers to radically reduce server tracking pressure. 

## 🚀 Getting Started

### Prerequisites
- Node.js (v16+)
- MongoDB (Running locally or MongoDB Atlas)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd marsOpenProject
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   # Create a .env file with PORT, MONGO_URI, JWT_SECRET, CLIENT_URL
   npm run dev
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   # Create a .env file with VITE_BACKEND_URL
   npm run dev
   ```

4. **Open in Browser**
   Navigate to `http://localhost:5173`

## 🛡️ Security
Files are transferred securely through WebRTC's native DTLS encryption. Because files are not stored on our databases, there is zero risk of server-side data breaches concerning user files.
