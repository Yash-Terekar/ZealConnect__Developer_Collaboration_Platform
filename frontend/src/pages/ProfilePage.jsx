import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import GlassCard from "../components/GlassCard.jsx";
import api from "../utils/api.js";
import {
  Users,
  UserPlus,
  Image,
  Heart,
  Lock,
  Globe,
  MessageCircle,
  UserCheck,
} from "lucide-react";

const ProfilePage = () => {
  const { user, updateUser } = useAuth();
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [userPosts, setUserPosts] = useState([]);
  const [activeTab, setActiveTab] = useState("posts");
  const [loading, setLoading] = useState(true);
  const [isPrivate, setIsPrivate] = useState(false);
  const [friendRequests, setFriendRequests] = useState([]);

  useEffect(() => {
    if (user?._id) {
      loadProfileData();
    }
  }, [user]);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      const [followersRes, followingRes, postsRes, friendRequestsRes] =
        await Promise.all([
          api.get(`/users/${user._id}/followers`),
          api.get(`/users/${user._id}/following`),
          api.get(`/posts/user/${user._id}`),
          api.get(`/users/${user._id}/friend-requests`),
        ]);

      setFollowers(followersRes.data);
      setFollowing(followingRes.data);
      setUserPosts(postsRes.data);
      setFriendRequests(friendRequestsRes.data);
      setIsPrivate(user.isPrivate || false);
    } catch (error) {
      console.error("Load profile data error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrivacyToggle = async () => {
    try {
      const newPrivacy = !isPrivate;
      await updateUser(user._id, { isPrivate: newPrivacy });
      setIsPrivate(newPrivacy);
      alert(`Profile is now ${newPrivacy ? "private" : "public"}`);
    } catch (error) {
      console.error("Privacy toggle error:", error);
      alert("Failed to update privacy setting");
    }
  };

  const handleAcceptFriendRequest = async (requesterId) => {
    try {
      await api.post(`/users/${user._id}/accept-friend-request`, {
        requesterId,
      });
      setFriendRequests(
        friendRequests.filter((req) => req._id !== requesterId),
      );
      // Refresh followers and following
      loadProfileData();
      alert("Friend request accepted!");
    } catch (error) {
      console.error("Accept friend request error:", error);
      alert("Failed to accept friend request");
    }
  };

  const handleRejectFriendRequest = async (requesterId) => {
    try {
      await api.post(`/users/${user._id}/reject-friend-request`, {
        requesterId,
      });
      setFriendRequests(
        friendRequests.filter((req) => req._id !== requesterId),
      );
      alert("Friend request rejected!");
    } catch (error) {
      console.error("Reject friend request error:", error);
      alert("Failed to reject friend request");
    }
  };

  if (!user) return <div>Loading...</div>;

  return (
    <div className="home-body">
      <div className="mt-10 p-4 md:p-10 min-h-screen">
        <div className="profile-wrapper max-w-4xl mx-auto">
          {/* Profile Header */}
          <GlassCard className="profile-card w-full mb-6">
            <div className="profile-top flex flex-col md:flex-row gap-6 items-center justify-center p-6">
              <div
                className="profile-pic w-32 h-32 bg-primary rounded-full cursor-pointer hover:scale-105 transition-transform"
                style={{
                  backgroundImage: `url(${user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=0D0E13&color=ffffff`})`,
                  backgroundSize: "cover",
                }}
              ></div>
              <div className="text-center md:text-left">
                <h2 className="text-4xl font-bold text-white mb-2">
                  {user.name}
                </h2>
                <p className="text-white/70 text-lg mb-4">
                  {user.bio || "No bio yet"}
                </p>

                {/* Stats */}
                <div className="flex gap-6 justify-center md:justify-start mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">
                      {userPosts.length}
                    </div>
                    <div className="text-sm text-white/60">Posts</div>
                  </div>
                  <button
                    onClick={() => setActiveTab("followers")}
                    className="text-center hover:bg-white/10 px-2 py-1 rounded transition-all"
                  >
                    <div className="text-2xl font-bold text-white">
                      {followers.length}
                    </div>
                    <div className="text-sm text-white/60">Followers</div>
                  </button>
                  <button
                    onClick={() => setActiveTab("following")}
                    className="text-center hover:bg-white/10 px-2 py-1 rounded transition-all"
                  >
                    <div className="text-2xl font-bold text-white">
                      {following.length}
                    </div>
                    <div className="text-sm text-white/60">Following</div>
                  </button>
                </div>

                <div className="flex gap-3 justify-center md:justify-start">
                  <button
                    onClick={() => (window.location.href = "/edit-profile")}
                    className="edit-btn px-6 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primaryHover transition-all"
                  >
                    Edit Profile
                  </button>
                  <button
                    onClick={handlePrivacyToggle}
                    className={`px-6 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                      isPrivate
                        ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                        : "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                    }`}
                  >
                    {isPrivate ? <Lock size={16} /> : <Globe size={16} />}
                    {isPrivate ? "Private" : "Public"}
                  </button>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Tabs */}
          <div className="flex border-b border-white/20 mb-6">
            <button
              onClick={() => setActiveTab("posts")}
              className={`px-6 py-3 font-medium transition-all ${
                activeTab === "posts"
                  ? "text-primary border-b-2 border-primary"
                  : "text-white/60 hover:text-white"
              }`}
            >
              <Image size={18} className="inline mr-2" />
              Posts
            </button>
            <button
              onClick={() => setActiveTab("followers")}
              className={`px-6 py-3 font-medium transition-all ${
                activeTab === "followers"
                  ? "text-primary border-b-2 border-primary"
                  : "text-white/60 hover:text-white"
              }`}
            >
              <Users size={18} className="inline mr-2" />
              Followers
            </button>
            <button
              onClick={() => setActiveTab("following")}
              className={`px-6 py-3 font-medium transition-all ${
                activeTab === "following"
                  ? "text-primary border-b-2 border-primary"
                  : "text-white/60 hover:text-white"
              }`}
            >
              <UserPlus size={18} className="inline mr-2" />
              Following
            </button>
            <button
              onClick={() => setActiveTab("friend-requests")}
              className={`px-6 py-3 font-medium transition-all ${
                activeTab === "friend-requests"
                  ? "text-primary border-b-2 border-primary"
                  : "text-white/60 hover:text-white"
              }`}
            >
              <UserCheck size={18} className="inline mr-2" />
              Friend Requests ({friendRequests.length})
            </button>
          </div>

          {/* Content */}
          {loading ? (
            <div className="text-center text-white/60 py-8">Loading...</div>
          ) : (
            <>
              {activeTab === "posts" && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {userPosts.length > 0 ? (
                    userPosts.map((post) => (
                      <GlassCard key={post._id} className="post-card">
                        <div className="p-4">
                          {post.mediaUrl && (
                            <div className="mb-3">
                              {post.mediaType === "video" ? (
                                <video
                                  src={post.mediaUrl}
                                  controls
                                  className="w-full rounded-lg"
                                />
                              ) : (
                                <img
                                  src={post.mediaUrl}
                                  alt="post"
                                  className="w-full rounded-lg"
                                />
                              )}
                            </div>
                          )}
                          <p className="text-white mb-3">{post.caption}</p>
                          <div className="flex items-center gap-4 text-white/60 text-sm">
                            <span className="flex items-center gap-1">
                              <Heart size={14} />
                              {post.likes?.length || 0}
                            </span>
                            <span className="flex items-center gap-1">
                              <MessageCircle size={14} />
                              {post.comments?.length || 0}
                            </span>
                            <span>
                              {new Date(post.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </GlassCard>
                    ))
                  ) : (
                    <div className="col-span-full text-center text-white/60 py-8">
                      No posts yet. Create your first post!
                    </div>
                  )}
                </div>
              )}

              {activeTab === "followers" && (
                <div className="space-y-4">
                  {followers.length > 0 ? (
                    followers.map((follower) => (
                      <GlassCard key={follower._id} className="p-4">
                        <div className="flex items-center gap-4">
                          <div
                            className="w-12 h-12 rounded-full bg-primary"
                            style={{
                              backgroundImage: `url(${follower.avatar})`,
                              backgroundSize: "cover",
                            }}
                          />
                          <div className="flex-1">
                            <h3 className="text-white font-medium">
                              {follower.name}
                            </h3>
                            <p className="text-white/60 text-sm">
                              {follower.bio || "No bio"}
                            </p>
                          </div>
                        </div>
                      </GlassCard>
                    ))
                  ) : (
                    <div className="text-center text-white/60 py-8">
                      No followers yet
                    </div>
                  )}
                </div>
              )}

              {activeTab === "following" && (
                <div className="space-y-4">
                  {following.length > 0 ? (
                    following.map((followed) => (
                      <GlassCard key={followed._id} className="p-4">
                        <div className="flex items-center gap-4">
                          <div
                            className="w-12 h-12 rounded-full bg-primary"
                            style={{
                              backgroundImage: `url(${followed.avatar})`,
                              backgroundSize: "cover",
                            }}
                          />
                          <div className="flex-1">
                            <h3 className="text-white font-medium">
                              {followed.name}
                            </h3>
                            <p className="text-white/60 text-sm">
                              {followed.bio || "No bio"}
                            </p>
                          </div>
                        </div>
                      </GlassCard>
                    ))
                  ) : (
                    <div className="text-center text-white/60 py-8">
                      Not following anyone yet
                    </div>
                  )}
                </div>
              )}

              {activeTab === "friend-requests" && (
                <div className="space-y-4">
                  {friendRequests.length > 0 ? (
                    friendRequests.map((requester) => (
                      <GlassCard key={requester._id} className="p-4">
                        <div className="flex items-center gap-4">
                          <div
                            className="w-12 h-12 rounded-full bg-primary"
                            style={{
                              backgroundImage: `url(${requester.avatar})`,
                              backgroundSize: "cover",
                            }}
                          />
                          <div className="flex-1">
                            <h3 className="text-white font-medium">
                              {requester.name}
                            </h3>
                            <p className="text-white/60 text-sm">
                              {requester.bio || "No bio"}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() =>
                                handleAcceptFriendRequest(requester._id)
                              }
                              className="px-4 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-all"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() =>
                                handleRejectFriendRequest(requester._id)
                              }
                              className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-all"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      </GlassCard>
                    ))
                  ) : (
                    <div className="text-center text-white/60 py-8">
                      No friend requests
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
