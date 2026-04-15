import Group from "../models/Group.js";
import GroupMessage from "../models/GroupMessage.js";
import mongoose from "mongoose";

// Helper function to check if user is admin
const isUserAdmin = (group, userId) => {
  return (
    group.createdBy.toString() === userId.toString() ||
    group.admins.some((admin) => admin.toString() === userId.toString())
  );
};

export const createGroup = async (req, res) => {
  const { name, description, createdBy } = req.body;
  if (!name || !createdBy)
    return res.status(400).json({ message: "Name and creator required" });
  const group = await Group.create({
    name,
    description,
    createdBy,
    admins: [createdBy],
    members: [createdBy],
  });
  res.status(201).json(group);
};

export const getUserGroups = async (req, res) => {
  const { userId } = req.params;
  const groups = await Group.find({ members: userId })
    .populate("createdBy", "name avatar")
    .populate("admins", "name avatar")
    .populate("members", "name avatar");
  res.json(groups);
};

export const getAllGroups = async (req, res) => {
  const groups = await Group.find()
    .populate("createdBy", "name avatar")
    .populate("admins", "name avatar")
    .populate("members", "name avatar")
    .populate("joinRequests", "name avatar");
  res.json(groups);
};

export const requestJoinGroup = async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;
  if (!userId) {
    return res.status(401).json({ message: "User not authenticated" });
  }
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid group ID" });
  }
  const group = await Group.findById(id);
  if (!group) return res.status(404).json({ message: "Group not found" });

  // Check if user is already a member
  if (group.members.some((member) => member.toString() === userId)) {
    return res.status(400).json({ message: "Already a member of this group" });
  }

  // Check if join request already exists
  if (group.joinRequests.some((request) => request.toString() === userId)) {
    return res.status(400).json({ message: "Join request already sent" });
  }

  group.joinRequests.push(userId);
  await group.save();
  res.json({ message: "Join request sent successfully" });
};

export const acceptJoinRequest = async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;
  const adminId = req.user._id;
  const group = await Group.findById(id);
  if (!group) return res.status(404).json({ message: "Group not found" });

  // Only group admins can accept requests
  if (!isUserAdmin(group, adminId)) {
    return res
      .status(403)
      .json({ message: "Only group admins can accept join requests" });
  }

  // Check if user has a pending request
  if (!group.joinRequests.some((request) => request.toString() === userId)) {
    return res
      .status(400)
      .json({ message: "No join request found for this user" });
  }

  // Remove from requests and add to members
  group.joinRequests = group.joinRequests.filter(
    (r) => r.toString() !== userId,
  );
  if (!group.members.some((member) => member.toString() === userId)) {
    group.members.push(userId);
  }
  await group.save();
  res.json({ message: "Join request accepted" });
};

export const rejectJoinRequest = async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;
  const adminId = req.user._id;
  const group = await Group.findById(id);
  if (!group) return res.status(404).json({ message: "Group not found" });

  // Only group admins can reject requests
  if (!isUserAdmin(group, adminId)) {
    return res
      .status(403)
      .json({ message: "Only group admins can reject join requests" });
  }

  // Check if user has a pending request
  if (!group.joinRequests.some((request) => request.toString() === userId)) {
    return res
      .status(400)
      .json({ message: "No join request found for this user" });
  }

  // Remove from requests
  group.joinRequests = group.joinRequests.filter(
    (r) => r.toString() !== userId,
  );
  await group.save();
  res.json({ message: "Join request rejected" });
};

export const getGroupMessages = async (req, res) => {
  const { groupId } = req.params;
  const messages = await GroupMessage.find({ group: groupId })
    .populate("sender", "name avatar")
    .sort({ createdAt: 1 });
  res.json(messages);
};

export const createGroupMessage = async (req, res) => {
  const { senderId, groupId, content } = req.body;

  if (!senderId || !groupId || (!content && !req.file)) {
    return res.status(400).json({ message: "Content or file required" });
  }

  const senderObjectId = mongoose.Types.ObjectId.isValid(senderId)
    ? new mongoose.Types.ObjectId(senderId)
    : senderId;
  const groupObjectId = mongoose.Types.ObjectId.isValid(groupId)
    ? new mongoose.Types.ObjectId(groupId)
    : groupId;

  const messageData = {
    sender: senderObjectId,
    group: groupObjectId,
    content: content || "",
  };

  if (req.file) {
    const backendUrl = process.env.BACKEND_URL || "http://localhost:1234";
    messageData.mediaUrl = `${backendUrl}/uploads/${req.file.filename}`;
    messageData.mediaType = req.file.mimetype.startsWith("video")
      ? "video"
      : req.file.mimetype.startsWith("image")
        ? "image"
        : "file";
  }

  const message = await GroupMessage.create(messageData);
  const populated = await message.populate("sender", "name avatar");
  res.status(201).json(populated);
};

