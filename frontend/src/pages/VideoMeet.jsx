import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import io from "socket.io-client";
import VideocamIcon from "@mui/icons-material/Videocam";
import VideocamOffIcon from "@mui/icons-material/VideocamOff";
import MicIcon from "@mui/icons-material/Mic";
import MicOffIcon from "@mui/icons-material/MicOff";
import CallEndIcon from "@mui/icons-material/CallEnd";
import ScreenShareIcon from "@mui/icons-material/ScreenShare";
import StopScreenShareIcon from "@mui/icons-material/StopScreenShare";
import ChatIcon from "@mui/icons-material/Chat";
import PeopleIcon from "@mui/icons-material/People";
import LinkIcon from "@mui/icons-material/Link";
import SendIcon from "@mui/icons-material/Send";
import CloseIcon from "@mui/icons-material/Close";
import styles from "../styles/videoComponent.module.css";
import "../App.css";
import server from "../environment";
import { AuthContext } from "../contexts/AuthContext";
import { Toast } from "../components/ui";
import { meetingLink } from "../utils/meeting";

const RTC_CONFIG = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }] };

// A placeholder track keeps every peer connection sendrecv even when the
// camera or microphone is unavailable, so toggling later never needs renegotiation.
const blackVideoTrack = () => {
    const canvas = Object.assign(document.createElement("canvas"), { width: 640, height: 480 });
    canvas.getContext("2d").fillRect(0, 0, 640, 480);
    const track = canvas.captureStream().getVideoTracks()[0];
    track.enabled = false;
    return track;
};
const silentAudioTrack = () => {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const dst = ctx.createMediaStreamDestination();
    ctx.createOscillator().connect(dst);
    const track = dst.stream.getAudioTracks()[0];
    track.enabled = false;
    return track;
};

// Ask for camera+mic, then fall back to whichever device is available.
const acquireMedia = async () => {
    const attempts = [{ video: true, audio: true }, { video: true }, { audio: true }];
    // If the permission prompt is ignored, don't block joining forever.
    const timeout = new Promise((resolve) => setTimeout(() => resolve(null), 10000));
    for (const constraints of attempts) {
        try {
            const stream = await Promise.race([navigator.mediaDevices.getUserMedia(constraints), timeout]);
            if (stream) return stream;
            return null;
        } catch { /* try next */ }
    }
    return null;
};

const Tile = ({ stream, name, isLocal, mic, cam, mirrored }) => {
    const ref = useRef(null);
    useEffect(() => {
        if (ref.current && ref.current.srcObject !== stream) ref.current.srcObject = stream || null;
    }, [stream]);
    return (
        <div className={styles.tile}>
            <video ref={ref} autoPlay playsInline muted={isLocal} className={mirrored ? styles.mirror : ""} style={{ opacity: cam ? 1 : 0 }} />
            {!cam && <div className={styles.noCam}><span>{(name || "?").charAt(0).toUpperCase()}</span></div>}
            <div className={styles.nameTag}>
                {!mic && <MicOffIcon style={{ fontSize: 16, color: "#ff6b6b" }} />}
                {name}{isLocal ? " (You)" : ""}
            </div>
        </div>
    );
};

