import React, { useCallback, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AddIcon from "@mui/icons-material/Add";
import KeyboardIcon from "@mui/icons-material/Keyboard";
import HistoryIcon from "@mui/icons-material/History";
import LogoutIcon from "@mui/icons-material/Logout";
import "../App.css";
import withAuth from "../utils/withAuth";
import { AuthContext } from "../contexts/AuthContext";
import { Avatar, Brand, Toast } from "../components/ui";
import { formatDateTime, generateMeetingCode, meetingLink, parseMeetingCode } from "../utils/meeting";

function HomeComponent() {
    const navigate = useNavigate();
    const { userData, addToUserHistory, getHistoryOfUser, handleLogout } = useContext(AuthContext);
    const [code, setCode] = useState("");
    const [recent, setRecent] = useState([]);
    const [toast, setToast] = useState("");
    const clearToast = useCallback(() => setToast(""), []);

    useEffect(() => {
        getHistoryOfUser().then((h) => setRecent(h.slice(0, 4))).catch(() => { });
    }, [getHistoryOfUser]);

    const joinMeeting = async (meetingCode) => {
        if (!meetingCode) return;
        try {
            await addToUserHistory(meetingCode);
        } catch {
            // Joining must never be blocked by a failed history write.
        }
        navigate(`/${meetingCode}`);
    };

    const copy = async (meetingCode) => {
        try {
            await navigator.clipboard.writeText(meetingLink(meetingCode));
            setToast("Meeting link copied");
        } catch {
            setToast(meetingLink(meetingCode));
        }
    };

    return (
        <>
            <header className="topbar">
                <Brand to="/home" />
                <div className="topbar-actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => navigate("/history")}><HistoryIcon fontSize="small" /> History</button>
                    <Avatar name={userData?.name} />
                    <button className="btn btn-ghost btn-sm" onClick={handleLogout}><LogoutIcon fontSize="small" /> Logout</button>
                </div>
            </header>

            <main className="page">
                <section className="home-hero">
                    <div>
                        <h1>Hi {userData?.name?.split(" ")[0] || "there"}, ready to meet?</h1>
                        <p>Start an instant meeting or join one with a code.</p>
                        <button className="btn btn-primary btn-lg" onClick={() => joinMeeting(generateMeetingCode())}>
                            <AddIcon /> New meeting
                        </button>
                        <form className="join-row" onSubmit={(e) => { e.preventDefault(); joinMeeting(parseMeetingCode(code)); }}>
                            <input className="input" placeholder="Enter a code or link" value={code} onChange={(e) => setCode(e.target.value)} aria-label="Meeting code" />
                            <button type="submit" className="btn btn-ghost" disabled={!code.trim()}><KeyboardIcon /> Join</button>
                        </form>
                    </div>
                    <img src="/logo3.png" alt="" />
                </section>

                <div className="section-head">
                    <h3>Recent meetings</h3>
                    {recent.length > 0 && <button className="btn btn-ghost btn-sm" onClick={() => navigate("/history")}>View all</button>}
                </div>
                {recent.length === 0 ? (
                    <div className="empty">No meetings yet. Start one above and it will show up here.</div>
                ) : (
                    <div className="meeting-list">
                        {recent.map((m) => (
                            <div className="meeting-item" key={m._id}>
                                <div>
                                    <div className="code">{m.meetingCode}</div>
                                    <div className="when">{formatDateTime(m.date)}</div>
                                </div>
                                <div className="meeting-actions">
                                    <button className="btn btn-ghost btn-sm" onClick={() => copy(m.meetingCode)}>Copy link</button>
                                    <button className="btn btn-primary btn-sm" onClick={() => joinMeeting(m.meetingCode)}>Rejoin</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
            <Toast text={toast} onDone={clearToast} />
        </>
    );
}

export default withAuth(HomeComponent);
