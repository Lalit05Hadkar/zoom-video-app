# Prompt: make the Zoom video app fully functional

Paste this into Claude Code from the repo root.

```
Repo: https://github.com/Lalit05Hadkar/zoom-video-app (React CRA frontend, Express + Socket.io backend, WebRTC).

Problem: the UI is not working properly and there is no working database.
Goal: make the app fully functional end to end and improve the UI. Do everything yourself and verify it in a real browser.

1. Audit first. Read every file in backend/src and frontend/src. List what is broken
   (hard-coded third-party MongoDB URI, no error handling, unprotected history routes,
   WebRTC bugs, unstyled pages) before changing anything.

2. Database
   - Remove the hard-coded Mongo URI. Read MONGO_URI (or MONGO_URL) from the environment.
   - If it is unset or unreachable, fall back to a persistent JSON file store
     (backend/data/db.json, git-ignored) so the app works with zero setup.
   - Put both behind one async interface (db.js): users, tokens, meeting history.
   - Never log or commit credentials.

3. Backend API (keep existing paths working)
   - register/login with bcrypt; validate username, min password length; lowercase usernames.
   - Bearer-token auth middleware; GET /me, POST /logout.
   - History: add, list (newest first), delete one, clear all, all scoped to the signed-in user.
   - Socket.io: per-room participant list with names, targeted signalling, chat with
     timestamps and capped history, media-state relay, clean-up on disconnect.

4. Frontend
   - A consistent dark theme (CSS variables), responsive down to phone width.
   - Landing (features, guest join modal), Auth (tabs, validation, show/hide password,
     clear errors), Home (new meeting with generated code, join by code or link, recent
     meetings), History (rejoin, copy link, delete, clear all), route guard that validates the token.
   - Meeting page: lobby with camera preview and name, then a call view with a tile grid,
     name tags, mic/camera/screen-share/chat/participants/leave controls, unread badge,
     meeting timer and copy-link button.
   - Fix WebRTC: use addTrack/ontrack, never overwrite existing peer connections, queue ICE
     candidates until the remote description is set, use replaceTrack for screen sharing,
     and fall back to placeholder tracks when no camera or microphone exists.

5. Verify, don't assume
   - Build the frontend and run its tests (fix the stale CRA test; map axios to its CJS
     build in jest config).
   - Start the backend, register, sign in, start a meeting, send a chat message, open a second
     tab and confirm both see each other. Check the console and network tabs for errors.
   - Say clearly what could not be verified (for example real camera/mic media).

6. Finish with a README update (env vars, run commands), a local commit, and a short summary.
   Do not push or deploy unless I ask.
```
