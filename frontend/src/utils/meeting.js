// Meeting codes look like "abc-defg-hij" (easy to read out loud).
export const generateMeetingCode = () => {
    const letters = "abcdefghijkmnpqrstuvwxyz";
    const pick = (n) => Array.from({ length: n }, () => letters[Math.floor(Math.random() * letters.length)]).join("");
    return `${pick(3)}-${pick(4)}-${pick(3)}`;
};

// Accepts a bare code or a pasted meeting link and returns just the code.
export const parseMeetingCode = (input) => {
    const value = (input || "").trim();
    if (!value) return "";
    try {
        const url = new URL(value);
        return url.pathname.replace(/^\/+|\/+$/g, "");
    } catch {
        return value.replace(/^\/+|\/+$/g, "");
    }
};

export const meetingLink = (code) => `${window.location.origin}/${code}`;

export const formatDateTime = (value) =>
    new Date(value).toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