export const leaveGroup = async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;
  const group = await Group.findById(id);
  if (!group) return res.status(404).json({ message: "Group not found" });
  group.members = group.members.filter((m) => m.toString() !== userId);
  // Also remove from admins if they were an admin
  group.admins = group.admins.filter((a) => a.toString() !== userId);
  await group.save();
  res.json({ message: "Left group successfully" });
};

export const promoteToAdmin = async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;
  const adminId = req.user._id;
  const group = await Group.findById(id);
  if (!group) return res.status(404).json({ message: "Group not found" });

  // Only group admins can promote users
  if (!isUserAdmin(group, adminId)) {
    return res
      .status(403)
      .json({ message: "Only group admins can promote users" });
  }

  // Check if user is a member
  if (!group.members.some((member) => member.toString() === userId)) {
    return res
      .status(400)
      .json({ message: "User is not a member of this group" });
  }

  // Check if user is already an admin
  if (group.admins.some((admin) => admin.toString() === userId)) {
    return res.status(400).json({ message: "User is already an admin" });
  }

  // Add to admins
  group.admins.push(userId);
  await group.save();
  res.json({ message: "User promoted to admin successfully" });
};

export const demoteFromAdmin = async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;
  const adminId = req.user._id;
  const group = await Group.findById(id);
  if (!group) return res.status(404).json({ message: "Group not found" });

  // Only group admins can demote users
  if (!isUserAdmin(group, adminId)) {
    return res
      .status(403)
      .json({ message: "Only group admins can demote users" });
  }

  // Cannot demote the group creator
  if (group.createdBy.toString() === userId) {
    return res.status(400).json({ message: "Cannot demote the group creator" });
  }

  // Check if user is an admin
  if (!group.admins.some((admin) => admin.toString() === userId)) {
    return res.status(400).json({ message: "User is not an admin" });
  }

  // Remove from admins
  group.admins = group.admins.filter((a) => a.toString() !== userId);
  await group.save();
  res.json({ message: "User demoted from admin successfully" });
};

export const removeFromGroup = async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;
  const adminId = req.user._id;
  const group = await Group.findById(id);
  if (!group) return res.status(404).json({ message: "Group not found" });

  // Only group admins can remove users
  if (!isUserAdmin(group, adminId)) {
    return res
      .status(403)
      .json({ message: "Only group admins can remove users" });
  }

  // Cannot remove the group creator
  if (group.createdBy.toString() === userId) {
    return res.status(400).json({ message: "Cannot remove the group creator" });
  }

  // Check if user is a member
  if (!group.members.some((member) => member.toString() === userId)) {
    return res
      .status(400)
      .json({ message: "User is not a member of this group" });
  }

  // Remove from members and admins
  group.members = group.members.filter((m) => m.toString() !== userId);
  group.admins = group.admins.filter((a) => a.toString() !== userId);
  await group.save();
  res.json({ message: "User removed from group successfully" });
};

export const addMembersToGroup = async (req, res) => {
  const { id } = req.params;
  const { userIds } = req.body;
  const adminId = req.user._id;

  if (!Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({ message: "No members selected to add" });
  }

  const group = await Group.findById(id);
  if (!group) return res.status(404).json({ message: "Group not found" });

  if (!isUserAdmin(group, adminId)) {
    return res
      .status(403)
      .json({ message: "Only group admins can add members" });
  }

  const newMemberIds = userIds.filter(
    (userId) =>
      mongoose.Types.ObjectId.isValid(userId) &&
      !group.members.some((member) => member.toString() === userId),
  );

  if (newMemberIds.length === 0) {
    return res
      .status(400)
      .json({ message: "Selected users are already group members" });
  }

  group.members.push(...newMemberIds);
  await group.save();
  res.json({ message: "Members added to group successfully" });
};
