import Message from "../models/Message.js";
import express from "express";
import multer from "multer";
import {
  getMessages,
  createMessage,
  getChats,
  deleteMessage,
  deleteConversation,
} from "../controllers/messageController.js";

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

const upload = multer({ storage });

const router = express.Router();

router.get("/chats/:userId", getChats);
router.get("/:userId/:otherId", getMessages);
router.post("/", upload.single("media"), createMessage);
router.delete("/:messageId", deleteMessage);
router.delete("/conversation/:userId/:otherId", deleteConversation);

export default router;
