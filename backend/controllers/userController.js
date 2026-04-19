import User from "../models/User.js";
import mongoose from "mongoose";
import path from "path";

export const getAllUsers = async (req, res) => {
  const { excludeId } = req.params;
  const users = await User.find({ _id: { $ne: excludeId } }).select(
    "-password",
  );
  res.json(users);
};

export const getSuggestions = async (req, res) => {
  const { userId } = req.params;
  const users = await User.find({ _id: { $ne: userId } })
    .select("-password")
    .limit(6);
  res.json(users);
};

export const searchUsers = async (req, res) => {
  const { q } = req.query;
  if (!q) return res.json([]);
  const users = await User.find({ name: { $regex: q, $options: "i" } })
    .select("-password")
    .limit(8);
  res.json(users);
};

export const updateUser = async (req, res) => {
  const { id } = req.params;
  if (!id || id === "undefined") {
    return res.status(400).json({ message: "Invalid user ID" });
  }
  const { name, bio, isPrivate } = req.body;
  const update = {};
  if (name) update.name = name;
  if (bio !== undefined) update.bio = bio;
  if (isPrivate !== undefined) update.isPrivate = isPrivate;
  if (req.file) {
    const url = req.file.path || req.file.secure_url || req.file.url;
    if (!url) return res.status(500).json({ message: "Upload failed" });
    update.avatar = url;
  }
  const user = await User.findByIdAndUpdate(id, update, { new: true }).select(
    "-password",
  );
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json(user);
};

export const followUser = async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;

  if (!userId || !id) {
    return res.status(400).json({ message: "User ID and ID required" });
  }

  if (userId === id) {
    return res.status(400).json({ message: "Cannot follow yourself" });
  }

  const userObjectId = mongoose.Types.ObjectId.isValid(userId)
    ? new mongoose.Types.ObjectId(userId)
    : userId;
  const targetObjectId = mongoose.Types.ObjectId.isValid(id)
    ? new mongoose.Types.ObjectId(id)
    : id;

  // First, check if the target user is private
  const targetUser = await User.findById(targetObjectId);
  if (!targetUser) {
    return res.status(404).json({ message: "User not found" });
  }

  if (targetUser.isPrivate) {
    // Send friend request instead of direct follow
    const updatedTargetUser = await User.findByIdAndUpdate(
      targetObjectId,
      { $addToSet: { friendRequests: userObjectId } },
      { new: true },
    ).select("-password");

    res.json({ message: "Friend request sent", user: updatedTargetUser });
  } else {
    // Direct follow for public accounts
    const currentUser = await User.findByIdAndUpdate(
      userObjectId,
      { $addToSet: { following: targetObjectId } },
      { new: true },
    ).select("-password");

    const updatedTargetUser = await User.findByIdAndUpdate(
      targetObjectId,
      { $addToSet: { followers: userObjectId } },
      { new: true },
    ).select("-password");

    if (!currentUser) {
      return res.status(404).json({ message: "Current user not found" });
    }

    res.json({ message: "Followed successfully", user: currentUser });
  }
};

export const unfollowUser = async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;

  if (!userId || !id) {
    return res.status(400).json({ message: "User ID and ID required" });
  }

  const userObjectId = mongoose.Types.ObjectId.isValid(userId)
    ? new mongoose.Types.ObjectId(userId)
    : userId;
  const targetObjectId = mongoose.Types.ObjectId.isValid(id)
    ? new mongoose.Types.ObjectId(id)
    : id;

  const currentUser = await User.findByIdAndUpdate(
    userObjectId,
    { $pull: { following: targetObjectId } },
    { new: true },
  ).select("-password");

  const targetUser = await User.findByIdAndUpdate(
    targetObjectId,
    { $pull: { followers: userObjectId } },
    { new: true },
  ).select("-password");

  if (!currentUser || !targetUser) {
    return res.status(404).json({ message: "User not found" });
  }

  res.json({ message: "Unfollowed successfully", user: currentUser });
};

export const getFollowers = async (req, res) => {
  const { id } = req.params;
  const user = await User.findById(id)
    .populate("followers", "-password")
    .select("followers");
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json(user.followers);
};

export const getFollowing = async (req, res) => {
  const { id } = req.params;
  const user = await User.findById(id)
    .populate("following", "-password")
    .select("following");
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json(user.following);
};

export const updatePrivacy = async (req, res) => {
  const { id } = req.params;
  const { isPrivate } = req.body;

  const user = await User.findByIdAndUpdate(
    id,
    { isPrivate },
    { new: true },
  ).select("-password");

  if (!user) return res.status(404).json({ message: "User not found" });
  res.json(user);
};

export const getFriendRequests = async (req, res) => {
  const { id } = req.params;
  const user = await User.findById(id)
    .populate("friendRequests", "-password")
    .select("friendRequests");
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json(user.friendRequests);
};

export const acceptFriendRequest = async (req, res) => {
  const { id } = req.params; // the user accepting the request
  const { requesterId } = req.body; // the user who sent the request

  if (!requesterId || !id) {
    return res
      .status(400)
      .json({ message: "Requester ID and User ID required" });
  }

  const userObjectId = mongoose.Types.ObjectId.isValid(id)
    ? new mongoose.Types.ObjectId(id)
    : id;
  const requesterObjectId = mongoose.Types.ObjectId.isValid(requesterId)
    ? new mongoose.Types.ObjectId(requesterId)
    : requesterId;

  // Remove from friendRequests and add to followers/following
  const currentUser = await User.findByIdAndUpdate(
    userObjectId,
    {
      $pull: { friendRequests: requesterObjectId },
      $addToSet: { followers: requesterObjectId },
    },
    { new: true },
  ).select("-password");

  const requesterUser = await User.findByIdAndUpdate(
    requesterObjectId,
    { $addToSet: { following: userObjectId } },
    { new: true },
  ).select("-password");

  if (!currentUser || !requesterUser) {
    return res.status(404).json({ message: "User not found" });
  }

  res.json({ message: "Friend request accepted", user: currentUser });
};

export const rejectFriendRequest = async (req, res) => {
  const { id } = req.params; // the user rejecting the request
  const { requesterId } = req.body; // the user who sent the request

  if (!requesterId || !id) {
    return res
      .status(400)
      .json({ message: "Requester ID and User ID required" });
  }

  const userObjectId = mongoose.Types.ObjectId.isValid(id)
    ? new mongoose.Types.ObjectId(id)
    : id;
  const requesterObjectId = mongoose.Types.ObjectId.isValid(requesterId)
    ? new mongoose.Types.ObjectId(requesterId)
    : requesterId;

  // Remove from friendRequests
  const currentUser = await User.findByIdAndUpdate(
    userObjectId,
    { $pull: { friendRequests: requesterObjectId } },
    { new: true },
  ).select("-password");

  if (!currentUser) {
    return res.status(404).json({ message: "User not found" });
  }

  res.json({ message: "Friend request rejected", user: currentUser });
};
