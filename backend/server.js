import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import mongoose from "mongoose";
import { fileURLToPath } from "url";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import postRoutes from "./routes/postRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import groupRoutes from "./routes/groupRoutes.js";
import projectRoutes from "./routes/projectRoutes.js";
import Message from "./models/Message.js";
import GroupMessage from "./models/GroupMessage.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

connectDB();

const app = express();
const httpServer = createServer(app);

// Build flexible CORS options from FRONTEND_URL env (comma-separated) or fallback list
const rawFrontend =
  process.env.FRONTEND_URL ||
  "http://localhost:5173,http://localhost:3000,http://10.130.76.37:3000";
const allowedOrigins =
  rawFrontend === "*"
    ? null
    : rawFrontend
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

// Helper to check origin allowed
const isOriginAllowed = (origin) => {
  // allow requests with no origin (curl, server-to-server)
  if (!origin) return true;
  // allow wildcard
  if (allowedOrigins === null) return true;
  // allow explicit list
  if (allowedOrigins.includes(origin)) return true;
  // allow Vercel preview/deployments if enabled or by default
  if (origin.endsWith(".vercel.app") || process.env.ALLOW_VERSEL === "true")
    return true;
  return false;
};

// CORS options for express (function-based origin)
const corsOptions = {
  origin: function (origin, callback) {
    const allowed = isOriginAllowed(origin);
    console.log("CORS check origin:", origin, "allowed:", allowed);
    callback(null, allowed);
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
};

// Socket.IO cors options (same origin check)
const ioCorsOptions = {
  origin: function (origin, callback) {
    const allowed = isOriginAllowed(origin);
    console.log("Socket CORS check origin:", origin, "allowed:", allowed);
    callback(null, allowed);
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
};

const io = new Server(httpServer, {
  cors: ioCorsOptions,
});

// Use express cors middleware
app.use(cors(corsOptions));

// Explicit middleware to set CORS headers for allowed origins (helps with some proxies)
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (isOriginAllowed(origin)) {
    res.header("Access-Control-Allow-Origin", origin || "*");
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization",
    );
  }
  // Handle preflight
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

// handle preflight for all routes (keep for compatibility)
app.options("*", cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/projects", projectRoutes);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "Server is running" });
});

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(err.status || 500).json({
    message: err.message || "Internal server error",
    errors: process.env.NODE_ENV === "development" ? err : {},
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

const onlineUsers = new Map();

io.on("connection", (socket) => {
  const userId = socket.handshake.query.userId;
  if (userId) {
    onlineUsers.set(userId, socket.id);
    console.log(`User ${userId} connected with socket ${socket.id}`);
  }

  socket.on("join_chat", (userId) => {
    socket.join(`chat_${userId}`);
    console.log(`User joined chat: chat_${userId}`);
  });

  socket.on("leave_chat", (userId) => {
    socket.leave(`chat_${userId}`);
  });

  socket.on("send_message", async (data) => {
    try {
      // Save to DB
      const newMsg = await Message.create({
        sender: data.senderId,
        receiver: data.receiverId,
        content: data.content,
      });
      const populated = await newMsg.populate(
        ["sender", "receiver"],
        "name avatar",
      );

      // Emit to receiver
      const receiverSocketId = onlineUsers.get(data.receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("receive_message", populated);
      }

      // Emit back to sender
      if (onlineUsers.get(data.senderId)) {
        io.to(onlineUsers.get(data.senderId)).emit(
          "receive_message",
          populated,
        );
      }

      // Update chats for both
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("chat_update", {
          senderId: data.senderId,
        });
      }
      if (onlineUsers.get(data.senderId)) {
        io.to(onlineUsers.get(data.senderId)).emit("chat_update", {
          senderId: data.receiverId,
        });
      }
    } catch (error) {
      console.error("Error sending message:", error);
      socket.emit("error", { message: "Failed to send message" });
    }
  });

  socket.on("join_project", (projectId) => {
    socket.join(`project_${projectId}`);
    console.log(`User joined project: project_${projectId}`);
  });

  socket.on("leave_project", (projectId) => {
    socket.leave(`project_${projectId}`);
  });

  socket.on("send_project_message", async (messageData) => {
    try {
      const projectId = messageData.project.toString();
      console.log(`Broadcasting project message to room: project_${projectId}`);
      io.to(`project_${projectId}`).emit(
        "receive_project_message",
        messageData,
      );
    } catch (error) {
      console.error("Error broadcasting project message:", error);
      socket.emit("error", {
        message: "Failed to broadcast project message",
      });
    }
  });

  socket.on("version_uploaded", async (versionData) => {
    try {
      const projectId = versionData.project.toString();
      console.log(`Broadcasting version upload to project_${projectId}`);
      io.to(`project_${projectId}`).emit("version_update", versionData);
    } catch (error) {
      console.error("Error broadcasting version upload:", error);
    }
  });

  socket.on("join_group", (groupId) => {
    socket.join(`group_${groupId}`);
    console.log(`User joined group: group_${groupId}`);
  });

  socket.on("leave_group", (groupId) => {
    socket.leave(`group_${groupId}`);
  });

  socket.on("send_group_message", async (messageData) => {
    try {
      // Message is already created by the API, just broadcast it
      const groupId = messageData.group.toString();
      console.log(`Broadcasting group message to room: group_${groupId}`);
      io.to(`group_${groupId}`).emit("receive_group_message", messageData);
      console.log("Group message broadcasted:", messageData);
    } catch (error) {
      console.error("Error broadcasting group message:", error);
      socket.emit("error", { message: "Failed to broadcast group message" });
    }
  });

  socket.on("disconnect", () => {
    if (userId) {
      onlineUsers.delete(userId);
      console.log(`User ${userId} disconnected`);
    }
  });
});

const PORT = process.env.PORT || 1234;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
