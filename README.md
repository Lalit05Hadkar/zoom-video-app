# Zoom Video Call 🚀

A full-stack, real-time video conferencing web application built with **React**, **Node.js**, **Express**, **Socket.io**, **WebRTC**, and **MongoDB Atlas**.

🔗 **Live Deployment:** [https://zoom-video-call-i6b0.onrender.com/](https://zoom-video-call-i6b0.onrender.com/)

---

## 🌟 Key Features

- **Peer-to-Peer Video & Audio**: Real-time multi-user video calling powered by WebRTC and STUN servers.
- **Screen Sharing**: Native display media streaming allowing participants to share their screen during meetings.
- **In-Call Real-Time Chat**: Integrated messaging using WebSockets (Socket.io) during calls.
- **User Authentication**: Secure signup and login with hashed passwords via bcrypt and token sessions.
- **Meeting History Tracking**: Automatically saves past meetings and activity records for registered users.
- **Guest Access**: Instantly join meetings without an account using custom meeting codes.
- **Single-Service Full-Stack Deployment**: Express backend is configured to serve the production React client directly from the same origin, eliminating CORS friction.

---

## 🛠️ Tech Stack

### Frontend
- **React.js 18**
- **Material-UI (MUI)**
- **Socket.io Client**
- **WebRTC API** (RTCPeerConnection, getUserMedia, getDisplayMedia)
- **Axios & React Router DOM 6**

### Backend
- **Node.js** & **Express**
- **Socket.io** (Signaling server & chat relay)
- **MongoDB Atlas** with **Mongoose**
- **bcrypt** (Password encryption)

---

## Database setup

Set `MONGO_URI` (or `MONGO_URL`) to use MongoDB Atlas / a local MongoDB. If it is unset or unreachable,
the backend automatically stores users and meeting history in `backend/data/db.json` (override with `DATA_FILE`),
so the app works with zero configuration. Use `MONGO_URI` for any hosted deployment, since the file store
is not durable on ephemeral hosts.


## 🚀 Getting Started Locally

### Prerequisites
- Node.js (v18+)
- MongoDB Atlas account (or local MongoDB)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Lalit05Hadkar/zoom-video-call.git
   cd zoom-video-call
   ```

2. **Install all dependencies:**
   ```bash
   npm run install:all
   ```

3. **Run the Application:**
   ```bash
   # Start the backend server (Port 8000)
   npm run dev:backend

   # In a separate terminal, start the React client (Port 3000)
   npm run dev:frontend
   ```

4. **Access the App:**
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🌐 Production Deployment

The project includes pre-configured deployment manifests:
- [`render.yaml`](render.yaml) for 1-click deployment on [Render](https://render.com).
- [`Dockerfile`](Dockerfile) for multi-stage container deployment on any Docker/Cloud host.

---

## 👤 Author

**Lalit Hadkar**
- GitHub: [@Lalit05Hadkar](https://github.com/Lalit05Hadkar)
- Portfolio: [Lalit Hadkar Portfolio](https://github.com/Lalit05Hadkar/portfolio)
