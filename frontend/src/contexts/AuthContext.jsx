import axios from "axios";
import { createContext, useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import server from "../environment";

export const AuthContext = createContext({});

const client = axios.create({ baseURL: `${server}/api/v1/users` });

client.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

const readUser = () => {
    try {
        return JSON.parse(localStorage.getItem("user")) || null;
    } catch {
        return null;
    }
};

export const errorMessage = (err) =>
    err?.response?.data?.message || (err?.request ? "Cannot reach the server. Is the backend running?" : err?.message) || "Something went wrong";

export const AuthProvider = ({ children }) => {
    const navigate = useNavigate();
    const [userData, setUserData] = useState(readUser);

    const handleRegister = useCallback(async (name, username, password) => {
        const res = await client.post("/register", { name, username, password });
        return res.data.message;
    }, []);

    const handleLogin = useCallback(async (username, password) => {
        const res = await client.post("/login", { username, password });
        const user = { name: res.data.name, username: res.data.username };
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("user", JSON.stringify(user));
        setUserData(user);
        navigate("/home");
    }, [navigate]);

    const clearSession = useCallback(() => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setUserData(null);
    }, []);

    const handleLogout = useCallback(async () => {
        try { await client.post("/logout"); } catch { /* token may already be invalid */ }
        clearSession();
        navigate("/");
    }, [clearSession, navigate]);

    const fetchMe = useCallback(async () => {
        const res = await client.get("/me");
        localStorage.setItem("user", JSON.stringify(res.data));
        setUserData(res.data);
        return res.data;
    }, []);

    const getHistoryOfUser = useCallback(async () => (await client.get("/get_all_activity")).data, []);
    const addToUserHistory = useCallback(async (meetingCode) => (await client.post("/add_to_activity", { meeting_code: meetingCode })).data, []);
    const deleteHistoryItem = useCallback(async (id) => client.delete(`/activity/${id}`), []);
    const clearHistory = useCallback(async () => client.delete("/activity"), []);

    const value = useMemo(() => ({
        userData, setUserData, handleRegister, handleLogin, handleLogout, clearSession, fetchMe,
        getHistoryOfUser, addToUserHistory, deleteHistoryItem, clearHistory,
    }), [userData, handleRegister, handleLogin, handleLogout, clearSession, fetchMe,
        getHistoryOfUser, addToUserHistory, deleteHistoryItem, clearHistory]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
