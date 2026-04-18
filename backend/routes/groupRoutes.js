import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import {
  createGroup,
  getUserGroups,
  getAllGroups,
  requestJoinGroup,
  acceptJoinRequest,
  rejectJoinRequest,
  getGroupMessages,
  createGroupMessage,
  leaveGroup,
  promoteToAdmin,
  demoteFromAdmin,
  removeFromGroup,
  addMembersToGroup,
} from "../controllers/groupController.js";
import { authenticate } from "../middleware/auth.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, "../uploads");

// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

const upload = multer({ storage });

const router = express.Router();

router.post("/", authenticate, createGroup);
router.get("/user/:userId", authenticate, getUserGroups);
router.get("/", getAllGroups);
router.get("/:groupId/messages", getGroupMessages);
router.post(
  "/message",
  authenticate,
  upload.single("media"),
  createGroupMessage,
);
router.put("/:id/request-join", authenticate, requestJoinGroup);
router.put("/:id/accept-request", authenticate, acceptJoinRequest);
router.put("/:id/reject-request", authenticate, rejectJoinRequest);
router.put("/:id/leave", authenticate, leaveGroup);
router.put("/:id/promote-admin", authenticate, promoteToAdmin);
router.put("/:id/demote-admin", authenticate, demoteFromAdmin);
router.put("/:id/remove-member", authenticate, removeFromGroup);
router.put("/:id/add-members", authenticate, addMembersToGroup);

export default router;
