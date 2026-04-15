import Project from "../models/Project.js";
import ProjectVersion from "../models/ProjectVersion.js";
import ProjectMessage from "../models/ProjectMessage.js";
import VersionChangeRequest from "../models/VersionChangeRequest.js";
import mongoose from "mongoose";

// ============ PROJECT CONTROLLERS ============

export const createProject = async (req, res) => {
  try {
    const { title, description } = req.body;
    const userId = req.user._id;

    if (!title) {
      return res.status(400).json({ message: "Project title required" });
    }

    const project = await Project.create({
      title,
      description: description || "",
      createdBy: userId,
      members: [userId],
      versionCount: 0,
    });

    await project.populate("createdBy", "name avatar");
    await project.populate("members", "name avatar");

    res.status(201).json(project);
  } catch (error) {
    console.error("Error creating project:", error);
    res.status(500).json({ message: "Error creating project" });
  }
};

export const getUserProjects = async (req, res) => {
  try {
    const { userId } = req.params;

    const projects = await Project.find({
      $or: [{ createdBy: userId }, { members: userId }],
    })
      .populate("createdBy", "name avatar")
      .populate("members", "name avatar")
      .sort({ createdAt: -1 });

    res.json(projects);
  } catch (error) {
    console.error("Error fetching projects:", error);
    res.status(500).json({ message: "Error fetching projects" });
  }
};

export const getAllProjects = async (req, res) => {
  try {
    const projects = await Project.find({ isPublic: true })
      .populate("createdBy", "name avatar")
      .populate("members", "name avatar")
      .sort({ createdAt: -1 });

    res.json(projects);
  } catch (error) {
    console.error("Error fetching all projects:", error);
    res.status(500).json({ message: "Error fetching projects" });
  }
};

export const getProjectById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid project ID" });
    }

    const project = await Project.findById(id)
      .populate("createdBy", "name avatar")
      .populate("members", "name avatar");

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    res.json(project);
  } catch (error) {
    console.error("Error fetching project:", error);
    res.status(500).json({ message: "Error fetching project" });
  }
};

export const updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, isPublic } = req.body;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid project ID" });
    }

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Only creator can update project
    if (project.createdBy.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ message: "Only project creator can update it" });
    }

    if (title) project.title = title;
    if (description !== undefined) project.description = description;
    if (isPublic !== undefined) project.isPublic = isPublic;

    await project.save();
    await project.populate("createdBy", "name avatar");
    await project.populate("members", "name avatar");

    res.json(project);
  } catch (error) {
    console.error("Error updating project:", error);
    res.status(500).json({ message: "Error updating project" });
  }
};

export const deleteProject = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid project ID" });
    }

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Only creator can delete
    if (project.createdBy.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ message: "Only project creator can delete it" });
    }

    // Delete all versions and messages
    await ProjectVersion.deleteMany({ project: id });
    await ProjectMessage.deleteMany({ project: id });
    await VersionChangeRequest.deleteMany({ project: id });
    await Project.findByIdAndDelete(id);

    res.json({ message: "Project deleted successfully" });
  } catch (error) {
    console.error("Error deleting project:", error);
    res.status(500).json({ message: "Error deleting project" });
  }
};

export const addMemberToProject = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    const requesterId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid project ID" });
    }

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Only creator can add members
    if (project.createdBy.toString() !== requesterId.toString()) {
      return res
        .status(403)
        .json({ message: "Only project creator can add members" });
    }

    // Check if already a member
    if (project.members.some((m) => m.toString() === userId)) {
      return res.status(400).json({ message: "User is already a member" });
    }

    project.members.push(userId);
    await project.save();
    await project.populate("createdBy", "name avatar");
    await project.populate("members", "name avatar");

    res.json(project);
  } catch (error) {
    console.error("Error adding member:", error);
    res.status(500).json({ message: "Error adding member" });
  }
};

