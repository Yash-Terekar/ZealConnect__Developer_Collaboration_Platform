import { useState, useRef, useEffect } from "react";
import { io } from "socket.io-client";
import { useAuth } from "../context/AuthContext.jsx";
import GlassCard from "../components/GlassCard.jsx";
import api from "../utils/api.js";
import {
  Paperclip,
  Send,
  Users,
  LogIn,
  Trash2,
  MoreVertical,
  Check,
  X,
} from "lucide-react";

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL || `http://${window.location.hostname}:1234`;

const ChatPage = () => {
  const { user } = useAuth();
  const [chats, setChats] = useState([]);
  const [groups, setGroups] = useState([]);
  const [allGroups, setAllGroups] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [currentChatUser, setCurrentChatUser] = useState(null);
  const [currentChatName, setCurrentChatName] = useState("");
  const [currentChatType, setCurrentChatType] = useState(null); // "1v1" or "group"
  const [currentGroupId, setCurrentGroupId] = useState(null);
  const [currentGroupData, setCurrentGroupData] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [mediaPreview, setMediaPreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileError, setFileError] = useState("");
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState(new Set());
  const [showJoinRequests, setShowJoinRequests] = useState(false);
  const [messageOptions, setMessageOptions] = useState(null);
  const [notification, setNotification] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const socketRef = useRef(null);
  const currentGroupIdRef = useRef(null);

  useEffect(() => {
    if (!user?._id) return;

    socketRef.current = io(SOCKET_URL, {
      query: { userId: user._id },
    });

    socketRef.current.on("receive_message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    socketRef.current.on("receive_group_message", (msg) => {
      console.log("Received group message:", msg);
      // Use ref to get current group ID (avoids stale closure)
      if (
        msg.group &&
        currentGroupIdRef.current &&
        msg.group.toString() === currentGroupIdRef.current.toString()
      ) {
        // Don't add if it's our own message (already added locally)
        if (msg.sender._id !== user._id) {
          console.log("Adding message to current group");
          setMessages((prev) => [...prev, msg]);
        } else {
          console.log("Ignoring own message");
        }
      } else if (msg.group) {
        // Show notification for messages in other groups
        console.log("New message in background group:", msg.group);
        setNotification({
          type: "new_message",
          sender: msg.sender.name,
          groupId: msg.group,
          content: msg.content || "[Media]",
        });

        // Auto-dismiss notification after 5 seconds
        setTimeout(() => {
          setNotification(null);
        }, 5000);
      }
    });

    socketRef.current.on("connect", () => {
      console.log("Socket connected");
    });

    socketRef.current.on("disconnect", () => {
      console.log("Socket disconnected");
    });

    socketRef.current.on("chat_update", ({ senderId }) => {
      loadChats();
    });

    loadChats();
    loadGroups();
    loadAllGroups();

    return () => {
      socketRef.current.disconnect();
    };
  }, [user]);

  // Update ref whenever currentGroupId changes
  useEffect(() => {
    currentGroupIdRef.current = currentGroupId;
  }, [currentGroupId]);

  const loadChats = async () => {
    try {
      const res = await api.get(`/messages/chats/${user._id}`);
      setChats(res.data);
    } catch (error) {
      console.error("Load chats error", error);
      setChats([]);
    }
  };

  const loadGroups = async () => {
    try {
      const res = await api.get(`/groups/user/${user._id}`);
      setGroups(res.data);
    } catch (error) {
      console.error("Load groups error", error);
      setGroups([]);
    }
  };

  const loadAllGroups = async () => {
    try {
      const res = await api.get(`/groups`);
      setAllGroups(res.data || []);
    } catch (error) {
      console.error("Load all groups error", error);
      setAllGroups([]);
    }
  };

  const loadUsers = async () => {
    try {
      const res = await api.get(`/users/all/${user._id}`);
      setAllUsers(res.data);
    } catch (error) {
      console.error("Load users error", error);
      setAllUsers([]);
    }
  };

  useEffect(() => {
    if (user?._id) {
      loadUsers();
    }
  }, [user]);

  const loadMessages = async (chatId, type) => {
    try {
      if (type === "1v1") {
        const res = await api.get(`/messages/${user._id}/${chatId}`);
        setMessages(res.data);
      } else if (type === "group") {
        const res = await api.get(`/groups/${chatId}/messages`);
        setMessages(res.data);
        // Load group data for info panel
        const groupRes = await api.get(`/groups`);
        const groupData = groupRes.data.find((g) => g._id === chatId);
        setCurrentGroupData(groupData);

        // Auto-show group info for admins with pending requests
        if (
          groupData &&
          groupData.createdBy._id === user._id &&
          groupData.joinRequests?.length > 0
        ) {
          setShowGroupInfo(true);
          setShowJoinRequests(true);
        }
      }
    } catch (error) {
      console.error("Load messages error", error);
      setMessages([]);
    }
  };

  const handleJoinGroup = async (groupId) => {
    if (!user) {
      alert("❌ You must be logged in to join groups");
      return;
    }
    try {
      await api.put(`/groups/${groupId}/request-join`);
      loadAllGroups();
      alert("✅ Join request sent! Waiting for admin approval.");
    } catch (error) {
      console.error("Error requesting to join group:", error);
      const errorMessage = error.response?.data?.message || "Unknown error";
      alert(`❌ Failed to send join request: ${errorMessage}`);
    }
  };

  const handleAcceptJoinRequest = async (userId) => {
    try {
      await api.put(`/groups/${currentGroupId}/accept-request`, {
        userId,
      });
      // Refresh all data
      loadAllGroups();
      loadGroups();
      loadMessages(currentGroupId, "group");
      alert("✅ Join request accepted!");
    } catch (error) {
      console.error("Error accepting join request:", error);
      const errorMessage = error.response?.data?.message || "Unknown error";
      alert(`❌ Failed to accept join request: ${errorMessage}`);
    }
  };

  const handleRejectJoinRequest = async (userId) => {
    try {
      await api.put(`/groups/${currentGroupId}/reject-request`, {
        userId,
      });
      // Refresh all data
      loadAllGroups();
      loadGroups();
      loadMessages(currentGroupId, "group");
      alert("❌ Join request rejected");
    } catch (error) {
      console.error("Error rejecting join request:", error);
      const errorMessage = error.response?.data?.message || "Unknown error";
      alert(`❌ Failed to reject join request: ${errorMessage}`);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      await api.delete(`/messages/${messageId}`, {
        data: { userId: user._id },
      });
      // Remove message from local state
      setMessages((prev) => prev.filter((msg) => msg._id !== messageId));
      setMessageOptions(null);
    } catch (error) {
      console.error("Error deleting message:", error);
      alert("❌ Failed to delete message");
    }
  };

  const handleDeleteConversation = async (otherUserId) => {
    if (
      !confirm(
        "Are you sure you want to delete this entire conversation? This action cannot be undone.",
      )
    ) {
      return;
    }

    try {
      await api.delete(`/messages/conversation/${user._id}/${otherUserId}`);
      // Remove from chats and clear current chat if it's this conversation
      setChats((prev) => prev.filter((chat) => chat.userId !== otherUserId));
      if (currentChatId === otherUserId) {
        setCurrentChatId(null);
        setCurrentChatUser(null);
        setCurrentChatName("");
        setCurrentChatType(null);
        setMessages([]);
      }
      alert("✅ Conversation deleted successfully!");
    } catch (error) {
      console.error("Error deleting conversation:", error);
      alert("❌ Failed to delete conversation");
    }
  };

  const handlePromoteToAdmin = async (userId) => {
    if (!confirm("Are you sure you want to promote this user to admin?")) {
      return;
    }

    try {
      await api.put(`/groups/${currentGroupId}/promote-admin`, {
        userId,
      });
      // Refresh group data
      loadAllGroups();
      loadGroups();
      loadMessages(currentGroupId, "group");
      alert("✅ User promoted to admin successfully!");
    } catch (error) {
      console.error("Error promoting user to admin:", error);
      const errorMessage = error.response?.data?.message || "Unknown error";
      alert(`❌ Failed to promote user: ${errorMessage}`);
    }
  };

  const handleDemoteFromAdmin = async (userId) => {
    if (!confirm("Are you sure you want to demote this admin?")) {
      return;
    }

    try {
      await api.put(`/groups/${currentGroupId}/demote-admin`, {
        userId,
      });
      // Refresh group data
      loadAllGroups();
      loadGroups();
      loadMessages(currentGroupId, "group");
      alert("✅ Admin demoted successfully!");
    } catch (error) {
      console.error("Error demoting admin:", error);
      const errorMessage = error.response?.data?.message || "Unknown error";
      alert(`❌ Failed to demote admin: ${errorMessage}`);
    }
  };

  const handleRemoveFromGroup = async (userId) => {
    if (!confirm("Are you sure you want to remove this user from the group?")) {
      return;
    }

    try {
      await api.put(`/groups/${currentGroupId}/remove-member`, {
        userId,
      });
      // Refresh group data
      loadAllGroups();
      loadGroups();
      loadMessages(currentGroupId, "group");
      alert("✅ User removed from group successfully!");
    } catch (error) {
      console.error("Error removing user from group:", error);
      const errorMessage = error.response?.data?.message || "Unknown error";
      alert(`❌ Failed to remove user: ${errorMessage}`);
    }
  };

  const handleAddMembersToGroup = async () => {
    if (!selectedMembers.size) return;

    if (
      !confirm(
        `Add ${selectedMembers.size} member${
          selectedMembers.size > 1 ? "s" : ""
        } to this group?`,
      )
    ) {
      return;
    }

    try {
      await api.put(`/groups/${currentGroupId}/add-members`, {
        userIds: Array.from(selectedMembers),
      });
      setSelectedMembers(new Set());
      setShowAddMembers(false);
      loadAllGroups();
      loadGroups();
      loadMessages(currentGroupId, "group");
      alert("✅ Members added to group successfully!");
    } catch (error) {
      console.error("Error adding members to group:", error);
      const errorMessage = error.response?.data?.message || "Unknown error";
      alert(`❌ Failed to add members: ${errorMessage}`);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleChatSelect = (chat) => {
    if (currentGroupId) {
      socketRef.current.emit("leave_group", currentGroupId);
    }

    setCurrentChatId(chat.userId);
    setCurrentChatUser(chat.user);
    setCurrentChatName(chat.user.name);
    setCurrentChatType("1v1");
    setCurrentGroupId(null);
    setCurrentGroupData(null);
    setShowGroupInfo(false);
    setNotification(null); // Dismiss notification
    loadMessages(chat.userId, "1v1");
  };

  const handleGroupSelect = (group) => {
    if (currentGroupId) {
      socketRef.current.emit("leave_group", currentGroupId);
    }

    setCurrentGroupId(group._id);
    setCurrentChatName(group.name);
    setCurrentChatType("group");
    setCurrentChatId(null);
    setCurrentChatUser(null);

    // Auto-show group info for admins with pending requests
    const shouldShowInfo =
      group.createdBy._id === user._id && group.joinRequests?.length > 0;
    setShowGroupInfo(shouldShowInfo);
    setShowJoinRequests(shouldShowInfo); // Auto-expand join requests

    setNotification(null); // Dismiss notification when entering group
    socketRef.current.emit("join_group", group._id);
    loadMessages(group._id, "group");
  };

  const handleUserSelect = (user) => {
    if (currentGroupId) {
      socketRef.current.emit("leave_group", currentGroupId);
    }

    setCurrentChatId(user._id);
    setCurrentChatUser(user);
    setCurrentChatName(user.name);
    setCurrentChatType("1v1");
    setCurrentGroupId(null);
    setCurrentGroupData(null);
    setShowGroupInfo(false);
    setNotification(null); // Dismiss notification
    loadMessages(user._id, "1v1");
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    setFileError("");

    if (file) {
      setSelectedFile(file);
      const previewType = file.type.startsWith("video")
        ? "video"
        : file.type.startsWith("image")
          ? "image"
          : "file";
      const previewData = {
        type: previewType,
        name: file.name,
      };

      if (previewType === "video" || previewType === "image") {
        const reader = new FileReader();
        reader.onloadend = () => {
          setMediaPreview({
            ...previewData,
            url: reader.result,
          });
        };
        reader.readAsDataURL(file);
      } else {
        setMediaPreview(previewData);
      }
    }
  };

  const handleSend = async () => {
    if ((newMessage.trim() || selectedFile) && user._id) {
      if (currentChatType === "1v1" && !currentChatId) return;
      if (currentChatType === "group" && !currentGroupId) return;

      try {
        if (currentChatType === "1v1") {
          if (selectedFile) {
            const formData = new FormData();
            formData.append("senderId", user._id);
            formData.append("receiverId", currentChatId);
            formData.append("content", newMessage || "");
            formData.append("media", selectedFile);

            const response = await api.post("/messages", formData, {
              headers: { "Content-Type": "multipart/form-data" },
            });
            socketRef.current.emit("send_message", response.data);
          } else if (newMessage.trim()) {
            const data = {
              senderId: user._id,
              receiverId: currentChatId,
              content: newMessage,
            };
            await api.post("/messages", data);
            socketRef.current.emit("send_message", data);
          }
        } else if (currentChatType === "group") {
          if (selectedFile) {
            const formData = new FormData();
            formData.append("senderId", user._id);
            formData.append("groupId", currentGroupId);
            formData.append("content", newMessage || "");
            formData.append("media", selectedFile);

            const response = await api.post("/groups/message", formData, {
              headers: { "Content-Type": "multipart/form-data" },
            });
            // Add message to local state immediately
            setMessages((prev) => [...prev, response.data]);
            socketRef.current.emit("send_group_message", response.data);
          } else if (newMessage.trim()) {
            const data = {
              senderId: user._id,
              groupId: currentGroupId,
              content: newMessage,
            };
            const response = await api.post("/groups/message", data);
            // Add message to local state immediately
            setMessages((prev) => [...prev, response.data]);
            socketRef.current.emit("send_group_message", response.data);
          }
        }

        setNewMessage("");
        setSelectedFile(null);
        setMediaPreview(null);
        setFileError("");
      } catch (error) {
        console.error("Send message error", error);
        setFileError("❌ Failed to send message");
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") handleSend();
  };

  if (!user) return <div>Loading...</div>;

  const availableGroupsToJoin = allGroups.filter(
    (g) =>
      !groups.some((ug) => ug._id === g._id) &&
      !g.joinRequests?.some((jr) => jr._id === user._id),
  );
  const pendingJoinRequests = allGroups.filter(
    (g) =>
      !groups.some((ug) => ug._id === g._id) &&
      g.joinRequests?.some((jr) => jr._id === user._id),
  );
  const availableMembersToAdd = allUsers.filter(
    (u) =>
      !currentGroupData?.members.some((m) => m._id === u._id || m === u._id),
  );

  return (
    <div className="home-body ">
      {/* Notification Popup */}
      {notification && (
        <div className="fixed top-4 right-4 bg-gradient-to-r from-blue-600 to-blue-900 text-white dark:bg-blue-900 px-6 py-4 rounded-lg shadow-2xl z-50 max-w-xs animate-pulse">
          <div className="font-bold mb-1">💬 New Message</div>
          <div className="text-sm text-blue-100 mb-2">
            <span className="font-semibold">{notification.sender}</span> sent a
            message
          </div>
          <div className="text-xs text-blue-200 truncate">
            {notification.content}
          </div>
        </div>
      )}

      <div className="p-4 md:p-10 mt-10">
        <div className="chat-wrapper grid grid-cols-1 xl:grid-cols-[300px_1fr_300px] gap-6 max-w-7xl mx-auto min-h-[calc(100vh-180px)]">
          {/* Left Sidebar - Chats & Groups */}
          <aside className="chat-sidebar overflow-y-auto max-h-[calc(100vh-200px)]">
            <h3 className="text-xl font-bold text-white mb-6 sticky top-0 bg-gradient-to-b from-black/30 p-4">
              💬 Chats & Groups
            </h3>

            {/* My Groups - Always on top */}
            {groups.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-white/70 px-4 mb-3">
                  👥 My Groups ({groups.length})
                </h4>
                {groups.map((group) => (
                  <div
                    key={group._id}
                    className={`chat-user p-4 cursor-pointer transition-all rounded-xl mb-2 text-white hover:bg-white/10 ${
                      currentGroupId === group._id
                        ? "bg-primary/20 border border-primary/30"
                        : ""
                    }`}
                    onClick={() => handleGroupSelect(group)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-accent to-primary flex items-center justify-center font-bold">
                        {group.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{group.name}</div>
                        <div className="text-xs text-white/60">
                          {group.members?.length || 0} members
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Direct Messages - Below groups */}
            {chats.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-white/70 px-4 mb-3">
                  💬 Direct Messages
                </h4>
                {chats.map((chat) => (
                  <div
                    key={chat.userId}
                    className={`chat-user p-4 cursor-pointer transition-all rounded-xl mb-2 text-white hover:bg-white/10 ${
                      currentChatId === chat.userId && currentChatType === "1v1"
                        ? "bg-primary/20 border border-primary/30"
                        : ""
                    }`}
                    onClick={() => handleChatSelect(chat)}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full bg-gradient-to-r from-primary to-accent"
                        style={{
                          backgroundImage: `url(${chat.user.avatar})`,
                          backgroundSize: "cover",
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">
                          {chat.user.name}
                        </div>
                        <div className="text-xs text-white/60 truncate">
                          {chat.lastMessage || "No messages yet"}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Available Groups to Join */}
            {availableGroupsToJoin.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-white/70 px-4 mb-3">
                  🔓 Available Groups
                </h4>
                {availableGroupsToJoin.map((group) => (
                  <div
                    key={group._id}
                    className="p-4 bg-white/5 hover:bg-white/10 rounded-xl mb-2 transition-all"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-white truncate">
                          {group.name}
                        </div>
                        <div className="text-xs text-white/60">
                          {group.members?.length || 0} members
                        </div>
                      </div>
                      <button
                        onClick={() => handleJoinGroup(group._id)}
                        className="px-2 py-1 bg-primary hover:bg-primaryHover text-white rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1"
                      >
                        <LogIn size={12} /> Join
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pending Join Requests */}
            {pendingJoinRequests.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-white/70 px-4 mb-3">
                  ⏳ Pending Requests
                </h4>
                {pendingJoinRequests.map((group) => (
                  <div
                    key={group._id}
                    className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl mb-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-white truncate">
                          {group.name}
                        </div>
                        <div className="text-xs text-white/60">
                          {group.members?.length || 0} members • Waiting for
                          approval
                        </div>
                      </div>
                      <span className="px-2 py-1 bg-yellow-600 text-white rounded-lg text-xs font-medium whitespace-nowrap">
                        Pending
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Available Users */}
            {allUsers.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-white/70 px-4 mb-3">
                  👥 Available Users
                </h4>
                {allUsers
                  .filter((u) => !chats.find((chat) => chat.userId === u._id))
                  .map((user) => (
                    <div
                      key={user._id}
                      className={`chat-user p-4 cursor-pointer transition-all rounded-xl mb-2 text-white hover:bg-white/10 ${
                        currentChatId === user._id && currentChatType === "1v1"
                          ? "bg-primary/20 border border-primary/30"
                          : ""
                      }`}
                      onClick={() => handleUserSelect(user)}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-full bg-gradient-to-r from-primary to-accent"
                          style={{
                            backgroundImage: `url(${user.avatar})`,
                            backgroundSize: "cover",
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">
                            {user.name}
                          </div>
                          <div className="text-xs text-white/60">
                            {user.bio || "No bio"}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </aside>

          {/* Main Chat Area */}
          <GlassCard className="chat-main flex flex-col max-h-[calc(100vh-200px)]">
            {currentChatName ? (
              <>
                <div className="chat-header p-6 border-b border-white/20 flex justify-between items-center">
                  <div>
                    <strong className="chat-name text-2xl text-light dark:text-white">
                      {currentChatName}
                    </strong>
                    <span className="text-sm text-muted-light dark:text-white/50 ml-2">
                      ({currentChatType === "group" ? "Group" : "Direct"})
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {currentChatType === "1v1" && (
                      <button
                        onClick={() => handleDeleteConversation(currentChatId)}
                        className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
                      >
                        <Trash2 size={16} /> Delete Chat
                      </button>
                    )}
                    {currentChatType === "group" && (
                      <button
                        onClick={() => setShowGroupInfo(!showGroupInfo)}
                        className="px-4 py-2 bg-primary hover:bg-primaryHover text-white rounded-lg text-sm font-medium transition-all flex items-center gap-2 relative"
                      >
                        <Users size={16} /> Info
                        {currentGroupData?.createdBy._id === user._id &&
                          currentGroupData?.joinRequests?.length > 0 && (
                            <span className="absolute -top-1 -right-1 bg-yellow-500 text-black text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                              {currentGroupData.joinRequests.length}
                            </span>
                          )}
                      </button>
                    )}
                  </div>
                </div>

                <div className="chat-messages flex-1 overflow-y-auto p-6 space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg._id}
                      className={`message p-3 rounded-2xl max-w-xs relative group ${
                        msg.sender._id === user._id
                          ? "bg-primary ml-auto text-white rounded-br-sm"
                          : "bg-white/10 mr-auto rounded-bl-sm"
                      }`}
                    >
                      {currentChatType === "group" &&
                        msg.sender._id !== user._id && (
                          <p className="text-xs font-semibold text-white/70 mb-1">
                            {msg.sender.name}
                          </p>
                        )}

                      {/* Delete button for own messages */}
                      {msg.sender._id === user._id && (
                        <button
                          onClick={() =>
                            setMessageOptions(
                              msg._id === messageOptions ? null : msg._id,
                            )
                          }
                          className="absolute -top-2 -left-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center"
                        >
                          <MoreVertical size={12} />
                        </button>
                      )}

                      {/* Delete options */}
                      {messageOptions === msg._id && (
                        <div className="absolute -top-12 -left-2 bg-black/80 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                          <button
                            onClick={() => handleDeleteMessage(msg._id)}
                            className="hover:text-red-400 transition-colors"
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      )}

                      {msg.mediaUrl && (
                        <div className="mb-2">
                          {msg.mediaType === "video" ? (
                            <video
                              src={msg.mediaUrl}
                              controls
                              className="max-w-xs rounded-lg"
                            />
                          ) : msg.mediaType === "image" ? (
                            <img
                              src={msg.mediaUrl}
                              alt="shared"
                              className="max-w-xs rounded-lg"
                            />
                          ) : (
                            <a
                              href={msg.mediaUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-block text-sm underline text-white/80 hover:text-white"
                            >
                              Download file
                            </a>
                          )}
                        </div>
                      )}
                      {msg.content && <p>{msg.content}</p>}
                      <span
                        className={`text-xs opacity-70 block mt-1 ${msg.sender._id === user._id ? "text-right" : ""}`}
                      >
                        {new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                <div className="chat-input p-6 border-t border-white/20 flex flex-col gap-3">
                  {fileError && (
                    <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-3 rounded-xl text-sm">
                      {fileError}
                    </div>
                  )}
                  <div className="flex gap-3 items-end">
                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 text-white/70 hover:text-white transition-colors"
                    >
                      <Paperclip size={20} />
                    </button>
                    <input
                      type="text"
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="flex-1 p-4 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-white/50 outline-none focus:bg-white/20 focus:border-primary"
                    />
                    <button
                      onClick={handleSend}
                      disabled={!newMessage.trim() && !selectedFile}
                      className="send-btn p-4 bg-primary hover:bg-primaryHover rounded-2xl text-white transition-all disabled:opacity-50"
                    >
                      <Send size={20} />
                    </button>
                  </div>

                  {mediaPreview && (
                    <div className="relative bg-white/10 p-4 rounded-2xl border border-white/20">
                      <button
                        onClick={() => {
                          setSelectedFile(null);
                          setMediaPreview(null);
                        }}
                        className="absolute top-2 right-2 bg-red-500 p-1 rounded-full text-white text-sm"
                      >
                        ✕
                      </button>
                      {mediaPreview.type === "video" ? (
                        <video
                          src={mediaPreview.url}
                          controls
                          className="max-w-xs rounded-lg"
                        />
                      ) : mediaPreview.type === "image" ? (
                        <img
                          src={mediaPreview.url}
                          alt="preview"
                          className="max-w-xs rounded-lg"
                        />
                      ) : (
                        <div className="max-w-xs p-4 rounded-lg bg-white/10 border border-white/20 text-white text-sm">
                          <div className="font-semibold mb-2">
                            File ready to send
                          </div>
                          <div className="truncate">{mediaPreview.name}</div>
                        </div>
                      )}
                      <p className="text-white text-xs mt-2">
                        {mediaPreview.name}
                      </p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-white/50">
                <p>Select a chat or group to start messaging</p>
              </div>
            )}
          </GlassCard>

          {/* Right Sidebar - Group Info & Add Members */}
          {currentChatType === "group" && showGroupInfo && currentGroupData && (
            <aside className="group-info overflow-y-auto max-h-[calc(100vh-200px)]">
              <GlassCard className="flex flex-col gap-4">
                <div>
                  <h3 className="text-lg font-bold text-white mb-2">
                    {currentGroupData.name}
                  </h3>
                  <p className="text-sm text-white/70">
                    {currentGroupData.description || "No description"}
                  </p>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-white/70 mb-3 flex items-center gap-2">
                    👑 Admin
                  </h4>
                  <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full bg-gradient-to-r from-primary to-accent"
                        style={{
                          backgroundImage: currentGroupData.createdBy.avatar
                            ? `url(${currentGroupData.createdBy.avatar})`
                            : "none",
                          backgroundSize: "cover",
                        }}
                      />
                      <div>
                        <div className="text-white font-medium">
                          {currentGroupData.createdBy.name}
                        </div>
                        <div className="text-white/60 text-sm">
                          Group Creator
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-white/70 mb-3 flex items-center gap-2">
                    <Users size={16} /> Members (
                    {currentGroupData.members?.length || 0})
                  </h4>
                  <div className="space-y-2">
                    {currentGroupData.members?.map((member) => {
                      const isCreator =
                        currentGroupData.createdBy._id === member._id;
                      const isAdmin =
                        isCreator ||
                        currentGroupData.admins?.some(
                          (admin) => admin._id === member._id,
                        );
                      const currentUserIsAdmin =
                        currentGroupData.createdBy._id === user._id ||
                        currentGroupData.admins?.some(
                          (admin) => admin._id === user._id,
                        );

                      return (
                        <div
                          key={member._id}
                          className="p-2 bg-white/5 rounded-lg flex items-center justify-between text-white text-sm"
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <div
                              className="w-8 h-8 rounded-full bg-gradient-to-r from-primary to-accent"
                              style={{
                                backgroundImage: member.avatar
                                  ? `url(${member.avatar})`
                                  : "none",
                                backgroundSize: "cover",
                              }}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="truncate flex items-center gap-2">
                                {member.name}
                                {isAdmin && (
                                  <span className="text-xs bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded">
                                    {isCreator ? "Creator" : "Admin"}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Admin action buttons */}
                          {currentUserIsAdmin && member._id !== user._id && (
                            <div className="flex gap-1">
                              {!isAdmin && (
                                <button
                                  onClick={() =>
                                    handlePromoteToAdmin(member._id)
                                  }
                                  className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium transition-all"
                                  title="Promote to Admin"
                                >
                                  👑
                                </button>
                              )}
                              {isAdmin && !isCreator && (
                                <button
                                  onClick={() =>
                                    handleDemoteFromAdmin(member._id)
                                  }
                                  className="px-2 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded text-xs font-medium transition-all"
                                  title="Demote from Admin"
                                >
                                  👤
                                </button>
                              )}
                              {!isCreator && (
                                <button
                                  onClick={() =>
                                    handleRemoveFromGroup(member._id)
                                  }
                                  className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium transition-all"
                                  title="Remove from Group"
                                >
                                  <X size={12} />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Add Members Section */}
                {currentGroupData.createdBy._id === user._id && (
                  <div>
                    <button
                      onClick={() => setShowAddMembers(!showAddMembers)}
                      className="w-full py-2 px-4 bg-primary hover:bg-primaryHover text-white rounded-lg text-sm font-medium transition-all"
                    >
                      + Add Members
                    </button>

                    {showAddMembers && availableMembersToAdd.length > 0 && (
                      <div className="mt-4 space-y-2 max-h-48 overflow-y-auto">
                        {availableMembersToAdd.map((newMember) => (
                          <label
                            key={newMember._id}
                            className="flex items-center gap-2 p-2 bg-white/5 hover:bg-white/10 rounded-lg cursor-pointer transition-all"
                          >
                            <input
                              type="checkbox"
                              checked={selectedMembers.has(newMember._id)}
                              onChange={(e) => {
                                const newSet = new Set(selectedMembers);
                                if (e.target.checked) {
                                  newSet.add(newMember._id);
                                } else {
                                  newSet.delete(newMember._id);
                                }
                                setSelectedMembers(newSet);
                              }}
                              className="w-4 h-4 cursor-pointer"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-white text-sm truncate">
                                {newMember.name}
                              </div>
                            </div>
                          </label>
                        ))}

                        {selectedMembers.size > 0 && (
                          <button
                            onClick={handleAddMembersToGroup}
                            className="w-full mt-3 py-2 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-all"
                          >
                            Add {selectedMembers.size} Member
                            {selectedMembers.size > 1 ? "s" : ""}
                          </button>
                        )}
                      </div>
                    )}

                    {showAddMembers && availableMembersToAdd.length === 0 && (
                      <p className="text-white/50 text-xs mt-2 text-center">
                        All users are already in this group
                      </p>
                    )}
                  </div>
                )}

                {/* Join Requests Section - Only for group admin */}
                {currentGroupData.createdBy._id === user._id &&
                  currentGroupData.joinRequests?.length > 0 && (
                    <div className="border-t border-white/10 pt-4">
                      <div className="mb-3">
                        <h4 className="text-sm font-semibold text-yellow-400 mb-2 flex items-center gap-2">
                          📋 Pending Join Requests (
                          {currentGroupData.joinRequests.length})
                        </h4>
                        <button
                          onClick={() => setShowJoinRequests(!showJoinRequests)}
                          className="w-full py-2 px-4 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm font-medium transition-all"
                        >
                          {showJoinRequests ? "Hide Requests" : "Show Requests"}
                        </button>
                      </div>

                      {showJoinRequests && (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {currentGroupData.joinRequests.map((requestUser) => (
                            <div
                              key={requestUser._id}
                              className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-center justify-between"
                            >
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-8 h-8 rounded-full bg-gradient-to-r from-primary to-accent"
                                  style={{
                                    backgroundImage: requestUser.avatar
                                      ? `url(${requestUser.avatar})`
                                      : "none",
                                    backgroundSize: "cover",
                                  }}
                                />
                                <div>
                                  <div className="text-white text-sm font-medium">
                                    {requestUser.name}
                                  </div>
                                  <div className="text-white/60 text-xs">
                                    Wants to join
                                  </div>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() =>
                                    handleAcceptJoinRequest(requestUser._id)
                                  }
                                  className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-medium transition-all flex items-center gap-1"
                                >
                                  <Check size={12} /> Accept
                                </button>
                                <button
                                  onClick={() =>
                                    handleRejectJoinRequest(requestUser._id)
                                  }
                                  className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium transition-all flex items-center gap-1"
                                >
                                  <X size={12} /> Reject
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
              </GlassCard>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
//   const [allUsers, setAllUsers] = useState([]);
//   const [currentChatId, setCurrentChatId] = useState(null);
//   const [currentChatUser, setCurrentChatUser] = useState(null);
//   const [currentChatName, setCurrentChatName] = useState("");
//   const [currentChatType, setCurrentChatType] = useState(null); // "1v1" or "group"
//   const [currentGroupId, setCurrentGroupId] = useState(null);
//   const [messages, setMessages] = useState([]);
//   const [newMessage, setNewMessage] = useState("");
//   const [mediaPreview, setMediaPreview] = useState(null);
//   const [selectedFile, setSelectedFile] = useState(null);
//   const [fileError, setFileError] = useState("");
//   const messagesEndRef = useRef(null);
//   const fileInputRef = useRef(null);
//   const socketRef = useRef(null);

//   useEffect(() => {
//     if (!user?._id) return;

//     socketRef.current = io(SOCKET_URL, {
//       query: { userId: user._id },
//     });

//     socketRef.current.on("receive_message", (msg) => {
//       setMessages((prev) => [...prev, msg]);
//     });

//     socketRef.current.on("receive_group_message", (msg) => {
//       // Check if message is for the currently selected group
//       if (msg.group && currentGroupId && msg.group.toString() === currentGroupId.toString()) {
//         setMessages((prev) => [...prev, msg]);
//       }
//     });

//     socketRef.current.on("chat_update", ({ senderId }) => {
//       loadChats();
//     });

//     loadChats();
//     loadGroups();

//     return () => {
//       socketRef.current.disconnect();
//     };
//   }, [user]);

//   const loadChats = async () => {
//     try {
//       console.log("Loading chats for user:", user._id);
//       const res = await api.get(`/messages/chats/${user._id}`);
//       console.log("Chats loaded:", res.data);
//       setChats(res.data);
//     } catch (error) {
//       console.error("Load chats error", error);
//       setChats([]);
//     }
//   };

//   const loadGroups = async () => {
//     try {
//       const res = await api.get(`/groups/user/${user._id}`);
//       console.log("Groups loaded:", res.data);
//       setGroups(res.data);
//     } catch (error) {
//       console.error("Load groups error", error);
//       setGroups([]);
//     }
//   };

//   const loadUsers = async () => {
//     try {
//       const res = await api.get(`/users/all/${user._id}`);
//       console.log("Users loaded:", res.data);
//       setAllUsers(res.data);
//     } catch (error) {
//       console.error("Load users error", error);
//       setAllUsers([]);
//     }
//   };

//   useEffect(() => {
//     if (user?._id) {
//       loadUsers();
//     }
//   }, [user]);

//   const loadMessages = async (chatId, type) => {
//     try {
//       if (type === "1v1") {
//         console.log("Loading messages between", user._id, "and", chatId);
//         const res = await api.get(`/messages/${user._id}/${chatId}`);
//         console.log("Messages loaded:", res.data);
//         setMessages(res.data);
//       } else if (type === "group") {
//         const res = await api.get(`/groups/${chatId}/messages`);
//         console.log("Group messages loaded:", res.data);
//         setMessages(res.data);
//       }
//     } catch (error) {
//       console.error("Load messages error", error);
//       setMessages([]);
//     }
//   };

//   const scrollToBottom = () => {
//     messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
//   };

//   useEffect(() => {
//     scrollToBottom();
//   }, [messages]);

//   const handleChatSelect = (chat) => {
//     // Leave group if switching to 1v1
//     if (currentGroupId) {
//       socketRef.current.emit("leave_group", currentGroupId);
//     }

//     setCurrentChatId(chat.userId);
//     setCurrentChatUser(chat.user);
//     setCurrentChatName(chat.user.name);
//     setCurrentChatType("1v1");
//     setCurrentGroupId(null);
//     loadMessages(chat.userId, "1v1");
//   };

//   const handleGroupSelect = (group) => {
//     // Leave previous room if any
//     if (currentGroupId) {
//       socketRef.current.emit("leave_group", currentGroupId);
//     }

//     setCurrentGroupId(group._id);
//     setCurrentChatName(group.name);
//     setCurrentChatType("group");
//     setCurrentChatId(null);
//     setCurrentChatUser(null);

//     // Join new group room
//     socketRef.current.emit("join_group", group._id);

//     loadMessages(group._id, "group");
//   };

//   const handleUserSelect = (user) => {
//     // Leave group if switching to 1v1
//     if (currentGroupId) {
//       socketRef.current.emit("leave_group", currentGroupId);
//     }

//     setCurrentChatId(user._id);
//     setCurrentChatUser(user);
//     setCurrentChatName(user.name);
//     setCurrentChatType("1v1");
//     setCurrentGroupId(null);
//     loadMessages(user._id, "1v1");
//   };

//   const handleFileSelect = (e) => {
//     const file = e.target.files[0];
//     setFileError("");

//     if (file) {
//       // Check file extension
//       const fileName = file.name;
//       const ext = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();

//       if (BLOCKED_EXTENSIONS.includes(ext)) {
//         setFileError(`❌ File type ${ext} is blocked! (${ext === '.exe' ? 'Executable' : ext === '.zip' || ext === '.rar' ? 'Archive' : 'Dangerous'} files not allowed)`);
//         setSelectedFile(null);
//         setMediaPreview(null);
//         return;
//       }

//       if (!file.type.startsWith("image") && !file.type.startsWith("video")) {
//         setFileError("❌ Only images and videos are allowed!");
//         setSelectedFile(null);
//         setMediaPreview(null);
//         return;
//       }

//       setSelectedFile(file);
//       const reader = new FileReader();
//       reader.onloadend = () => {
//         setMediaPreview({
//           url: reader.result,
//           type: file.type.startsWith("video") ? "video" : "image",
//           name: file.name,
//         });
//       };
//       reader.readAsDataURL(file);
//     }
//   };

//   const handleSend = async () => {
//     if ((newMessage.trim() || selectedFile) && user._id) {
//       if (currentChatType === "1v1" && !currentChatId) return;
//       if (currentChatType === "group" && !currentGroupId) return;

//       try {
//         if (currentChatType === "1v1") {
//           if (selectedFile) {
//             const formData = new FormData();
//             formData.append("senderId", user._id);
//             formData.append("receiverId", currentChatId);
//             formData.append("content", newMessage || "");
//             formData.append("media", selectedFile);

//             const response = await api.post("/messages", formData, {
//               headers: { "Content-Type": "multipart/form-data" },
//             });
//             console.log("File message saved:", response.data);
//             socketRef.current.emit("send_message", response.data);
//           } else if (newMessage.trim()) {
//             const data = {
//               senderId: user._id,
//               receiverId: currentChatId,
//               content: newMessage,
//             };
//             await api.post("/messages", data);
//             socketRef.current.emit("send_message", data);
//           }
//         } else if (currentChatType === "group") {
//           if (selectedFile) {
//             const formData = new FormData();
//             formData.append("senderId", user._id);
//             formData.append("groupId", currentGroupId);
//             formData.append("content", newMessage || "");
//             formData.append("media", selectedFile);

//             const response = await api.post("/groups/message", formData, {
//               headers: { "Content-Type": "multipart/form-data" },
//             });
//             socketRef.current.emit("send_group_message", response.data);
//           } else if (newMessage.trim()) {
//             const data = {
//               senderId: user._id,
//               groupId: currentGroupId,
//               content: newMessage,
//             };
//             const response = await api.post("/groups/message", data);
//             socketRef.current.emit("send_group_message", response.data);
//           }
//         }

//         setNewMessage("");
//         setSelectedFile(null);
//         setMediaPreview(null);
//         setFileError("");
//       } catch (error) {
//         console.error("Send message error", error);
//         setFileError("❌ Failed to send message: " + (error.response?.data?.message || error.message));
//       }
//     }
//   };

//   const handleKeyPress = (e) => {
//     if (e.key === "Enter") handleSend();
//   };

//   if (!user) return <div>Loading...</div>;

//   return (
//     <div className="home-body">
//       <div className=" p-4 md:p-10 mt-10">
//         <div className="chat-wrapper grid grid-cols-1 xl:grid-cols-[300px_1fr] gap-6 max-w-6xl mx-auto min-h-[calc(100vh-180px)]">
//           {/* Left Sidebar - Chats */}
//           <aside className="chat-sidebar overflow-y-auto max-h-[calc(100vh-200px)]">
//             <h3 className="text-xl font-bold text-white mb-6 sticky top-0 bg-gradient-to-b from-black/30 p-4">
//               💬 Chats & Groups
//             </h3>

//             {/* Groups Section */}
//             {groups.length > 0 && (
//               <div className="mb-6">
//                 <h4 className="text-sm font-semibold text-white/70 px-4 mb-3">
//                   👥 My Groups
//                 </h4>
//                 {groups.map((group) => (
//                   <div
//                     key={group._id}
//                     className={`chat-user p-4 cursor-pointer transition-all rounded-xl mb-2 text-white hover:bg-white/10 ${
//                       currentGroupId === group._id
//                         ? "bg-primary/20 border border-primary/30"
//                         : ""
//                     }`}
//                     onClick={() => handleGroupSelect(group)}
//                   >
//                     <div className="flex items-center gap-3">
//                       <div className="w-10 h-10 rounded-full bg-gradient-to-r from-accent to-primary flex items-center justify-center font-bold">
//                         {group.name.charAt(0).toUpperCase()}
//                       </div>
//                       <div className="flex-1 min-w-0">
//                         <div className="font-medium truncate">
//                           {group.name}
//                         </div>
//                         <div className="text-xs text-white/60">
//                           {group.members.length} members
//                         </div>
//                       </div>
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             )}

//             {/* Existing Chats */}
//             {chats.length > 0 && (
//               <div className="mb-6">
//                 <h4 className="text-sm font-semibold text-white/70 px-4 mb-3">
//                   Direct Messages
//                 </h4>
//                 {chats.map((chat) => (
//                   <div
//                     key={chat.userId}
//                     className={`chat-user p-4 cursor-pointer transition-all rounded-xl mb-2 text-white hover:bg-white/10 ${
//                       currentChatId === chat.userId && currentChatType === "1v1"
//                         ? "bg-primary/20 border border-primary/30"
//                         : ""
//                     }`}
//                     onClick={() => handleChatSelect(chat)}
//                   >
//                     <div className="flex items-center gap-3">
//                       <div
//                         className="w-10 h-10 rounded-full bg-gradient-to-r from-primary to-accent"
//                         style={{
//                           backgroundImage: `url(${chat.user.avatar})`,
//                           backgroundSize: "cover",
//                         }}
//                       />
//                       <div className="flex-1 min-w-0">
//                         <div className="font-medium truncate">
//                           {chat.user.name}
//                         </div>
//                         <div className="text-xs text-white/60 truncate">
//                           {chat.lastMessage || "No messages yet"}
//                         </div>
//                       </div>
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             )}

//             {/* Available Users to Chat */}
//             {allUsers.length > 0 && (
//               <div>
//                 <h4 className="text-sm font-semibold text-white/70 px-4 mb-3">
//                   👥 Available Users
//                 </h4>
//                 {allUsers
//                   .filter((u) => !chats.find((chat) => chat.userId === u._id))
//                   .map((user) => (
//                     <div
//                       key={user._id}
//                       className={`chat-user p-4 cursor-pointer transition-all rounded-xl mb-2 text-white hover:bg-white/10 ${
//                         currentChatId === user._id && currentChatType === "1v1"
//                           ? "bg-primary/20 border border-primary/30"
//                           : ""
//                       }`}
//                       onClick={() => handleUserSelect(user)}
//                     >
//                       <div className="flex items-center gap-3">
//                         <div
//                           className="w-10 h-10 rounded-full bg-gradient-to-r from-primary to-accent"
//                           style={{
//                             backgroundImage: `url(${user.avatar})`,
//                             backgroundSize: "cover",
//                           }}
//                         />
//                         <div className="flex-1 min-w-0">
//                           <div className="font-medium truncate">
//                             {user.name}
//                           </div>
//                           <div className="text-xs text-white/60">
//                             {user.bio || "No bio"}
//                           </div>
//                         </div>
//                       </div>
//                     </div>
//                   ))}
//               </div>
//             )}

//             {chats.length === 0 && allUsers.length === 0 && groups.length === 0 && (
//               <div className="text-white/50 text-center py-8">
//                 No chats or users available
//               </div>
//             )}
//           </aside>

//           {/* Main Chat */}
//           <GlassCard className="chat-main flex flex-col max-h-[calc(100vh-200px)]">
//             {currentChatName ? (
//               <>
//                 <div className="chat-header p-6 border-b border-white/20">
//                   <strong className="chat-name text-2xl text-white">
//                     {currentChatName} <span className="text-sm text-white/50">({currentChatType === "group" ? "Group" : "Direct"})</span>
//                   </strong>
//                 </div>

//                 <div className="chat-messages flex-1 overflow-y-auto p-6 space-y-4">
//                   {messages.map((msg) => (
//                     <div
//                       key={msg._id}
//                       className={`message p-3 rounded-2xl max-w-xs ${
//                         msg.sender._id === user._id
//                           ? "bg-primary ml-auto text-white rounded-br-sm"
//                           : "bg-white/10 mr-auto rounded-bl-sm"
//                       }`}
//                     >
//                       {currentChatType === "group" && msg.sender._id !== user._id && (
//                         <p className="text-xs font-semibold text-white/70 mb-1">
//                           {msg.sender.name}
//                         </p>
//                       )}
//                       {msg.mediaUrl && (
//                         <div className="mb-2">
//                           {msg.mediaType === "video" ? (
//                             <video
//                               src={msg.mediaUrl}
//                               controls
//                               className="max-w-xs rounded-lg"
//                             />
//                           ) : (
//                             <img
//                               src={msg.mediaUrl}
//                               alt="shared"
//                               className="max-w-xs rounded-lg"
//                             />
//                           )}
//                         </div>
//                       )}
//                       {msg.content && <p>{msg.content}</p>}
//                       <span
//                         className={`text-xs opacity-70 block mt-1 ${
//                           msg.sender._id === user._id ? "text-right" : ""
//                         }`}
//                       >
//                         {new Date(msg.createdAt).toLocaleTimeString([], {
//                           hour: "2-digit",
//                           minute: "2-digit",
//                         })}
//                       </span>
//                     </div>
//                   ))}
//                   <div ref={messagesEndRef} />
//                 </div>

//                 <div className="chat-input p-6 border-t border-white/20 flex flex-col gap-3">
//                   {fileError && (
//                     <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-3 rounded-xl text-sm">
//                       {fileError}
//                     </div>
//                   )}
//                   <div className="flex gap-3 items-end">
//                     <input
//                       ref={fileInputRef}
//                       type="file"
//                       accept="image/*,video/*"
//                       onChange={handleFileSelect}
//                       className="hidden"
//                     />
//                     <button
//                       onClick={() => fileInputRef.current?.click()}
//                       className="p-2 text-white/70 hover:text-white transition-colors"
//                       title="Click to attach image or video"
//                     >
//                       <Paperclip size={20} />
//                     </button>
//                     <input
//                       type="text"
//                       placeholder="Type a message..."
//                       value={newMessage}
//                       onChange={(e) => setNewMessage(e.target.value)}
//                       onKeyPress={handleKeyPress}
//                       className="flex-1 p-4 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-white/50 outline-none focus:bg-white/20 focus:border-primary"
//                     />
//                     <button
//                       onClick={handleSend}
//                       disabled={!newMessage.trim() && !selectedFile}
//                       className="send-btn p-4 bg-primary hover:bg-primaryHover rounded-2xl text-white transition-all disabled:opacity-50"
//                     >
//                       <Send size={20} />
//                     </button>
//                   </div>

//                   {mediaPreview && (
//                     <div className="relative bg-white/10 p-4 rounded-2xl border border-white/20">
//                       <button
//                         onClick={() => {
//                           setSelectedFile(null);
//                           setMediaPreview(null);
//                         }}
//                         className="absolute top-2 right-2 bg-red-500 p-1 rounded-full text-white text-sm"
//                       >
//                         ✕
//                       </button>
//                       {mediaPreview.type === "video" ? (
//                         <video
//                           src={mediaPreview.url}
//                           controls
//                           className="max-w-xs rounded-lg"
//                         />
//                       ) : (
//                         <img
//                           src={mediaPreview.url}
//                           alt="preview"
//                           className="max-w-xs rounded-lg"
//                         />
//                       )}
//                       <p className="text-white text-xs mt-2">{mediaPreview.name}</p>
//                     </div>
//                   )}
//                 </div>
//               </>
//             ) : (
//               <div className="flex-1 flex items-center justify-center text-white/50">
//                 <p>Select a chat or group to start messaging</p>
//               </div>
//             )}
//           </GlassCard>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default ChatPage;
