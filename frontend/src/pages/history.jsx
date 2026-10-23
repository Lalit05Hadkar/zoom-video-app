import React, { useCallback, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import "../App.css";
import withAuth from "../utils/withAuth";
import { AuthContext, errorMessage } from "../contexts/AuthContext";
import { Avatar, Brand, Toast } from "../components/ui";
import { formatDateTime, meetingLink } from "../utils/meeting";

function History() {
    const navigate = useNavigate();
    const { userData, getHistoryOfUser, addToUserHistory, deleteHistoryItem, clearHistory } = useContext(AuthContext);
    const [meetings, setMeetings] = useState(null);
    const [error, setError] = useState("");
    const [toast, setToast] = useState("");
    const clearToast = useCallback(() => setToast(""), []);

    useEffect(() => {
        getHistoryOfUser().then(setMeetings).catch((e) => { setError(errorMessage(e)); setMeetings([]); });
    }, [getHistoryOfUser]);

    const remove = async (id) => {
        try {
            await deleteHistoryItem(id);
            setMeetings((list) => list.filter((m) => m._id !== id));
        } catch (e) {
            setToast(errorMessage(e));
        }
    };

    const clearAll = async () => {
        if (!window.confirm("Delete your entire meeting history?")) return;
        try {
            await clearHistory();
            setMeetings([]);
        } catch (e) {
            setToast(errorMessage(e));
        }
    };

    const rejoin = async (code) => {
        try { await addToUserHistory(code); } catch { /* history is best-effort */ }
        navigate(`/${code}`);
    };

    const copy = async (code) => {
        try {
            await navigator.clipboard.writeText(meetingLink(code));
            setToast("Meeting link copied");
        } catch {
            setToast(meetingLink(code));
        }
    };

    return (
        <>
            <header className="topbar">
                <Brand to="/home" />
                <div className="topbar-actions"><Avatar name={userData?.name} /></div>
            </header>
            <main className="page">
                <div className="section-head" style={{ marginTop: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => navigate("/home")} aria-label="Back to home"><ArrowBackIcon fontSize="small" /></button>
                        <h3 style={{ fontSize: "1.4rem" }}>Meeting history</h3>
                    </div>
                    {meetings?.length > 0 && <button className="btn btn-ghost btn-sm" onClick={clearAll}>Clear all</button>}
                </div>

                {error && <div className="alert alert-error">{error}</div>}
                {meetings === null ? (
                    <div className="splash" style={{ minHeight: 200 }}><div className="spinner" /></div>
                ) : meetings.length === 0 ? (
                    <div className="empty">Your meeting history is empty.</div>
                ) : (
                    <div className="meeting-list">
                        {meetings.map((m) => (
                            <div className="meeting-item" key={m._id}>
                                <div>
                                    <div className="code">{m.meetingCode}</div>
                                    <div className="when">{formatDateTime(m.date)}</div>
                                </div>
                                <div className="meeting-actions">
                                    <button className="btn btn-ghost btn-sm" onClick={() => copy(m.meetingCode)}>Copy link</button>
                                    <button className="btn btn-primary btn-sm" onClick={() => rejoin(m.meetingCode)}>Rejoin</button>
                                    <button className="btn btn-ghost btn-sm" onClick={() => remove(m._id)} aria-label="Delete"><DeleteOutlineIcon fontSize="small" /></button>
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

export default withAuth(History);