export const removeMemberFromProject = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    const requesterId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid project ID" });
    }

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Only creator can remove members
    if (project.createdBy.toString() !== requesterId.toString()) {
      return res
        .status(403)
        .json({ message: "Only project creator can remove members" });
    }

    project.members = project.members.filter((m) => m.toString() !== userId);
    await project.save();
    await project.populate("createdBy", "name avatar");
    await project.populate("members", "name avatar");

    res.json(project);
  } catch (error) {
    console.error("Error removing member:", error);
    res.status(500).json({ message: "Error removing member" });
  }
};

// ============ PROJECT VERSION CONTROLLERS ============

export const uploadVersion = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    const userId = req.user._id;

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid project ID" });
    }

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Check if user is a member
    if (!project.members.some((m) => m.toString() === userId.toString())) {
      return res
        .status(403)
        .json({ message: "You are not a member of this project" });
    }

    // Create new version
    const newVersionNumber = project.versionCount + 1;
    const backendUrl = process.env.BACKEND_URL || "http://localhost:1234";
    const fileUrl = `${backendUrl}/uploads/${req.file.filename}`;

    const version = await ProjectVersion.create({
      project: id,
      versionNumber: newVersionNumber,
      uploadedBy: userId,
      fileName: req.file.originalname,
      fileUrl,
      fileSize: Math.round(req.file.size / 1024), // KB
      fileMimeType: req.file.mimetype,
      message: message || `Version ${newVersionNumber} uploaded`,
    });

    // Update project version count
    project.versionCount = newVersionNumber;
    project.latestVersionId = version._id.toString();
    await project.save();

    // Create auto message
    await ProjectMessage.create({
      project: id,
      sender: userId,
      content: `🚀 Version ${newVersionNumber}: ${message || "No message"}`,
      messageType: "version_upload",
      versionId: version._id,
    });

    await version.populate("uploadedBy", "name avatar");
    res.status(201).json(version);
  } catch (error) {
    console.error("Error uploading version:", error);
    res.status(500).json({ message: "Error uploading version" });
  }
};

export const getProjectVersions = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid project ID" });
    }

    const versions = await ProjectVersion.find({ project: id })
      .populate("uploadedBy", "name avatar")
      .sort({ versionNumber: -1 });

    res.json(versions);
  } catch (error) {
    console.error("Error fetching versions:", error);
    res.status(500).json({ message: "Error fetching versions" });
  }
};

export const getVersionById = async (req, res) => {
  try {
    const { id, versionId } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(id) ||
      !mongoose.Types.ObjectId.isValid(versionId)
    ) {
      return res.status(400).json({ message: "Invalid IDs" });
    }

    const version = await ProjectVersion.findOne({
      _id: versionId,
      project: id,
    }).populate("uploadedBy", "name avatar");

    if (!version) {
      return res.status(404).json({ message: "Version not found" });
    }

    res.json(version);
  } catch (error) {
    console.error("Error fetching version:", error);
    res.status(500).json({ message: "Error fetching version" });
  }
};

export const compareVersions = async (req, res) => {
  try {
    const { id } = req.params;
    const { versionId1, versionId2 } = req.body;

    if (
      !mongoose.Types.ObjectId.isValid(id) ||
      !mongoose.Types.ObjectId.isValid(versionId1) ||
      !mongoose.Types.ObjectId.isValid(versionId2)
    ) {
      return res.status(400).json({ message: "Invalid IDs" });
    }

    const [version1, version2] = await Promise.all([
      ProjectVersion.findOne({ _id: versionId1, project: id }).populate(
        "uploadedBy",
        "name avatar",
      ),
      ProjectVersion.findOne({ _id: versionId2, project: id }).populate(
        "uploadedBy",
        "name avatar",
      ),
    ]);

    if (!version1 || !version2) {
      return res
        .status(404)
        .json({ message: "One or both versions not found" });
    }

    // Return comparison metadata
    res.json({
      version1: {
        versionNumber: version1.versionNumber,
        fileName: version1.fileName,
        fileSize: version1.fileSize,
        uploadedBy: version1.uploadedBy,
        message: version1.message,
        createdAt: version1.createdAt,
      },
      version2: {
        versionNumber: version2.versionNumber,
        fileName: version2.fileName,
        fileSize: version2.fileSize,
        uploadedBy: version2.uploadedBy,
        message: version2.message,
        createdAt: version2.createdAt,
      },
    });
  } catch (error) {
    console.error("Error comparing versions:", error);
    res.status(500).json({ message: "Error comparing versions" });
  }
};

