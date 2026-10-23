import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";
import mongoose from "mongoose";
import { User } from "./models/user.model.js";
import { Meeting } from "./models/meeting.model.js";

// Storage layer. Uses MongoDB when MONGO_URI is set and reachable; otherwise falls
// back to a persistent JSON file so the app always works with zero setup.
// Every method is async so callers don't care which backend is active.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = process.env.DATA_FILE || path.resolve(__dirname, "../data/db.json");

const mongoStore = {
    kind: "mongodb",
    findUserByUsername: (username) => User.findOne({ username }).lean(),
    findUserByToken: (token) => User.findOne({ token }).lean(),
    createUser: async (u) => (await User.create(u)).toObject(),
    setToken: (username, token) => User.updateOne({ username }, { token }),
    addMeeting: async (m) => (await Meeting.create(m)).toObject(),
    listMeetings: (user_id) => Meeting.find({ user_id }).sort({ date: -1 }).lean(),
    deleteMeeting: (user_id, id) => Meeting.deleteOne({ _id: id, user_id }),
    clearMeetings: (user_id) => Meeting.deleteMany({ user_id }),
};

const makeFileStore = () => {
    let state = { users: [], meetings: [] };
    try {
        state = { ...state, ...JSON.parse(fs.readFileSync(DATA_FILE, "utf8")) };
    } catch { /* first run */ }

    let writing = Promise.resolve();
    const save = () => {
        writing = writing.then(async () => {
            await fs.promises.mkdir(path.dirname(DATA_FILE), { recursive: true });
            const tmp = `${DATA_FILE}.tmp`;
            await fs.promises.writeFile(tmp, JSON.stringify(state, null, 2));
            await fs.promises.rename(tmp, DATA_FILE);
        }).catch((e) => console.error("Could not persist data file:", e.message));
        return writing;
    };

    return {
        kind: `file (${DATA_FILE})`,
        findUserByUsername: async (username) => state.users.find((u) => u.username === username) || null,
        findUserByToken: async (token) => state.users.find((u) => u.token === token) || null,
        createUser: async (u) => {
            const user = { _id: crypto.randomUUID(), ...u, createdAt: new Date().toISOString() };
            state.users.push(user);
            await save();
            return user;
        },
        setToken: async (username, token) => {
            const u = state.users.find((x) => x.username === username);
            if (u) u.token = token;
            await save();
        },
        addMeeting: async (m) => {
            const meeting = { _id: crypto.randomUUID(), date: new Date().toISOString(), ...m };
            state.meetings.push(meeting);
            await save();
            return meeting;
        },
        listMeetings: async (user_id) =>
            state.meetings.filter((m) => m.user_id === user_id).sort((a, b) => new Date(b.date) - new Date(a.date)),
        deleteMeeting: async (user_id, id) => {
            state.meetings = state.meetings.filter((m) => !(m.user_id === user_id && m._id === id));
            await save();
        },
        clearMeetings: async (user_id) => {
            state.meetings = state.meetings.filter((m) => m.user_id !== user_id);
            await save();
        },
    };
};

let store = null;

export const initDb = async () => {
    const uri = process.env.MONGO_URI || process.env.MONGO_URL;
    if (uri) {
        try {
            const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
            console.log(`MongoDB connected: ${conn.connection.host}`);
            store = mongoStore;
            return store;
        } catch (e) {
            console.error(`MongoDB unavailable (${e.message}). Falling back to local file storage.`);
        }
    }
    store = makeFileStore();
    console.log(`Using ${store.kind}`);
    return store;
};

export const db = new Proxy({}, {
    get: (_, prop) => {
        if (!store) throw new Error("Database not initialised");
        return store[prop];
    },
});
