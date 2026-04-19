import Message from "../models/Message.js";
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import {
  getMessages,
  createMessage,
  getChats,
  deleteMessage,
  deleteConversation,
} from "../controllers/messageController.js";
import { storage } from "../config/cloudinary.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, "../uploads");

// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const upload = multer({ storage });

const router = express.Router();

router.get("/chats/:userId", getChats);
router.get("/:userId/:otherId", getMessages);
router.post("/", upload.single("media"), createMessage);
router.delete("/:messageId", deleteMessage);
router.delete("/conversation/:userId/:otherId", deleteConversation);

export default router;
