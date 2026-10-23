import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext";

// Guards a page: verifies the stored token with the server before rendering.
const withAuth = (WrappedComponent) => {
    const AuthComponent = (props) => {
        const navigate = useNavigate();
        const { fetchMe, clearSession } = useContext(AuthContext);
        const [ready, setReady] = useState(false);

        useEffect(() => {
            let cancelled = false;
            if (!localStorage.getItem("token")) {
                navigate("/auth", { replace: true });
                return;
            }
            fetchMe()
                .then(() => !cancelled && setReady(true))
                .catch((err) => {
                    // Only a rejected token logs the user out; a network blip should not.
                    if (err?.response?.status === 401) {
                        clearSession();
                        navigate("/auth", { replace: true });
                    } else if (!cancelled) {
                        setReady(true);
                    }
                });
            return () => { cancelled = true; };
        }, [fetchMe, clearSession, navigate]);

        if (!ready) return <div className="splash"><div className="spinner" /></div>;
        return <WrappedComponent {...props} />;
    };

    return AuthComponent;
};

export default withAuth;
