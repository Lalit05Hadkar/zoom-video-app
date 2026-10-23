import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import VideocamIcon from "@mui/icons-material/Videocam";

export const Brand = ({ to = "/" }) => (
    <Link to={to} className="brand">
        <span className="brand-logo"><VideocamIcon /></span>
        <span>Zoom Video Call</span>
    </Link>
);

export const Avatar = ({ name }) => (
    <span className="avatar" title={name}>{(name || "?").trim().charAt(0).toUpperCase()}</span>
);

// Small self-dismissing message. Pass a new `text` (or object with `id`) to retrigger.
export const Toast = ({ text, onDone }) => {
    useEffect(() => {
        if (!text) return undefined;
        const t = setTimeout(onDone, 2600);
        return () => clearTimeout(t);
    }, [text, onDone]);
    return text ? <div className="toast" role="status">{text}</div> : null;
};

export const useToast = () => {
    const [text, setText] = useState("");
    return [text, setText, () => setText("")];
};

// Modal that asks for a meeting code or link (used by the guest flow and by Home).
export const JoinModal = ({ open, onClose, onSubmit, title = "Join a meeting" }) => {
    const [value, setValue] = useState("");
    if (!open) return null;
    const submit = (e) => {
        e.preventDefault();
        if (value.trim()) onSubmit(value);
    };
    return (
        <div className="modal-backdrop" onMouseDown={onClose}>
            <form className="modal" onMouseDown={(e) => e.stopPropagation()} onSubmit={submit}>
                <h3>{title}</h3>
                <p className="sub">Enter the meeting code or paste the invite link.</p>
                <input className="input" autoFocus placeholder="e.g. abc-defg-hij" value={value} onChange={(e) => setValue(e.target.value)} />
                <div className="modal-actions" style={{ marginTop: 18 }}>
                    <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
                    <button type="submit" className="btn btn-primary" disabled={!value.trim()}>Join</button>
                </div>
            </form>
        </div>
    );
};
