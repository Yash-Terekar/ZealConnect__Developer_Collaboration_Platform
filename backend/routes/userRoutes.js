import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import {
  getAllUsers,
  getSuggestions,
  searchUsers,
  updateUser,
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  updatePrivacy,
  getFriendRequests,
  acceptFriendRequest,
  rejectFriendRequest,
} from "../controllers/userController.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, "../uploads");

// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
const BLOCKED_EXTENSIONS = [
  ".exe",
  ".zip",
  ".rar",
  ".7z",
  ".tar",
  ".js",
  ".ts",
  ".jsx",
  ".tsx",
  ".java",
  ".py",
  ".rb",
  ".sql",
  ".sh",
  ".bat",
  ".cmd",
  ".com",
  ".msi",
  ".dll",
  ".so",
  ".o",
];

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  // Only allow image files for avatars
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return cb(
      new Error(
        "Only image files (JPG, PNG, GIF, WebP) are allowed for avatars",
      ),
    );
  }

  cb(null, true);
};

const upload = multer({ storage, fileFilter });

const router = express.Router();

router.get("/all/:excludeId", getAllUsers);
router.get("/suggestions/:userId", getSuggestions);
router.get("/search", searchUsers);
router.put("/:id", upload.single("avatar"), updateUser);
router.post("/:id/follow", followUser);
router.post("/:id/unfollow", unfollowUser);
router.get("/:id/followers", getFollowers);
router.get("/:id/following", getFollowing);
router.put("/:id/privacy", updatePrivacy);
router.get("/:id/friend-requests", getFriendRequests);
router.post("/:id/accept-friend-request", acceptFriendRequest);
router.post("/:id/reject-friend-request", rejectFriendRequest);

export default router;
