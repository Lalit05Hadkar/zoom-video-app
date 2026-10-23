import express from "express";
import { createServer } from "node:http";
import dns from "node:dns";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { connectToSocket } from "./controllers/socketManager.js";
import { initDb } from "./db.js";
import userRoutes from "./routes/users.routes.js";

try {
    dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (e) {
    // DNS server override not permitted
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const server = createServer(app);
connectToSocket(server);

app.set("port", process.env.PORT || 8000);
app.use(cors());
app.use(express.json({ limit: "40kb" }));
app.use(express.urlencoded({ limit: "40kb", extended: true }));

app.get("/api/health", (req, res) => res.json({ ok: true }));
app.use("/api/v1/users", userRoutes);

// Serve frontend build if available (single service production deployment)
const frontendBuildPath = path.resolve(__dirname, "../../frontend/build");
app.use(express.static(frontendBuildPath));
app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/")) return next();
    res.sendFile(path.join(frontendBuildPath, "index.html"), (err) => {
        if (err) next();
    });
});

const start = async () => {
    await initDb();
    server.listen(app.get("port"), () => {
        console.log(`Listening on port ${app.get("port")}`);
    });
};

start();
