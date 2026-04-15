import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useNavigate } from "react-router-dom";
import GlassCard from "../components/GlassCard.jsx";
import api from "../utils/api.js";
import { MessageCircle, UserPlus, UserCheck, Heart, Send } from "lucide-react";

const HomePage = () => {
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [posts, setPosts] = useState([]);
  const [caption, setCaption] = useState("");
  const [image, setImage] = useState(null);
  const [friends, setFriends] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [following, setFollowing] = useState(new Set());
  const [feedType, setFeedType] = useState("all"); // "all" or "following"
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [commentTexts, setCommentTexts] = useState({});
  const [showComments, setShowComments] = useState({});
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user?._id) {
      loadFollowing();
      fetchPosts();
    }
  }, [user]);

  useEffect(() => {
    if (user?._id) {
      console.log("Loading suggestions and friends for user:", user._id);

      api
        .get(`/users/suggestions/${user._id}`)
        .then(({ data }) => {
          console.log("Suggestions loaded:", data);
          setSuggestions(data);
        })
        .catch((err) => {
          console.error("Suggestions error:", err);
          setSuggestions([]);
        });

      api
        .get(`/users/all/${user._id}`)
        .then(({ data }) => {
          console.log("Friends loaded:", data);
          setFriends(data.slice(0, 5));
        })
        .catch((err) => {
          console.error("Friends error:", err);
          setFriends([]);
        });
    }
  }, [user]);

  const loadFollowing = async () => {
    try {
      const res = await api.get(`/users/${user._id}/following`);
      const followingIds = new Set(res.data.map((u) => u._id));
      setFollowing(followingIds);
    } catch (error) {
      console.error("Error loading following:", error);
    }
  };

  useEffect(() => {
    const interval = setInterval(fetchPosts, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchPosts = async () => {
    try {
      const response = await api.get(`/posts?userId=${user._id}`);
      const postsWithComments = await Promise.all(
        response.data.map(async (post) => {
          try {
            // Comments are already populated in the backend response
            return post;
          } catch (error) {
            console.error("Error fetching comments for post:", post._id, error);
            return post;
          }
        }),
      );
      const filteredPosts =
        feedType === "following"
          ? postsWithComments.filter((post) => following.has(post.author._id))
          : postsWithComments;
      setPosts(filteredPosts);
    } catch (error) {
      console.error("Error fetching posts:", error);
    }
  };

  useEffect(() => {
    if (user?._id) {
      fetchPosts();
    }
  }, [feedType, following]);

  const handleFollow = async (userId) => {
    try {
      const response = await api.post(`/users/${userId}/follow`, {
        userId: user._id,
      });
      if (response.data.message === "Friend request sent") {
        alert("Friend request sent!");
        // Don't add to following set yet, as it's pending
      } else {
        setFollowing((prev) => new Set([...prev, userId]));
        console.log("Followed user:", userId);
      }
    } catch (error) {
      console.error("Error following user:", error);
    }
  };

  const handleUnfollow = async (userId) => {
    try {
      await api.post(`/users/${userId}/unfollow`, { userId: user._id });
      setFollowing((prev) => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
      console.log("Unfollowed user:", userId);
    } catch (error) {
      console.error("Error unfollowing user:", error);
    }
  };

  const handleCreateChat = (userId) => {
    navigate("/chat", { state: { selectedUserId: userId } });
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!user._id) return;
    const formData = new FormData();
    formData.append("authorId", user._id);
    formData.append("caption", caption);
    if (image) formData.append("media", image);

    try {
      await api.post("/posts", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setCaption("");
      setImage(null);
      setShowCreatePost(false);
      fetchPosts(); // Refresh
    } catch (error) {
      console.error("Error creating post:", error);
      alert("Failed to create post");
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!groupName.trim()) {
      alert("Group name is required");
      return;
    }

    try {
      await api.post("/groups", {
        name: groupName,
        description: groupDescription,
        createdBy: user._id,
      });
      setGroupName("");
      setGroupDescription("");
      setShowCreateGroup(false);
      alert("Group created successfully! Go to Chat to view it.");
    } catch (error) {
      console.error("Error creating group:", error);
      alert("Failed to create group");
    }
  };

  const formatTime = (date) => {
    const now = new Date();
    const postDate = new Date(date);
    const diff = now - postDate;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins} min${mins > 1 ? "s" : ""} ago`;
    const hours = Math.floor(mins / 60);
    return `${hours} hr${hours > 1 ? "s" : ""} ago`;
  };

  const handleLike = async (postId) => {
    try {
      const response = await api.put(`/posts/${postId}/like`, {
        userId: user._id,
      });
      setPosts(
        posts.map((post) =>
          post._id === postId ? { ...post, likes: response.data.likes } : post,
        ),
      );
    } catch (error) {
      console.error("Error liking post:", error);
    }
  };

  const handleAddComment = async (postId) => {
    const text = commentTexts[postId]?.trim();
    if (!text) return;

    try {
      const response = await api.post(`/posts/${postId}/comment`, {
        userId: user._id,
        text,
      });
      setPosts(
        posts.map((post) =>
          post._id === postId
            ? { ...post, comments: response.data.comments }
            : post,
        ),
      );
      setCommentTexts({ ...commentTexts, [postId]: "" });
    } catch (error) {
      console.error("Error adding comment:", error);
    }
  };

  const handleDeleteComment = async (postId, commentId) => {
    try {
      await api.delete(`/posts/${postId}/comment/${commentId}`, {
        data: { userId: user._id },
      });
      setPosts(
        posts.map((post) =>
          post._id === postId
            ? {
                ...post,
                comments: post.comments.filter((c) => c._id !== commentId),
              }
            : post,
        ),
      );
    } catch (error) {
      console.error("Error deleting comment:", error);
    }
  };

  const toggleComments = (postId) => {
    setShowComments({ ...showComments, [postId]: !showComments[postId] });
  };

  return (
    <div className="home-body bg-gradient-to-r from-indigo-800 from-10% via-blue-800 via-30% to-pink-900 to-90% ">
      <div className="home-body p-4 md:p-10 mt-10">
        <div className="dashboard-wrapper grid grid-cols-1 lg:grid-cols-[250px_1fr_250px] gap-6 max-w-7xl mx-auto">
          {/* Left Sidebar */}
          <aside className="sidebar order-2 lg:order-1 side-left flex flex-col gap-6">
            <GlassCard>
              <h3 className="text-lg font-bold mb-4 text-white">🔍 Search</h3>
              <input
                type="text"
                placeholder="Search people..."
                value={searchQuery}
                onChange={(e) => {
                  const q = e.target.value;
                  setSearchQuery(q);
                  if (q.length >= 2) {
                    api
                      .get(`/users/search?q=${q}`)
                      .then(({ data }) => {
                        console.log("Search results:", data);
                        setSearchResults(data);
                      })
                      .catch((err) => {
                        console.error("Search error:", err);
                        setSearchResults([]);
                      });
                  } else {
                    setSearchResults([]);
                  }
                }}
                className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:bg-white/20 focus:border-primary outline-none"
              />
              {searchResults.length > 0 && (
                <div className="mt-4 max-h-96 overflow-y-auto space-y-2">
                  {searchResults.map((u) => (
                    <div
                      key={u._id}
                      className="p-3 rounded-lg hover:bg-white/10 transition-all flex items-center justify-between text-white text-sm"
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <div
                          className="w-8 h-8 rounded-full flex-shrink-0 bg-gradient-to-r from-primary to-accent"
                          style={{
                            backgroundImage: u.avatar
                              ? `url(${u.avatar})`
                              : "none",
                            backgroundSize: "cover",
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{u.name}</div>
                          <div className="text-xs text-white/60 truncate">
                            {u.bio || "No bio"}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleCreateChat(u._id)}
                          className="p-2 hover:bg-white/20 rounded-lg transition-all"
                          title="Send message"
                        >
                          <MessageCircle size={16} />
                        </button>
                        <button
                          onClick={() =>
                            following.has(u._id)
                              ? handleUnfollow(u._id)
                              : handleFollow(u._id)
                          }
                          className={`px-3 py-1 rounded-lg transition-all text-xs font-medium ${
                            following.has(u._id)
                              ? "bg-white/20 text-white hover:bg-white/30"
                              : "bg-primary hover:bg-primaryHover text-white"
                          }`}
                        >
                          {following.has(u._id) ? "Following" : "Follow"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>

            <GlassCard>
              <h3 className="text-lg font-bold mb-4 text-white">👥 Friends</h3>
              <div className="space-y-2">
                {friends.map((friend) => (
                  <div
                    key={friend._id}
                    className="user-row py-2 px-2 rounded-lg hover:bg-white/10 cursor-pointer text-white flex items-center justify-between transition-all"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div
                        className="w-8 h-8 rounded-full flex-shrink-0 bg-gradient-to-r from-primary to-accent"
                        style={{
                          backgroundImage: friend.avatar
                            ? `url(${friend.avatar})`
                            : "none",
                          backgroundSize: "cover",
                        }}
                      />
                      <span className="truncate text-sm">{friend.name}</span>
                    </div>
                    <button
                      onClick={() => handleCreateChat(friend._id)}
                      className="p-1.5 hover:bg-white/20 rounded transition-all"
                      title="Send message"
                    >
                      <MessageCircle size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </GlassCard>
          </aside>

          {/* Main Feed */}
          <main className="feed-section flex flex-col gap-6 order-1 lg:order-2">
            <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
              <h2 className="text-2xl font-bold text-white">Feed</h2>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setFeedType("all")}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    feedType === "all"
                      ? "bg-primary text-white"
                      : "bg-white/10 hover:bg-white/20 text-white"
                  }`}
                >
                  All Posts
                </button>
                <button
                  onClick={() => setFeedType("following")}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    feedType === "following"
                      ? "bg-primary text-white"
                      : "bg-white/10 hover:bg-white/20 text-white"
                  }`}
                >
                  Following
                </button>
                <button
                  onClick={fetchPosts}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm font-medium transition-all"
                >
                  🔄 Refresh
                </button>
              </div>
            </div>
            {/* Create Post Toggle */}
            <GlassCard className={`${showCreatePost ? "" : "hidden"}`}>
              <form onSubmit={handleCreatePost}>
                <textarea
                  placeholder="What's on your mind?"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="w-full h-20 p-4 bg-white/10 border border-white/20 rounded-xl resize-none text-white placeholder-white/50 mb-4 outline-none"
                />
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={(e) => setImage(e.target.files[0])}
                  className="mb-4 text-white file:bg-primary/80 file:text-white file:border-0 file:rounded-xl file:p-2 hover:file:bg-primary"
                />
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCreatePost(false)}
                    className="flex-1 py-3 px-4 border border-white/20 text-white rounded-xl hover:bg-white/10 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!caption.trim() && !image}
                    className="flex-1 py-3 px-4 bg-primary text-white rounded-xl font-semibold hover:bg-primaryHover transition-all disabled:opacity-50"
                  >
                    Post
                  </button>
                </div>
              </form>
            </GlassCard>

            <GlassCard className={`${showCreateGroup ? "" : "hidden"}`}>
              <h3 className="text-lg font-bold mb-4 text-white">
                Create New Group
              </h3>
              <form onSubmit={handleCreateGroup}>
                <input
                  type="text"
                  placeholder="Group name..."
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 mb-4 outline-none focus:bg-white/20 focus:border-primary"
                />
                <textarea
                  placeholder="Group description (optional)..."
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                  className="w-full h-16 p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 mb-4 outline-none focus:bg-white/20 focus:border-primary resize-none"
                />
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateGroup(false)}
                    className="flex-1 py-3 px-4 border border-white/20 text-white rounded-xl hover:bg-white/10 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!groupName.trim()}
                    className="flex-1 py-3 px-4 bg-primary text-white rounded-xl font-semibold hover:bg-primaryHover transition-all disabled:opacity-50"
                  >
                    Create Group
                  </button>
                </div>
              </form>
            </GlassCard>

            {/* Toggle Create Button */}
            {!showCreatePost && !showCreateGroup && (
              <button
                onClick={() => setShowCreatePost(true)}
                className="glass w-full p-6 rounded-3xl text-left hover:scale-[1.02] transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full"></div>
                  <span className="text-white/80">
                    What's on your mind, {user?.name.split(" ")[0]}?
                  </span>
                </div>
              </button>
            )}

            {/* Posts */}
            {posts.map((post) => (
              <GlassCard key={post._id} className="post">
                <div className="post-header flex gap-4 items-start mb-4">
                  <div
                    className="w-10 h-10 rounded-full shrink-0 bg-gradient-to-r from-primary to-accent"
                    style={{
                      backgroundImage: post.author?.avatar
                        ? `url(${post.author.avatar})`
                        : "none",
                      backgroundSize: "cover",
                    }}
                  ></div>
                  <div className="flex-1">
                    <strong className="text-white block">
                      {post.author?.name}
                    </strong>
                    <span className="text-white/60 text-sm">
                      {formatTime(post.createdAt)}
                    </span>
                  </div>
                  {post.author._id !== user._id && (
                    <button
                      onClick={() =>
                        following.has(post.author._id)
                          ? handleUnfollow(post.author._id)
                          : handleFollow(post.author._id)
                      }
                      className={`px-3 py-1 rounded-lg transition-all text-sm font-medium flex items-center gap-1 ${
                        following.has(post.author._id)
                          ? "bg-white/20 text-white hover:bg-white/30"
                          : "bg-primary hover:bg-primaryHover text-white"
                      }`}
                    >
                      {following.has(post.author._id) ? (
                        <>
                          <UserCheck size={14} /> Following
                        </>
                      ) : (
                        <>
                          <UserPlus size={14} /> Follow
                        </>
                      )}
                    </button>
                  )}
                </div>
                {post.caption && (
                  <p className="text-white/90 mb-4">{post.caption}</p>
                )}
                {post.mediaUrl && (
                  <div className="w-full aspect-video rounded-xl overflow-hidden mb-4">
                    <img
                      src={post.mediaUrl}
                      alt="Post media"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Like and Comment Actions */}
                <div className="flex items-center gap-4 mb-4">
                  <button
                    onClick={() => handleLike(post._id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                      post.likes?.includes(user._id)
                        ? "bg-red-600 text-white"
                        : "bg-white/10 text-white/70 hover:bg-white/20"
                    }`}
                  >
                    <Heart
                      size={18}
                      fill={
                        post.likes?.includes(user._id) ? "currentColor" : "none"
                      }
                    />
                    <span className="text-sm font-medium">
                      {post.likes?.length || 0}
                    </span>
                  </button>

                  <button
                    onClick={() => toggleComments(post._id)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 text-white/70 hover:bg-white/20 transition-all"
                  >
                    <MessageCircle size={18} />
                    <span className="text-sm font-medium">
                      {post.comments?.length || 0}
                    </span>
                  </button>
                </div>

                {/* Comments Section */}
                {showComments[post._id] && (
                  <div className="border-t border-white/20 pt-4">
                    {/* Add Comment */}
                    <div className="flex gap-2 mb-4">
                      <input
                        type="text"
                        placeholder="Write a comment..."
                        value={commentTexts[post._id] || ""}
                        onChange={(e) =>
                          setCommentTexts({
                            ...commentTexts,
                            [post._id]: e.target.value,
                          })
                        }
                        onKeyPress={(e) => {
                          if (e.key === "Enter") {
                            handleAddComment(post._id);
                          }
                        }}
                        className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-primary"
                      />
                      <button
                        onClick={() => handleAddComment(post._id)}
                        className="px-3 py-2 bg-primary hover:bg-primaryHover text-white rounded-lg transition-all"
                      >
                        <Send size={16} />
                      </button>
                    </div>

                    {/* Comments List */}
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {post.comments?.map((comment) => (
                        <div key={comment._id} className="flex gap-3">
                          <div
                            className="w-8 h-8 rounded-full bg-gradient-to-r from-primary to-accent flex-shrink-0"
                            style={{
                              backgroundImage: comment.user?.avatar
                                ? `url(${comment.user.avatar})`
                                : "none",
                              backgroundSize: "cover",
                            }}
                          />
                          <div className="flex-1">
                            <div className="bg-white/10 rounded-lg px-3 py-2">
                              <div className="flex items-center justify-between">
                                <span className="text-white font-medium text-sm">
                                  {comment.user?.name}
                                </span>
                                {comment.user?._id === user._id ||
                                post.author._id === user._id ? (
                                  <button
                                    onClick={() =>
                                      handleDeleteComment(post._id, comment._id)
                                    }
                                    className="text-white/50 hover:text-red-400 text-xs"
                                  >
                                    ✕
                                  </button>
                                ) : null}
                              </div>
                              <p className="text-white/80 text-sm mt-1">
                                {comment.text}
                              </p>
                            </div>
                            <span className="text-white/50 text-xs ml-3">
                              {formatTime(comment.createdAt)}
                            </span>
                          </div>
                        </div>
                      ))}
                      {(!post.comments || post.comments.length === 0) && (
                        <p className="text-white/50 text-sm text-center py-4">
                          No comments yet. Be the first to comment!
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </GlassCard>
            ))}

            {posts.length === 0 && (
              <GlassCard className="text-center py-12">
                <p className="text-white/60 text-lg">
                  {feedType === "following"
                    ? "Follow more people to see their posts!"
                    : "No posts yet. Create the first one!"}
                </p>
              </GlassCard>
            )}
          </main>

          {/* Right Sidebar */}
          <aside className="sidebar order-3 side-right flex flex-col gap-6">
            <GlassCard>
              <h3 className="text-lg font-bold mb-4 text-white">
                ✨ Suggestions
              </h3>
              <div className="space-y-2">
                {suggestions.map((suggestedUser) => (
                  <div
                    key={suggestedUser._id}
                    className="user-row flex justify-between items-center py-3 px-2 rounded-lg hover:bg-white/10 transition-all"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div
                        className="w-8 h-8 rounded-full flex-shrink-0 bg-gradient-to-r from-primary to-accent"
                        style={{
                          backgroundImage: suggestedUser.avatar
                            ? `url(${suggestedUser.avatar})`
                            : "none",
                          backgroundSize: "cover",
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-white text-sm font-medium truncate">
                          {suggestedUser.name}
                        </div>
                        <div className="text-white/50 text-xs truncate">
                          {suggestedUser.bio || "No bio"}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        following.has(suggestedUser._id)
                          ? handleUnfollow(suggestedUser._id)
                          : handleFollow(suggestedUser._id)
                      }
                      className={`ml-1 px-2 py-1 rounded-lg transition-all text-xs font-medium whitespace-nowrap ${
                        following.has(suggestedUser._id)
                          ? "bg-white/20 text-white hover:bg-white/30"
                          : "bg-primary hover:bg-primaryHover text-white"
                      }`}
                    >
                      {following.has(suggestedUser._id)
                        ? "Following"
                        : "Follow"}
                    </button>
                  </div>
                ))}
              </div>
            </GlassCard>

            <GlassCard>
              <h3 className="text-lg font-bold mb-4 text-white">⚡ Actions</h3>
              <div className="space-y-2">
                <button
                  onClick={() => {
                    setShowCreatePost(false);
                    setShowCreateGroup(!showCreateGroup);
                  }}
                  className="w-full py-3 px-4 bg-primary hover:bg-primaryHover text-white rounded-lg font-medium transition-all"
                >
                  + Create Group
                </button>
                <button
                  onClick={() => navigate("/chat")}
                  className="w-full py-3 px-4 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-all"
                >
                  💬 Go to Chat
                </button>
              </div>
            </GlassCard>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