export const deleteVersion = async (req, res) => {
  try {
    const { id, versionId } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid project ID" });
    }

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Only creator can delete versions
    if (project.createdBy.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ message: "Only project creator can delete versions" });
    }

    const version = await ProjectVersion.findOneAndDelete({
      _id: versionId,
      project: id,
    });

    if (!version) {
      return res.status(404).json({ message: "Version not found" });
    }

    // Delete associated message
    await ProjectMessage.findOneAndDelete({
      project: id,
      versionId,
      messageType: "version_upload",
    });

    res.json({ message: "Version deleted successfully" });
  } catch (error) {
    console.error("Error deleting version:", error);
    res.status(500).json({ message: "Error deleting version" });
  }
};

// ============ PROJECT MESSAGE CONTROLLERS ============

export const createProjectMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid project ID" });
    }

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    if (!content) {
      return res.status(400).json({ message: "Message content required" });
    }

    const message = await ProjectMessage.create({
      project: id,
      sender: userId,
      content,
      messageType: "text",
    });

    await message.populate("sender", "name avatar");
    res.status(201).json(message);
  } catch (error) {
    console.error("Error creating message:", error);
    res.status(500).json({ message: "Error creating message" });
  }
};

export const getProjectMessages = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid project ID" });
    }

    const messages = await ProjectMessage.find({ project: id })
      .populate("sender", "name avatar")
      .populate("versionId")
      .sort({ createdAt: 1 });

    res.json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ message: "Error fetching messages" });
  }
};

export const incrementDownloadCount = async (req, res) => {
  try {
    const { versionId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(versionId)) {
      return res.status(400).json({ message: "Invalid version ID" });
    }

    const version = await ProjectVersion.findByIdAndUpdate(
      versionId,
      { $inc: { downloadCount: 1 } },
      { new: true },
    );

    if (!version) {
      return res.status(404).json({ message: "Version not found" });
    }

    res.json({ message: "Download count incremented", version });
  } catch (error) {
    console.error("Error incrementing download count:", error);
    res.status(500).json({ message: "Error incrementing download count" });
  }
};

// ============ VERSION CHANGE REQUEST CONTROLLERS ============

export const submitVersionChanges = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    const userId = req.user._id;

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid project ID" });
    }

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Check if user is a member
    if (!project.members.some((m) => m.toString() === userId.toString())) {
      return res
        .status(403)
        .json({ message: "You are not a member of this project" });
    }

    const backendUrl = process.env.BACKEND_URL || "http://localhost:1234";
    const fileUrl = `${backendUrl}/uploads/${req.file.filename}`;
    const nextVersionNumber = project.versionCount + 1;

    const changeRequest = await VersionChangeRequest.create({
      project: id,
      submittedBy: userId,
      fileName: req.file.originalname,
      fileUrl,
      fileSize: Math.round(req.file.size / 1024),
      fileMimeType: req.file.mimetype,
      message: message || `Version ${nextVersionNumber} submitted for review`,
      nextVersionNumber,
    });

    await changeRequest.populate("submittedBy", "name avatar");

    // Create notification message
    await ProjectMessage.create({
      project: id,
      sender: userId,
      content: `📝 Change request submitted: ${message || "No description"}`,
      messageType: "text",
    });

    res.status(201).json(changeRequest);
  } catch (error) {
    console.error("Error submitting changes:", error);
    res.status(500).json({ message: "Error submitting changes" });
  }
};

