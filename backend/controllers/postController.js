import Post from "../models/Post.js";
import User from "../models/User.js";

export const createPost = async (req, res) => {
  const { authorId, caption } = req.body;
  if (!authorId) return res.status(400).json({ message: "Author required" });
  const postData = { author: authorId, caption: caption || "" };
  if (req.file) {
    const backendUrl = process.env.BACKEND_URL || "http://localhost:1234";
    postData.mediaUrl = `${backendUrl}/uploads/${req.file.filename}`;
    postData.mediaType = req.file.mimetype.startsWith("video")
      ? "video"
      : "image";
  }
  const post = await Post.create(postData);
  const populated = await post.populate("author", "name avatar");
  res.status(201).json(populated);
};

export const getPosts = async (req, res) => {
  const { userId } = req.query; // Current user viewing the posts

  let posts = await Post.find()
    .populate("author", "name avatar isPrivate")
    .populate("comments.user", "name avatar")
    .sort({ createdAt: -1 });

  // Filter out posts from private accounts that the current user doesn't follow
  if (userId) {
    const currentUser = await User.findById(userId).populate("following");
    const followingIds = new Set(
      currentUser.following.map((f) => f._id.toString()),
    );

    posts = posts.filter((post) => {
      // Show post if:
      // 1. Author is not private, OR
      // 2. Author is private but current user follows them, OR
      // 3. Current user is the author
      return (
        !post.author.isPrivate ||
        followingIds.has(post.author._id.toString()) ||
        post.author._id.toString() === userId
      );
    });
  }

  res.json(posts);
};

export const getUserPosts = async (req, res) => {
  const { userId } = req.params;
  const posts = await Post.find({ author: userId })
    .populate("author", "name avatar")
    .populate("comments.user", "name avatar")
    .sort({ createdAt: -1 });
  res.json(posts);
};

export const likePost = async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;
  const post = await Post.findById(id);
  if (!post) return res.status(404).json({ message: "Post not found" });
  const idx = post.likes.indexOf(userId);
  if (idx === -1) post.likes.push(userId);
  else post.likes.splice(idx, 1);
  await post.save();
  res.json({ likes: post.likes });
};

export const addComment = async (req, res) => {
  const { id } = req.params;
  const { userId, text } = req.body;
  if (!text || !text.trim())
    return res.status(400).json({ message: "Comment text required" });

  const post = await Post.findById(id);
  if (!post) return res.status(404).json({ message: "Post not found" });

  post.comments.push({ user: userId, text: text.trim() });
  await post.save();

  const populatedPost = await Post.findById(id).populate(
    "comments.user",
    "name avatar",
  );
  res.json({ comments: populatedPost.comments });
};

export const deleteComment = async (req, res) => {
  const { id, commentId } = req.params;
  const { userId } = req.body;

  const post = await Post.findById(id);
  if (!post) return res.status(404).json({ message: "Post not found" });

  const comment = post.comments.id(commentId);
  if (!comment) return res.status(404).json({ message: "Comment not found" });

  // Comment author or post author can delete the comment
  if (comment.user.toString() !== userId && post.author.toString() !== userId) {
    return res
      .status(403)
      .json({
        message: "Can only delete your own comments or comments on your posts",
      });
  }

  post.comments.pull(commentId);
  await post.save();

  res.json({ message: "Comment deleted successfully" });
};
