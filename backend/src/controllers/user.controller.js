import httpStatus from "http-status";
import bcrypt from "bcrypt";
import crypto from "node:crypto";
import { db } from "../db.js";

const USERNAME_RE = /^[a-zA-Z0-9_.-]{3,30}$/;

const tokenFrom = (req) => {
    const header = req.headers.authorization || "";
    if (header.startsWith("Bearer ")) return header.slice(7);
    return req.query.token || req.body?.token;
};

// Resolves the signed-in user for protected routes.
const requireUser = async (req, res, next) => {
    const token = tokenFrom(req);
    if (!token) return res.status(httpStatus.UNAUTHORIZED).json({ message: "Please sign in" });
    try {
        const user = await db.findUserByToken(token);
        if (!user) return res.status(httpStatus.UNAUTHORIZED).json({ message: "Session expired, please sign in again" });
        req.user = user;
        next();
    } catch (e) {
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: e.message });
    }
};

const login = async (req, res) => {
    const username = String(req.body.username || "").trim().toLowerCase();
    const { password } = req.body;
    if (!username || !password) {
        return res.status(httpStatus.BAD_REQUEST).json({ message: "Username and password are required" });
    }
    try {
        const user = await db.findUserByUsername(username);
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(httpStatus.UNAUTHORIZED).json({ message: "Invalid username or password" });
        }
        const token = crypto.randomBytes(24).toString("hex");
        await db.setToken(user.username, token);
        return res.status(httpStatus.OK).json({ token, name: user.name, username: user.username });
    } catch (e) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: `Something went wrong: ${e.message}` });
    }
};

const register = async (req, res) => {
    const name = String(req.body.name || "").trim();
    const username = String(req.body.username || "").trim().toLowerCase();
    const { password } = req.body;

    if (!name || !username || !password) {
        return res.status(httpStatus.BAD_REQUEST).json({ message: "Name, username and password are required" });
    }
    if (!USERNAME_RE.test(username)) {
        return res.status(httpStatus.BAD_REQUEST).json({ message: "Username must be 3-30 letters, numbers, . _ or -" });
    }
    if (String(password).length < 6) {
        return res.status(httpStatus.BAD_REQUEST).json({ message: "Password must be at least 6 characters" });
    }
    try {
        if (await db.findUserByUsername(username)) {
            return res.status(httpStatus.CONFLICT).json({ message: "That username is already taken" });
        }
        await db.createUser({ name, username, password: await bcrypt.hash(password, 10) });
        return res.status(httpStatus.CREATED).json({ message: "Account created. You can sign in now." });
    } catch (e) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: `Something went wrong: ${e.message}` });
    }
};

const me = (req, res) => res.json({ name: req.user.name, username: req.user.username });

const logout = async (req, res) => {
    await db.setToken(req.user.username, null);
    res.json({ message: "Signed out" });
};

const getUserHistory = async (req, res) => {
    try {
        res.json(await db.listMeetings(req.user.username));
    } catch (e) {
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: e.message });
    }
};

const addToHistory = async (req, res) => {
    const meetingCode = String(req.body.meeting_code || "").trim();
    if (!meetingCode) return res.status(httpStatus.BAD_REQUEST).json({ message: "Meeting code is required" });
    try {
        const meeting = await db.addMeeting({ user_id: req.user.username, meetingCode });
        res.status(httpStatus.CREATED).json(meeting);
    } catch (e) {
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: e.message });
    }
};

const deleteFromHistory = async (req, res) => {
    try {
        await db.deleteMeeting(req.user.username, req.params.id);
        res.json({ message: "Removed" });
    } catch (e) {
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: e.message });
    }
};

const clearHistory = async (req, res) => {
    try {
        await db.clearMeetings(req.user.username);
        res.json({ message: "History cleared" });
    } catch (e) {
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: e.message });
    }
};

export { login, register, me, logout, requireUser, getUserHistory, addToHistory, deleteFromHistory, clearHistory };
