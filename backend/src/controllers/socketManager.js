import { Server } from "socket.io";

// room -> [{ id, name }]
const rooms = {};
// room -> chat history (capped)
const messages = {};
const MAX_HISTORY = 200;

const roomOf = (socketId) => Object.keys(rooms).find((r) => rooms[r].some((p) => p.id === socketId));

export const connectToSocket = (server) => {
    const io = new Server(server, {
        cors: { origin: "*", methods: ["GET", "POST"] },
    });

    io.on("connection", (socket) => {
        socket.on("join-call", (room, name) => {
            if (!room || roomOf(socket.id)) return;
            room = String(room).slice(0, 200);
            rooms[room] = rooms[room] || [];
            rooms[room].push({ id: socket.id, name: String(name || "Guest").slice(0, 40) });
            socket.join(room);

            // Everybody (including the joiner) learns the full participant list.
            io.to(room).emit("user-joined", socket.id, rooms[room]);

            (messages[room] || []).forEach((m) => {
                socket.emit("chat-message", m.data, m.sender, m.senderId, m.time);
            });
        });

        // Targeted WebRTC signalling.
        socket.on("signal", (toId, message) => {
            io.to(toId).emit("signal", socket.id, message);
        });

        socket.on("chat-message", (data, sender) => {
            const room = roomOf(socket.id);
            const text = String(data || "").trim().slice(0, 2000);
            if (!room || !text) return;
            const entry = { sender: String(sender || "Guest").slice(0, 40), data: text, senderId: socket.id, time: Date.now() };
            messages[room] = [...(messages[room] || []), entry].slice(-MAX_HISTORY);
            io.to(room).emit("chat-message", entry.data, entry.sender, entry.senderId, entry.time);
        });

        // Lightweight state broadcast so peers can show mute/camera badges.
        socket.on("media-state", (state) => {
            const room = roomOf(socket.id);
            if (room) socket.to(room).emit("media-state", socket.id, state);
        });

        socket.on("disconnect", () => {
            const room = roomOf(socket.id);
            if (!room) return;
            rooms[room] = rooms[room].filter((p) => p.id !== socket.id);
            io.to(room).emit("user-left", socket.id);
            if (rooms[room].length === 0) {
                delete rooms[room];
                delete messages[room];
            }
        });
    });

    return io;
};
