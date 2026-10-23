# Deployment Guide for Zoom Video Conferencing App

This application is a full-stack MERN + Socket.io (WebRTC signaling) application. Because Socket.io relies on persistent WebSocket connections, the backend server must be hosted on a platform that supports WebSockets (such as **Render**, **Railway**, **Fly.io**, **DigitalOcean**, or any **VPS/Docker** host).

---

## Architecture Summary

- **Backend**: Node.js + Express + Socket.io + MongoDB Atlas (Mongoose)
- **Frontend**: React (SPA) with Material-UI & WebRTC
- **Single Service Mode**: The Express backend is configured to serve the compiled React frontend directly from `frontend/build`, enabling a single unified deployment with no CORS configuration required.
- **Decoupled Mode**: The frontend can also be hosted independently on Vercel/Netlify while communicating with a remote backend.

---

## Option 1: Render.com (Recommended — Simplest & Free)

The project includes a pre-configured [`render.yaml`](file:///c:/Users/MI/Desktop/zoom/render.yaml) blueprint.

### Steps:
1. Push your repository to your GitHub account:
   ```bash
   git add .
   git commit -m "Configure production deployment and fixes"
   git push origin main
   ```
2. Log into [Render.com](https://render.com).
3. Click **New +** and select **Blueprint**.
4. Connect your GitHub repository.
5. Render will automatically detect [`render.yaml`](file:///c:/Users/MI/Desktop/zoom/render.yaml) and configure:
   - **Build Command**: `npm run install:all && npm run build`
   - **Start Command**: `npm start`
   - **Environment Variables**:
     - `NODE_ENV`: `production`
     - `PORT`: `8000`
     - `MONGO_URI`: Enter your MongoDB Atlas connection string (or use the preconfigured default).
6. Click **Apply**. Once deployed, Render will provide a live HTTPS URL with both frontend and backend running on the same domain.

---

## Option 2: Railway.app

1. Log into [Railway.app](https://railway.app).
2. Click **New Project** -> **Deploy from GitHub repo**.
3. Select this repository.
4. Add the following environment variables in the Railway dashboard:
   - `PORT`: `8000`
   - `NODE_ENV`: `production`
   - `MONGO_URI`: `your_mongodb_connection_string`
5. Railway will automatically detect the [`Dockerfile`](file:///c:/Users/MI/Desktop/zoom/Dockerfile) or [`package.json`](file:///c:/Users/MI/Desktop/zoom/package.json), build the multi-stage image, and launch the service.
6. Generate a public domain under **Settings -> Networking**.

---

## Option 3: Decoupled (Vercel Frontend + Render Backend)

If you prefer hosting the React client on Vercel:

### Step 1: Deploy Backend to Render or Railway
- Create a **Web Service** pointing to the `backend/` directory.
- Build Command: `npm install`
- Start Command: `node src/app.js`
- Set `MONGO_URI` environment variable.
- Note your live backend URL (e.g., `https://zoom-api.onrender.com`).

### Step 2: Deploy Frontend to Vercel
- Connect repository on [Vercel](https://vercel.com).
- Root Directory: `frontend`
- Build Command: `npm run build`
- Output Directory: `build`
- Environment Variables:
  - `REACT_APP_BACKEND_URL`: `https://zoom-api.onrender.com` (your deployed backend URL)
- Deploy!

---

## Option 4: Docker Container (Any VPS / Cloud)

Build and run using the included [`Dockerfile`](file:///c:/Users/MI/Desktop/zoom/Dockerfile):

```bash
# Build the container
docker build -t zoom-app .

# Run the container
docker run -d -p 8000:8000 \
  -e MONGO_URI="your_mongodb_connection_string" \
  -e PORT=8000 \
  --name zoom-container zoom-app
```
Then visit `http://YOUR_SERVER_IP:8000`.

---

## Required Environment Variables

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `PORT` | Port for the backend Express server | `8000` |
| `MONGO_URI` | MongoDB connection string | MongoDB Atlas URI |
| `NODE_ENV` | Environment mode | `production` |
| `REACT_APP_BACKEND_URL` | *(Optional, decoupled mode only)* Remote API URL | `https://your-backend.onrender.com` |