export const getPendingChangeRequests = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid project ID" });
    }

    const requests = await VersionChangeRequest.find({
      project: id,
      status: "pending",
    })
      .populate("submittedBy", "name avatar")
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (error) {
    console.error("Error fetching pending requests:", error);
    res.status(500).json({ message: "Error fetching pending requests" });
  }
};

export const approveVersionChange = async (req, res) => {
  try {
    const { projectId, requestId } = req.params;
    const adminId = req.user._id;

    if (
      !mongoose.Types.ObjectId.isValid(projectId) ||
      !mongoose.Types.ObjectId.isValid(requestId)
    ) {
      return res.status(400).json({ message: "Invalid IDs" });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Only creator can approve
    if (project.createdBy.toString() !== adminId.toString()) {
      return res
        .status(403)
        .json({ message: "Only project creator can approve changes" });
    }

    const changeRequest = await VersionChangeRequest.findById(requestId);
    if (!changeRequest) {
      return res.status(404).json({ message: "Change request not found" });
    }

    if (changeRequest.status !== "pending") {
      return res
        .status(400)
        .json({ message: "This change request has already been processed" });
    }

    // Create the actual version
    const version = await ProjectVersion.create({
      project: projectId,
      versionNumber: changeRequest.nextVersionNumber,
      uploadedBy: changeRequest.submittedBy,
      fileName: changeRequest.fileName,
      fileUrl: changeRequest.fileUrl,
      fileSize: changeRequest.fileSize,
      fileMimeType: changeRequest.fileMimeType,
      message: changeRequest.message,
    });

    // Update change request status
    changeRequest.status = "approved";
    changeRequest.approvedBy = adminId;
    await changeRequest.save();

    // Update project
    project.versionCount = changeRequest.nextVersionNumber;
    project.latestVersionId = version._id.toString();
    await project.save();

    // Create approval message
    await ProjectMessage.create({
      project: projectId,
      sender: adminId,
      content: `✅ Version ${version.versionNumber} approved and released: ${changeRequest.message}`,
      messageType: "version_upload",
      versionId: version._id,
    });

    await version.populate("uploadedBy", "name avatar");

    res.json({
      message: "Version approved and released",
      version,
    });
  } catch (error) {
    console.error("Error approving version:", error);
    res.status(500).json({ message: "Error approving version" });
  }
};

export const rejectVersionChange = async (req, res) => {
  try {
    const { projectId, requestId } = req.params;
    const { reason } = req.body;
    const adminId = req.user._id;

    if (
      !mongoose.Types.ObjectId.isValid(projectId) ||
      !mongoose.Types.ObjectId.isValid(requestId)
    ) {
      return res.status(400).json({ message: "Invalid IDs" });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Only creator can reject
    if (project.createdBy.toString() !== adminId.toString()) {
      return res
        .status(403)
        .json({ message: "Only project creator can reject changes" });
    }

    const changeRequest = await VersionChangeRequest.findById(requestId);
    if (!changeRequest) {
      return res.status(404).json({ message: "Change request not found" });
    }

    if (changeRequest.status !== "pending") {
      return res
        .status(400)
        .json({ message: "This change request has already been processed" });
    }

    // Update change request status
    changeRequest.status = "rejected";
    changeRequest.rejectionReason = reason || "No reason provided";
    await changeRequest.save();

    // Create rejection message
    await ProjectMessage.create({
      project: projectId,
      sender: adminId,
      content: `❌ Version rejected: ${reason || "No reason provided"}`,
      messageType: "text",
    });

    res.json({
      message: "Version rejected",
      changeRequest,
    });
  } catch (error) {
    console.error("Error rejecting version:", error);
    res.status(500).json({ message: "Error rejecting version" });
  }
};