export default function VideoMeetComponent() {
    const { url: code } = useParams();
    const navigate = useNavigate();
    const { userData } = useContext(AuthContext);

    const socketRef = useRef(null);
    const peersRef = useRef({});          // id -> { pc, pendingIce }
    const localStreamRef = useRef(null);  // camera/mic stream we send
    const cameraTrackRef = useRef(null);
    const screenStreamRef = useRef(null);
    const lobbyVideoRef = useRef(null);

    const [phase, setPhase] = useState("lobby"); // lobby | call
    const [name, setName] = useState(userData?.name || "");
    const [mediaReady, setMediaReady] = useState(false);
    const [hasCam, setHasCam] = useState(false);
    const [hasMic, setHasMic] = useState(false);
    const [camOn, setCamOn] = useState(true);
    const [micOn, setMicOn] = useState(true);
    const [sharing, setSharing] = useState(false);
    const [localView, setLocalView] = useState(null);

    const [participants, setParticipants] = useState({}); // id -> { name, stream, mic, cam }
    const [panel, setPanel] = useState(null); // null | chat | people
    const [messages, setMessages] = useState([]);
    const [draft, setDraft] = useState("");
    const [unread, setUnread] = useState(0);
    const [toast, setToast] = useState("");
    const [elapsed, setElapsed] = useState(0);
    const panelRef = useRef(null);
    const chatEndRef = useRef(null);
    const nameRef = useRef(name);
    nameRef.current = name;
    panelRef.current = panel;
    const clearToast = useCallback(() => setToast(""), []);

    /* ---------- local media ---------- */
    useEffect(() => {
        let cancelled = false;
        (async () => {
            const raw = navigator.mediaDevices ? await acquireMedia() : null;
            if (cancelled) { raw?.getTracks().forEach((t) => t.stop()); return; }
            const video = raw?.getVideoTracks()[0];
            const audio = raw?.getAudioTracks()[0];
            const stream = new MediaStream([video || blackVideoTrack(), audio || silentAudioTrack()]);
            localStreamRef.current = stream;
            cameraTrackRef.current = stream.getVideoTracks()[0];
            setHasCam(!!video);
            setHasMic(!!audio);
            setCamOn(!!video);
            setMicOn(!!audio);
            setLocalView(stream);
            setMediaReady(true);
        })();
        return () => {
            cancelled = true;
            localStreamRef.current?.getTracks().forEach((t) => t.stop());
            screenStreamRef.current?.getTracks().forEach((t) => t.stop());
        };
    }, []);

    useEffect(() => {
        if (phase === "lobby" && lobbyVideoRef.current) lobbyVideoRef.current.srcObject = localStreamRef.current;
    }, [phase, mediaReady]);

    const broadcastState = useCallback((mic, cam) => {
        socketRef.current?.emit("media-state", { mic, cam });
    }, []);

    const toggleCam = () => {
        if (!hasCam) { setToast("No camera found"); return; }
        const next = !camOn;
        cameraTrackRef.current.enabled = next;
        setCamOn(next);
        broadcastState(micOn, next || sharing);
    };
    const toggleMic = () => {
        if (!hasMic) { setToast("No microphone found"); return; }
        const next = !micOn;
        localStreamRef.current.getAudioTracks().forEach((t) => { t.enabled = next; });
        setMicOn(next);
        broadcastState(next, camOn || sharing);
    };

    /* ---------- peer connections ---------- */
    const setParticipant = useCallback((id, patch) => {
        setParticipants((prev) => ({ ...prev, [id]: { name: "Guest", mic: true, cam: true, ...prev[id], ...patch } }));
    }, []);

    const sendSignal = (toId, payload) => socketRef.current.emit("signal", toId, JSON.stringify(payload));

    const createPeer = useCallback((id, initiator) => {
        if (peersRef.current[id]) return peersRef.current[id];
        const pc = new RTCPeerConnection(RTC_CONFIG);
        const peer = { pc, pendingIce: [] };
        peersRef.current[id] = peer;

        localStreamRef.current.getTracks().forEach((track) => pc.addTrack(track, localStreamRef.current));
        // If screen sharing is active, new peers should see the screen instead of the camera.
        const display = screenStreamRef.current?.getVideoTracks()[0];
        if (display) pc.getSenders().find((s) => s.track?.kind === "video")?.replaceTrack(display);

        pc.onicecandidate = (e) => { if (e.candidate) sendSignal(id, { ice: e.candidate }); };
        pc.ontrack = (e) => setParticipant(id, { stream: e.streams[0] });
        pc.onconnectionstatechange = () => {
            if (pc.connectionState === "failed") pc.restartIce?.();
        };

        if (initiator) {
            pc.createOffer()
                .then((offer) => pc.setLocalDescription(offer))
                .then(() => sendSignal(id, { sdp: pc.localDescription }))
                .catch(console.error);
        }
        return peer;
    }, [setParticipant]);

    const closePeer = useCallback((id) => {
        peersRef.current[id]?.pc.close();
        delete peersRef.current[id];
        setParticipants((prev) => {
            const { [id]: _gone, ...rest } = prev;
            return rest;
        });
    }, []);

    const handleSignal = useCallback(async (fromId, raw) => {
        const signal = JSON.parse(raw);
        const peer = peersRef.current[fromId] || createPeer(fromId, false);
        const { pc } = peer;
        try {
            if (signal.sdp) {
                await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
                peer.pendingIce.splice(0).forEach((c) => pc.addIceCandidate(c).catch(console.error));
                if (signal.sdp.type === "offer") {
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);
                    sendSignal(fromId, { sdp: pc.localDescription });
                }
            } else if (signal.ice) {
                const candidate = new RTCIceCandidate(signal.ice);
                if (pc.remoteDescription) await pc.addIceCandidate(candidate);
                else peer.pendingIce.push(candidate);
            }
        } catch (e) {
            console.error("signal error", e);
        }
    }, [createPeer]);

    /* ---------- joining / leaving ---------- */
    const leave = useCallback(() => {
        Object.values(peersRef.current).forEach(({ pc }) => pc.close());
        peersRef.current = {};
        socketRef.current?.disconnect();
        localStreamRef.current?.getTracks().forEach((t) => t.stop());
        screenStreamRef.current?.getTracks().forEach((t) => t.stop());
        navigate(localStorage.getItem("token") ? "/home" : "/");
    }, [navigate]);

    useEffect(() => () => {
        // Component unmount (browser back etc.): drop the connection.
        Object.values(peersRef.current).forEach(({ pc }) => pc.close());
        peersRef.current = {};
        socketRef.current?.disconnect();
    }, []);

    const join = () => {
        if (!name.trim() || !mediaReady) return;
        const socket = io(server || undefined, { transports: ["websocket", "polling"] });
        socketRef.current = socket;

        socket.on("connect", () => {
            socket.emit("join-call", code, name.trim());
        });

        socket.on("user-joined", (newId, list) => {
            list.forEach((p) => {
                if (p.id !== socket.id) setParticipant(p.id, { name: p.name });
            });
            if (newId === socket.id) {
                // We are the newcomer: call everyone already here.
                list.filter((p) => p.id !== socket.id).forEach((p) => createPeer(p.id, true));
            } else {
                createPeer(newId, false);
                // Let the newcomer know our mic/camera state.
                broadcastState(localStreamRef.current.getAudioTracks()[0].enabled, cameraTrackRef.current.enabled || !!screenStreamRef.current);
                setToast(`${list.find((p) => p.id === newId)?.name || "Someone"} joined`);
            }
        });

        socket.on("signal", handleSignal);
        socket.on("user-left", (id) => closePeer(id));
        socket.on("media-state", (id, s) => setParticipant(id, { mic: s.mic, cam: s.cam }));
        socket.on("chat-message", (data, sender, senderId, time) => {
            setMessages((m) => [...m, { data, sender, mine: senderId === socket.id, time }]);
            if (senderId !== socket.id && panelRef.current !== "chat") setUnread((n) => n + 1);
        });
        socket.on("connect_error", () => setToast("Connection problem. Retrying…"));

        setPhase("call");
    };

    /* ---------- screen share ---------- */
    const replaceOutgoingVideo = (track) => {
        Object.values(peersRef.current).forEach(({ pc }) => {
            pc.getSenders().find((s) => s.track?.kind === "video")?.replaceTrack(track).catch(console.error);
        });
    };

    const stopSharing = useCallback(() => {
        screenStreamRef.current?.getTracks().forEach((t) => t.stop());
        screenStreamRef.current = null;
        replaceOutgoingVideo(cameraTrackRef.current);
        setLocalView(localStreamRef.current);
        setSharing(false);
        broadcastState(localStreamRef.current.getAudioTracks()[0].enabled, cameraTrackRef.current.enabled);
    }, [broadcastState]);

    const toggleShare = async () => {
        if (sharing) { stopSharing(); return; }
        if (!navigator.mediaDevices?.getDisplayMedia) { setToast("Screen sharing is not supported in this browser"); return; }
        try {
            const display = await navigator.mediaDevices.getDisplayMedia({ video: true });
            const track = display.getVideoTracks()[0];
            screenStreamRef.current = display;
            track.onended = stopSharing;
            replaceOutgoingVideo(track);
            setLocalView(display);
            setSharing(true);
            broadcastState(micOn, true);
        } catch {
            // user cancelled the picker
        }
    };

    /* ---------- chat ---------- */
    const sendMessage = (e) => {
        e.preventDefault();
        if (!draft.trim()) return;
        socketRef.current.emit("chat-message", draft, name.trim());
        setDraft("");
    };
    useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, panel]);

    const openPanel = (which) => {
        setPanel((p) => (p === which ? null : which));
        if (which === "chat") setUnread(0);
    };

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(meetingLink(code));
            setToast("Meeting link copied");
        } catch {
            setToast(meetingLink(code));
        }
    };

    useEffect(() => {
        if (phase !== "call") return undefined;
        const t0 = Date.now();
        const timer = setInterval(() => setElapsed(Math.floor((Date.now() - t0) / 1000)), 1000);
        return () => clearInterval(timer);
    }, [phase]);

    const clock = `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;
    const others = useMemo(() => Object.entries(participants), [participants]);
    const total = others.length + 1;
    const cols = total <= 1 ? 1 : total <= 4 ? 2 : total <= 9 ? 3 : 4;

    /* ---------- lobby ---------- */
    if (phase === "lobby") {
        return (
            <div className={styles.lobby}>
                <div className={styles.lobbyPreview}>
                    <div className={styles.tile}>
                        <video ref={lobbyVideoRef} autoPlay playsInline muted className={styles.mirror} style={{ opacity: camOn ? 1 : 0 }} />
                        {!camOn && <div className={styles.noCam}><span>{(name || "?").charAt(0).toUpperCase()}</span></div>}
                        <div className={styles.lobbyControls}>
                            <button className={`${styles.roundBtn} ${!micOn ? styles.off : ""}`} onClick={toggleMic} aria-label="Toggle microphone">{micOn ? <MicIcon /> : <MicOffIcon />}</button>
                            <button className={`${styles.roundBtn} ${!camOn ? styles.off : ""}`} onClick={toggleCam} aria-label="Toggle camera">{camOn ? <VideocamIcon /> : <VideocamOffIcon />}</button>
                        </div>
                    </div>
                    {mediaReady && !hasCam && <p className={styles.hint}>No camera detected. You can still join with audio or as a viewer.</p>}
                </div>
                <form className={styles.lobbyForm} onSubmit={(e) => { e.preventDefault(); join(); }}>
                    <h2>Ready to join?</h2>
                    <p className={styles.codeLine}>Meeting <b>{code}</b></p>
                    <div className="field">
                        <label htmlFor="lobby-name">Your name</label>
                        <input id="lobby-name" className="input" autoFocus placeholder="Enter your name" value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                    <button type="submit" className="btn btn-primary btn-lg" style={{ width: "100%" }} disabled={!name.trim() || !mediaReady}>
                        {mediaReady ? "Join now" : "Checking devices…"}
                    </button>
                    <button type="button" className="btn btn-ghost" style={{ width: "100%", marginTop: 10 }} onClick={() => navigate(localStorage.getItem("token") ? "/home" : "/")}>Cancel</button>
                </form>
            </div>
        );
    }

    /* ---------- call ---------- */
    return (
        <div className={styles.room}>
            <div className={styles.topInfo}>
                <span>{code}</span>
                <span className={styles.dot} />
                <span>{clock}</span>
                <button className={styles.linkBtn} onClick={copyLink}><LinkIcon style={{ fontSize: 16 }} /> Copy link</button>
            </div>

            <div className={styles.stage}>
                <div className={styles.grid} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
                    <Tile stream={localView} name={name} isLocal mic={micOn} cam={sharing || camOn} mirrored={!sharing} />
                    {others.map(([id, p]) => (
                        <Tile key={id} stream={p.stream} name={p.name} mic={p.mic} cam={p.cam} />
                    ))}
                </div>
                {total === 1 && <div className={styles.waiting}>Waiting for others to join. Share the meeting link to invite people.</div>}

                {panel && (
                    <aside className={styles.sidePanel}>
                        <div className={styles.panelHead}>
                            <h3>{panel === "chat" ? "Chat" : `People (${total})`}</h3>
                            <button className={styles.iconBtn} onClick={() => setPanel(null)} aria-label="Close panel"><CloseIcon /></button>
                        </div>
                        {panel === "chat" ? (
                            <>
                                <div className={styles.messages}>
                                    {messages.length === 0 && <p className={styles.hint}>No messages yet. Say hello!</p>}
                                    {messages.map((m, i) => (
                                        <div key={i} className={`${styles.msg} ${m.mine ? styles.mine : ""}`}>
                                            <div className={styles.msgMeta}>{m.mine ? "You" : m.sender} · {new Date(m.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                                            <div className={styles.bubble}>{m.data}</div>
                                        </div>
                                    ))}
                                    <div ref={chatEndRef} />
                                </div>
                                <form className={styles.composer} onSubmit={sendMessage}>
                                    <input className="input" placeholder="Send a message" value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={2000} />
                                    <button className="btn btn-primary" type="submit" aria-label="Send" disabled={!draft.trim()}><SendIcon fontSize="small" /></button>
                                </form>
                            </>
                        ) : (
                            <ul className={styles.people}>
                                <li><span className="avatar">{name.charAt(0).toUpperCase()}</span> {name} (You) {!micOn && <MicOffIcon fontSize="small" />}</li>
                                {others.map(([id, p]) => (
                                    <li key={id}><span className="avatar">{(p.name || "?").charAt(0).toUpperCase()}</span> {p.name} {!p.mic && <MicOffIcon fontSize="small" />}</li>
                                ))}
                            </ul>
                        )}
                    </aside>
                )}
            </div>

            <div className={styles.controls}>
                <button className={`${styles.roundBtn} ${!micOn ? styles.off : ""}`} onClick={toggleMic} aria-label="Toggle microphone" title="Microphone">{micOn ? <MicIcon /> : <MicOffIcon />}</button>
                <button className={`${styles.roundBtn} ${!camOn ? styles.off : ""}`} onClick={toggleCam} aria-label="Toggle camera" title="Camera">{camOn ? <VideocamIcon /> : <VideocamOffIcon />}</button>
                <button className={`${styles.roundBtn} ${sharing ? styles.active : ""}`} onClick={toggleShare} aria-label="Share screen" title="Share screen">{sharing ? <StopScreenShareIcon /> : <ScreenShareIcon />}</button>
                <button className={`${styles.roundBtn} ${panel === "chat" ? styles.active : ""}`} onClick={() => openPanel("chat")} aria-label="Chat" title="Chat">
                    <ChatIcon />{unread > 0 && <span className={styles.badge}>{unread > 99 ? "99+" : unread}</span>}
                </button>
                <button className={`${styles.roundBtn} ${panel === "people" ? styles.active : ""}`} onClick={() => openPanel("people")} aria-label="Participants" title="Participants"><PeopleIcon /></button>
                <button className={`${styles.roundBtn} ${styles.leave}`} onClick={leave} aria-label="Leave meeting" title="Leave"><CallEndIcon /></button>
            </div>
            <Toast text={toast} onDone={clearToast} />
        </div>
    );
}
