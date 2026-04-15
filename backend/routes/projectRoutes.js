import express from "express";
import multer from "multer";
import {
  createProject,
  getUserProjects,
  getAllProjects,
  getProjectById,
  updateProject,
  deleteProject,
  addMemberToProject,
  removeMemberFromProject,
  uploadVersion,
  getProjectVersions,
  getVersionById,
  compareVersions,
  deleteVersion,
  createProjectMessage,
  getProjectMessages,
  incrementDownloadCount,
  submitVersionChanges,
  getPendingChangeRequests,
  approveVersionChange,
  rejectVersionChange,
} from "../controllers/projectController.js";
import { authenticate } from "../middleware/auth.js";

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

const upload = multer({ storage });

const router = express.Router();

// Project routes
router.post("/", authenticate, createProject);
router.get("/user/:userId", authenticate, getUserProjects);
router.get("/", getAllProjects);
router.get("/:id", getProjectById);
router.put("/:id", authenticate, updateProject);
router.delete("/:id", authenticate, deleteProject);
router.put("/:id/add-member", authenticate, addMemberToProject);
router.put("/:id/remove-member", authenticate, removeMemberFromProject);

// Version routes
router.post(
  "/:id/versions",
  authenticate,
  upload.single("file"),
  uploadVersion,
);
router.get("/:id/versions", getProjectVersions);
router.get("/:id/versions/:versionId", getVersionById);
router.post("/:id/versions/compare", compareVersions);
router.delete("/:id/versions/:versionId", authenticate, deleteVersion);
router.post("/versions/:versionId/download", incrementDownloadCount);

// Change request routes (new workflow)
router.post(
  "/:id/submit-changes",
  authenticate,
  upload.single("file"),
  submitVersionChanges,
);
router.get("/:id/pending-changes", authenticate, getPendingChangeRequests);
router.put(
  "/:projectId/approve-change/:requestId",
  authenticate,
  approveVersionChange,
);
router.put(
  "/:projectId/reject-change/:requestId",
  authenticate,
  rejectVersionChange,
);

// Message routes
router.post("/:id/messages", authenticate, createProjectMessage);
router.get("/:id/messages", getProjectMessages);

export default router;
