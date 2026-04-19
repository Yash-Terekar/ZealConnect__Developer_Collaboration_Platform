import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import {
  createPost,
  getPosts,
  getUserPosts,
  likePost,
  addComment,
  deleteComment,
} from "../controllers/postController.js";
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

router.post("/", upload.single("media"), createPost);
router.get("/", getPosts);
router.get("/user/:userId", getUserPosts);
router.put("/:id/like", likePost);
router.post("/:id/comment", addComment);
router.delete("/:id/comment/:commentId", deleteComment);

export default router;
