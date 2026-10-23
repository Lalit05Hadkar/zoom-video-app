import * as React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import "../App.css";
import { AuthContext, errorMessage } from "../contexts/AuthContext";
import { Brand } from "../components/ui";

export default function Authentication() {
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const { handleRegister, handleLogin } = React.useContext(AuthContext);

    const [mode, setMode] = React.useState(params.get("mode") === "register" ? "register" : "login");
    const [name, setName] = React.useState("");
    const [username, setUsername] = React.useState("");
    const [password, setPassword] = React.useState("");
    const [showPw, setShowPw] = React.useState(false);
    const [error, setError] = React.useState("");
    const [info, setInfo] = React.useState("");
    const [busy, setBusy] = React.useState(false);

    const isLogin = mode === "login";

    React.useEffect(() => {
        if (localStorage.getItem("token")) navigate("/home", { replace: true });
    }, [navigate]);

    const switchMode = (next) => {
        setMode(next);
        setError("");
        setInfo("");
    };

    const submit = async (e) => {
        e.preventDefault();
        setError("");
        setInfo("");
        if (!username.trim() || !password || (!isLogin && !name.trim())) {
            setError("Please fill in all fields.");
            return;
        }
        if (!isLogin && password.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }
        setBusy(true);
        try {
            if (isLogin) {
                await handleLogin(username.trim(), password);
            } else {
                const message = await handleRegister(name.trim(), username.trim(), password);
                setInfo(message);
                setMode("login");
                setPassword("");
            }
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="auth-page">
            <aside className="auth-side">
                <Brand />
                <div>
                    <h2>Meet face to face, wherever you are.</h2>
                    <p>Create an account to start instant meetings, keep your meeting history and rejoin with one click.</p>
                </div>
                <small style={{ opacity: 0.7 }}>Guests can also join any meeting without an account.</small>
            </aside>

            <main className="auth-main">
                <form className="auth-card" onSubmit={submit} noValidate>
                    <h1>{isLogin ? "Welcome back" : "Create your account"}</h1>
                    <p className="sub">{isLogin ? "Sign in to continue to your meetings." : "It takes less than a minute."}</p>

                    <div className="tabs" role="tablist">
                        <button type="button" role="tab" className={isLogin ? "active" : ""} onClick={() => switchMode("login")}>Sign In</button>
                        <button type="button" role="tab" className={!isLogin ? "active" : ""} onClick={() => switchMode("register")}>Sign Up</button>
                    </div>

                    {error && <div className="alert alert-error" role="alert">{error}</div>}
                    {info && <div className="alert alert-success" role="status">{info}</div>}

                    {!isLogin && (
                        <div className="field">
                            <label htmlFor="name">Full name</label>
                            <input id="name" className="input" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" />
                        </div>
                    )}
                    <div className="field">
                        <label htmlFor="username">Username</label>
                        <input id="username" className="input" autoComplete="username" autoFocus value={username} onChange={(e) => setUsername(e.target.value)} placeholder="janedoe" />
                    </div>
                    <div className="field">
                        <label htmlFor="password">Password</label>
                        <div className="pw-wrap">
                            <input id="password" className="input" type={showPw ? "text" : "password"} autoComplete={isLogin ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={isLogin ? "Your password" : "At least 6 characters"} />
                            <button type="button" aria-label={showPw ? "Hide password" : "Show password"} onClick={() => setShowPw(!showPw)}>
                                {showPw ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                            </button>
                        </div>
                    </div>

                    <button type="submit" className="btn btn-primary btn-lg" style={{ width: "100%" }} disabled={busy}>
                        {busy ? "Please wait…" : isLogin ? "Sign in" : "Create account"}
                    </button>
                </form>
            </main>
        </div>
    );
}
