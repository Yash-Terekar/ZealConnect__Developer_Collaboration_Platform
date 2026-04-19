import Message from "../models/Message.js";
import mongoose from "mongoose";

export const getMessages = async (req, res) => {
  const { userId, otherId } = req.params;
  const userObjectId = mongoose.Types.ObjectId.isValid(userId)
    ? new mongoose.Types.ObjectId(userId)
    : userId;
  const otherObjectId = mongoose.Types.ObjectId.isValid(otherId)
    ? new mongoose.Types.ObjectId(otherId)
    : otherId;
  const messages = await Message.find({
    $or: [
      { sender: userObjectId, receiver: otherObjectId },
      { sender: otherObjectId, receiver: userObjectId },
    ],
  })
    .populate(["sender", "receiver"], "name avatar")
    .sort({ createdAt: 1 });
  res.json(messages);
};

export const createMessage = async (req, res) => {
  const { senderId, receiverId, content } = req.body;
  if (!senderId || !receiverId || (!content && !req.file)) {
    return res.status(400).json({ message: "Content or file required" });
  }

  const senderObjectId = mongoose.Types.ObjectId.isValid(senderId)
    ? new mongoose.Types.ObjectId(senderId)
    : senderId;
  const receiverObjectId = mongoose.Types.ObjectId.isValid(receiverId)
    ? new mongoose.Types.ObjectId(receiverId)
    : receiverId;

  const messageData = {
    sender: senderObjectId,
    receiver: receiverObjectId,
    content: content || "",
  };

  try {
    if (req.file) {
      // multer-storage-cloudinary sets file.path to the secure_url
      const url = req.file.path || req.file.secure_url || req.file.url;
      if (!url) throw new Error("Cloudinary upload missing URL");
      messageData.mediaUrl = url;
      const mime = req.file.mimetype || "";
      messageData.mediaType = mime.startsWith("video")
        ? "video"
        : mime.startsWith("image")
          ? "image"
          : "file";
    }

    const message = await Message.create(messageData);
    const populated = await message.populate(
      ["sender", "receiver"],
      "name avatar",
    );
    res.status(201).json(populated);
  } catch (error) {
    console.error("Error creating message:", error);
    res
      .status(500)
      .json({ message: error.message || "Failed to create message" });
  }
};

export const getChats = async (req, res) => {
  const { userId } = req.params;
  const userObjectId = mongoose.Types.ObjectId.isValid(userId)
    ? new mongoose.Types.ObjectId(userId)
    : userId;
  const chats = await Message.aggregate([
    {
      $match: {
        $or: [{ sender: userObjectId }, { receiver: userObjectId }],
      },
    },
    {
      $group: {
        _id: {
          otherId: {
            $cond: [{ $eq: ["$sender", userObjectId] }, "$receiver", "$sender"],
          },
        },
        lastMessage: { $last: "$content" },
        lastTime: { $last: "$createdAt" },
        count: { $sum: 1 },
        otherUserId: {
          $last: {
            $cond: [{ $eq: ["$sender", userObjectId] }, "$receiver", "$sender"],
          },
        },
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "otherUserId",
        foreignField: "_id",
        as: "otherUser",
        pipeline: [{ $project: { name: 1, avatar: 1 } }],
      },
    },
    { $unwind: "$otherUser" },
    { $sort: { lastTime: -1 } },
    { $limit: 20 },
    {
      $project: {
        _id: 0,
        userId: "$otherUserId",
        user: "$otherUser",
        lastMessage: 1,
        lastTime: 1,
        unreadCount: { $cond: [{ $gt: ["$count", 0] }, "$count", 0] },
      },
    },
  ]);
  res.json(chats);
};

export const deleteMessage = async (req, res) => {
  const { messageId } = req.params;
  const { userId } = req.body; // User making the request

  try {
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    // Only allow sender to delete their own messages
    if (message.sender.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "You can only delete your own messages" });
    }

    await Message.findByIdAndDelete(messageId);
    res.json({ message: "Message deleted successfully" });
  } catch (error) {
    console.error("Delete message error:", error);
    res.status(500).json({ message: "Failed to delete message" });
  }
};

export const deleteConversation = async (req, res) => {
  const { userId, otherId } = req.params;

  try {
    const userObjectId = mongoose.Types.ObjectId.isValid(userId)
      ? new mongoose.Types.ObjectId(userId)
      : userId;
    const otherObjectId = mongoose.Types.ObjectId.isValid(otherId)
      ? new mongoose.Types.ObjectId(otherId)
      : otherId;

    // Delete all messages between these two users
    await Message.deleteMany({
      $or: [
        { sender: userObjectId, receiver: otherObjectId },
        { sender: otherObjectId, receiver: userObjectId },
      ],
    });

    res.json({ message: "Conversation deleted successfully" });
  } catch (error) {
    console.error("Delete conversation error:", error);
    res.status(500).json({ message: "Failed to delete conversation" });
  }
};
