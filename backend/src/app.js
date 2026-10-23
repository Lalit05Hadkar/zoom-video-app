import express from "express";
import { createServer } from "node:http";
import dns from "node:dns";

try {
    dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (e) {
    // DNS server override not permitted
}

import { Server } from "socket.io";

import mongoose from "mongoose";
import { connectToSocket } from "./controllers/socketManager.js";

import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import userRoutes from "./routes/users.routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const io = connectToSocket(server);


app.set("port", (process.env.PORT || 8000))
app.use(cors());
app.use(express.json({ limit: "40kb" }));
app.use(express.urlencoded({ limit: "40kb", extended: true }));

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
    app.set("mongo_user")
    const mongoUri = process.env.MONGO_URI || process.env.MONGO_URL || "mongodb+srv://imdigitalashish:imdigitalashish@cluster0.cujabk4.mongodb.net/";
    const connectionDb = await mongoose.connect(mongoUri)

    console.log(`MONGO Connected DB HOst: ${connectionDb.connection.host}`)
    server.listen(app.get("port"), () => {
        console.log("LISTENIN ON PORT 8000")
    });



}



start();