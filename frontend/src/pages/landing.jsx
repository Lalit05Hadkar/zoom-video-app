import React, { useState } from "react";
import "../App.css";
import { Link, useNavigate } from "react-router-dom";
import VideocamIcon from "@mui/icons-material/Videocam";
import ScreenShareIcon from "@mui/icons-material/ScreenShare";
import ChatIcon from "@mui/icons-material/Chat";
import HistoryIcon from "@mui/icons-material/History";
import { Brand, JoinModal } from "../components/ui";
import { parseMeetingCode } from "../utils/meeting";

const FEATURES = [
    { icon: <VideocamIcon />, title: "HD video & audio", text: "Peer-to-peer WebRTC calls with several people at once." },
    { icon: <ScreenShareIcon />, title: "Screen sharing", text: "Present your screen to everyone in one click." },
    { icon: <ChatIcon />, title: "Live chat", text: "Message the room without leaving the call." },
    { icon: <HistoryIcon />, title: "Meeting history", text: "Sign in to keep a saved list of meetings you joined." },
];

export default function LandingPage() {
    const navigate = useNavigate();
    const [joinOpen, setJoinOpen] = useState(false);
    const loggedIn = !!localStorage.getItem("token");

    return (
        <div className="landing">
            <nav className="topbar">
                <Brand />
                <div className="topbar-actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => setJoinOpen(true)}>Join as Guest</button>
                    {loggedIn ? (
                        <Link to="/home" className="btn btn-primary btn-sm">Open dashboard</Link>
                    ) : (
                        <>
                            <Link to="/auth?mode=register" className="btn btn-ghost btn-sm">Register</Link>
                            <Link to="/auth" className="btn btn-primary btn-sm">Login</Link>
                        </>
                    )}
                </div>
            </nav>

            <header className="hero">
                <div>
                    <h1><span>Connect</span> with the people who matter</h1>
                    <p className="lead">Crystal-clear video conferencing, screen sharing and messaging. Start a meeting in seconds and share the link.</p>
                    <div className="hero-cta">
                        <Link to={loggedIn ? "/home" : "/auth"} className="btn btn-primary btn-lg">Get started</Link>
                        <button className="btn btn-ghost btn-lg" onClick={() => setJoinOpen(true)}>Join with a code</button>
                    </div>
                </div>
                <div className="hero-art">
                    <img src="/mobile.png" alt="Zoom Video Call on a phone" />
                </div>
            </header>

            <section className="features">
                {FEATURES.map((f) => (
                    <div className="feature" key={f.title}>
                        <div className="ico">{f.icon}</div>
                        <h4>{f.title}</h4>
                        <p>{f.text}</p>
                    </div>
                ))}
            </section>

            <JoinModal
                open={joinOpen}
                title="Join as guest"
                onClose={() => setJoinOpen(false)}
                onSubmit={(v) => navigate(`/${parseMeetingCode(v)}`)}
            />
        </div>
    );
}
