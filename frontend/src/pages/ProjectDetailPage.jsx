import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import { useAuth } from "../context/AuthContext.jsx";
import GlassCard from "../components/GlassCard.jsx";
import api from "../utils/api.js";
import {
  Upload,
  Download,
  Eye,
  Trash2,
  Send,
  ChevronDown,
  Copy,
  Users,
  UserPlus,
  X,
  Check,
  AlertCircle,
} from "lucide-react";

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL || `http://${window.location.hostname}:1234`;

const ProjectDetailPage = () => {
  const { projectId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  // State
  const [project, setProject] = useState(null);
  const [versions, setVersions] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [versionMessage, setVersionMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedVersions, setSelectedVersions] = useState([null, null]);
  const [comparisonResult, setComparisonResult] = useState(null);

  // Member management
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const [showMemberPanel, setShowMemberPanel] = useState(false);
  const [addingMembers, setAddingMembers] = useState(false);

  // Change request workflow
  const [pendingChanges, setPendingChanges] = useState([]);
  const [showPendingChanges, setShowPendingChanges] = useState(false);
  const [loadingChanges, setLoadingChanges] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [changingRequestId, setChangingRequestId] = useState(null);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const socketRef = useRef(null);

  // Initialize socket connection
  useEffect(() => {
    if (!user?._id || !projectId) return;

    socketRef.current = io(SOCKET_URL, {
      query: { userId: user._id },
    });

    socketRef.current.on("connect", () => {
      console.log("Socket connected for project");
      socketRef.current.emit("join_project", projectId);
    });

    socketRef.current.on("receive_project_message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    socketRef.current.on("version_update", (versionData) => {
      setVersions((prev) => [versionData, ...prev]);
      setProject((prev) => ({
        ...prev,
        versionCount: prev.versionCount + 1,
      }));
    });

    socketRef.current.on("disconnect", () => {
      console.log("Socket disconnected");
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.emit("leave_project", projectId);
        socketRef.current.disconnect();
      }
    };
  }, [user, projectId]);

  // Load project data
  useEffect(() => {
    if (projectId) {
      loadProject();
    }
  }, [projectId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadProject = async () => {
    try {
      setLoading(true);
      const [projectRes, versionsRes, messagesRes] = await Promise.all([
        api.get(`/projects/${projectId}`),
        api.get(`/projects/${projectId}/versions`),
        api.get(`/projects/${projectId}/messages`),
      ]);
      setProject(projectRes.data);
      setVersions(versionsRes.data);
      setMessages(messagesRes.data);
    } catch (error) {
      console.error("Error loading project:", error);
      alert("❌ Failed to load project");
      navigate("/projects");
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableUsers = async () => {
    try {
      const res = await api.get(`/users/all/${user._id}`);
      const currentMembers = project.members.map((m) => m._id);
      const available = res.data.filter(
        (u) =>
          u._id !== project.createdBy._id && !currentMembers.includes(u._id),
      );
      setAvailableUsers(available);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const handleAddMembers = async () => {
    if (selectedUsers.size === 0) {
      alert("❌ Select at least one user");
      return;
    }

    try {
      setAddingMembers(true);
      for (const userId of selectedUsers) {
        await api.put(`/projects/${projectId}/add-member`, { userId });
      }
      setSelectedUsers(new Set());
      setShowMemberPanel(false);
      loadProject();
      alert("✅ Members added successfully!");
    } catch (error) {
      console.error("Error adding members:", error);
      alert("❌ Failed to add members");
    } finally {
      setAddingMembers(false);
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!confirm("Remove this member from the project?")) return;

    try {
      await api.put(`/projects/${projectId}/remove-member`, {
        memberId,
      });
      loadProject();
      alert("✅ Member removed");
    } catch (error) {
      console.error("Error removing member:", error);
      alert("❌ Failed to remove member");
    }
  };

  const fetchPendingChanges = async () => {
    try {
      setLoadingChanges(true);
      const res = await api.get(`/projects/${projectId}/pending-changes`);
      setPendingChanges(res.data);
    } catch (error) {
      console.error("Error fetching pending changes:", error);
    } finally {
      setLoadingChanges(false);
    }
  };

  const handleApproveChange = async (requestId) => {
    try {
      setChangingRequestId(requestId);
      await api.put(`/projects/${projectId}/approve-change/${requestId}`);
      setPendingChanges((prev) => prev.filter((r) => r._id !== requestId));
      loadProject();
      alert("✅ Version approved and released!");
    } catch (error) {
      console.error("Error approving change:", error);
      alert("❌ Failed to approve change");
    } finally {
      setChangingRequestId(null);
    }
  };

  const handleRejectChange = async (requestId) => {
    if (!rejectionReason.trim()) {
      alert("❌ Please provide a rejection reason");
      return;
    }

    try {
      setChangingRequestId(requestId);
      await api.put(`/projects/${projectId}/reject-change/${requestId}`, {
        reason: rejectionReason,
      });
      setPendingChanges((prev) => prev.filter((r) => r._id !== requestId));
      setSelectedRequest(null);
      setRejectionReason("");
      alert("✅ Change rejected");
    } catch (error) {
      console.error("Error rejecting change:", error);
      alert("❌ Failed to reject change");
    } finally {
      setChangingRequestId(null);
    }
  };

  const handleSubmitChanges = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      alert("❌ Please select a file");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("message", versionMessage);

    try {
      setUploading(true);
      await api.post(`/projects/${projectId}/submit-changes`, formData);
      setSelectedFile(null);
      setVersionMessage("");
      fileInputRef.current.value = "";
      alert("✅ Changes submitted for review!");
    } catch (error) {
      console.error("Error submitting changes:", error);
      alert("❌ Failed to submit changes");
    } finally {
      setUploading(false);
    }
  };

  const handleUploadVersion = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      alert("❌ Please select a file");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("message", versionMessage);

    try {
      setUploading(true);
      await api.post(`/projects/${projectId}/versions`, formData);
      setSelectedFile(null);
      setVersionMessage("");
      fileInputRef.current.value = "";
      loadProject();
      alert("✅ Version uploaded successfully!");
    } catch (error) {
      console.error("Error uploading version:", error);
      alert("❌ Failed to upload version");
    } finally {
      setUploading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      await api.post(`/projects/${projectId}/messages`, {
        content: newMessage,
      });
      setNewMessage("");
      loadProject();
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleDeleteVersion = async (versionId) => {
    if (!confirm("Are you sure you want to delete this version?")) return;

    try {
      await api.delete(`/projects/${projectId}/versions/${versionId}`);
      loadProject();
      alert("✅ Version deleted");
    } catch (error) {
      console.error("Error deleting version:", error);
      alert("❌ Failed to delete version");
    }
  };

  const handleDownloadVersion = async (version) => {
    try {
      // Increment download count
      await api.post(`/projects/versions/${version._id}/download`);
      // Open file in new window
      window.open(version.fileUrl, "_blank");
    } catch (error) {
      console.error("Error downloading:", error);
    }
  };

  const handleCompareVersions = async () => {
    if (!selectedVersions[0] || !selectedVersions[1]) {
      alert("❌ Please select two versions to compare");
      return;
    }

    try {
      const res = await api.post(`/projects/${projectId}/versions/compare`, {
        versionId1: selectedVersions[0],
        versionId2: selectedVersions[1],
      });
      setComparisonResult(res.data);
    } catch (error) {
      console.error("Error comparing versions:", error);
      alert("❌ Failed to compare versions");
    }
  };

  const isCreator = project && project.createdBy._id === user._id;
  const isMember =
    project && (isCreator || project.members.some((m) => m._id === user._id));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center home-body">
        <p className="text-white text-xl">Loading project...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center home-body">
        <p className="text-white text-xl">Project not found</p>
      </div>
    );
  }

  return (
    <div className="home-body">
      <div className="min-h-screen p-6 mt-10">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => navigate("/projects")}
              className="text-primary hover:text-primaryHover mb-4 font-semibold"
            >
              ← Back to Projects
            </button>
            <h1 className="text-3xl font-bold text-white">{project.title}</h1>
            <p className="text-white/60 mt-2">{project.description}</p>
            <div className="flex items-center gap-4 mt-4">
              <span className="text-sm text-white/60">
                Created by {project.createdBy.name}
              </span>
              <span className="text-sm text-white/60">
                {project.members.length} members
              </span>
              <span className="text-sm bg-primary/20 text-primary px-3 py-1 rounded-full">
                {project.versionCount} versions
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* Left: Versions & Change Requests */}

            {/* Left: Versions */}
            <div className="space-y-6">
              {/* Upload/Submit Section */}
              {isMember && (
                <GlassCard className="p-6">
                  <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Upload size={20} className="text-primary" />
                    {isCreator
                      ? "Upload New Version"
                      : "Submit Changes for Review"}
                  </h2>
                  <form
                    onSubmit={
                      isCreator ? handleUploadVersion : handleSubmitChanges
                    }
                    className="space-y-4"
                  >
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        Select File
                      </label>
                      <input
                        ref={fileInputRef}
                        type="file"
                        onChange={(e) => setSelectedFile(e.target.files[0])}
                        className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white file:bg-primary file:border-0 file:text-white file:px-4 file:py-2 file:rounded file:cursor-pointer transition-all"
                      />
                      {selectedFile && (
                        <p className="text-sm text-primary mt-2">
                          File: {selectedFile.name} (
                          {(selectedFile.size / 1024).toFixed(2)} KB)
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        {isCreator ? "Commit Message" : "Change Description"}
                      </label>
                      <textarea
                        value={versionMessage}
                        onChange={(e) => setVersionMessage(e.target.value)}
                        placeholder={
                          isCreator
                            ? "e.g., Fixed login bug, Added auth validation"
                            : "Describe the changes you're submitting..."
                        }
                        rows="3"
                        className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:bg-white/20 focus:border-primary outline-none transition-all"
                      />
                    </div>
                    {!isCreator && (
                      <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg text-blue-200 text-sm">
                        <AlertCircle size={16} className="inline mr-2" />
                        Your changes will be sent to the project creator for
                        review.
                      </div>
                    )}
                    <button
                      type="submit"
                      disabled={uploading}
                      className="w-full py-2 bg-primary hover:bg-primaryHover disabled:opacity-50 text-white rounded-lg font-semibold transition-all"
                    >
                      {uploading
                        ? "Uploading..."
                        : isCreator
                          ? "Upload Version"
                          : "Submit for Review"}
                    </button>
                  </form>
                </GlassCard>
              )}

              {/* Version History */}
              <GlassCard className="p-6">
                <h2 className="text-xl font-bold text-white mb-4">
                  Version History
                </h2>
                {versions.length === 0 ? (
                  <p className="text-white/60 text-center py-8">
                    No versions yet. Upload the first version to get started!
                  </p>
                ) : (
                  <div className="space-y-3">
                    {versions.map((version) => (
                      <div
                        key={version._id}
                        className="bg-white/5 p-4 rounded-lg hover:bg-white/10 transition-all"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-lg font-bold text-primary">
                                v{version.versionNumber}
                              </span>
                              <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">
                                {version.uploadedBy.name}
                              </span>
                            </div>
                            <p className="text-white font-semibold">
                              {version.fileName}
                            </p>
                            <p className="text-white/60 text-sm mt-1">
                              {version.message}
                            </p>
                            <div className="flex gap-4 mt-2 text-xs text-white/50">
                              <span>{version.fileSize} KB</span>
                              <span>📥 {version.downloadCount} downloads</span>
                              <span>
                                {new Date(
                                  version.createdAt,
                                ).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-2 ml-4">
                            <button
                              onClick={() => handleDownloadVersion(version)}
                              className="p-2 bg-primary/20 hover:bg-primary/30 text-primary rounded-lg transition-all"
                              title="Download"
                            >
                              <Download size={18} />
                            </button>
                            {isCreator && (
                              <button
                                onClick={() => handleDeleteVersion(version._id)}
                                className="p-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-all"
                                title="Delete"
                              >
                                <Trash2 size={18} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </GlassCard>
            </div>
            {/* Right: Members & Chat */}
            {/* Chat Room */}
            <div className="space-y-6">
              <GlassCard className="h-[400px] flex flex-col p-6  lg:top-24">
                <h2 className="text-lg font-bold text-white mb-4">
                  Project Chat
                </h2>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                  {messages.length === 0 ? (
                    <p className="text-white/60 text-center py-8 text-sm">
                      No messages yet
                    </p>
                  ) : (
                    messages.map((msg) => (
                      <div
                        key={msg._id}
                        className={`py-2 px-3 rounded-lg text-sm ${
                          msg.messageType === "version_upload"
                            ? "bg-primary/20 text-primary border border-primary/30"
                            : "bg-white/5 text-white"
                        }`}
                      >
                        <div className="font-semibold text-xs">
                          {msg.sender.name}
                        </div>
                        <p className="mt-1">{msg.content}</p>
                        <div className="text-xs opacity-60 mt-1">
                          {new Date(msg.createdAt).toLocaleTimeString()}
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                {isMember && (
                  <form onSubmit={handleSendMessage} className="flex gap-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Say something..."
                      className="flex-1 p-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 text-sm focus:bg-white/20 focus:border-primary outline-none transition-all"
                    />
                    <button
                      type="submit"
                      className="p-2 bg-primary hover:bg-primaryHover text-white rounded-lg transition-all"
                    >
                      <Send size={18} />
                    </button>
                  </form>
                )}
              </GlassCard>

              {isCreator && (
                <GlassCard className="p-6">
                  <button
                    onClick={() => {
                      setShowPendingChanges(!showPendingChanges);
                      if (!showPendingChanges) {
                        fetchPendingChanges();
                      }
                    }}
                    className="w-full text-left font-semibold text-white flex items-center justify-between hover:text-primary transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <AlertCircle size={20} className="text-accent" />
                      Pending Change Requests
                      {pendingChanges.length > 0 && (
                        <span className="bg-accent text-white text-xs px-2 py-1 rounded-full">
                          {pendingChanges.length}
                        </span>
                      )}
                    </span>
                    <ChevronDown
                      size={20}
                      className={`transition-transform ${
                        showPendingChanges ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {showPendingChanges && (
                    <div className="mt-4 space-y-3 max-h-96 overflow-y-auto">
                      {loadingChanges ? (
                        <p className="text-white/60 text-center py-4">
                          Loading requests...
                        </p>
                      ) : pendingChanges.length === 0 ? (
                        <p className="text-white/60 text-center py-4">
                          No pending requests
                        </p>
                      ) : (
                        pendingChanges.map((request) => (
                          <div
                            key={request._id}
                            className="bg-white/5 p-4 rounded-lg border border-accent/30"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-sm font-semibold text-accent">
                                    📝 {request.submittedBy.name}
                                  </span>
                                  <span className="text-xs text-white/50">
                                    v{request.nextVersionNumber}
                                  </span>
                                </div>
                                <p className="text-white font-semibold text-sm">
                                  {request.fileName}
                                </p>
                              </div>
                              <button
                                onClick={() =>
                                  setSelectedRequest(
                                    selectedRequest?._id === request._id
                                      ? null
                                      : request,
                                  )
                                }
                                className="text-white/60 hover:text-white"
                              >
                                <ChevronDown
                                  size={16}
                                  className={`transition-transform ${
                                    selectedRequest?._id === request._id
                                      ? "rotate-180"
                                      : ""
                                  }`}
                                />
                              </button>
                            </div>

                            <p className="text-white/60 text-xs mb-2">
                              {request.message}
                            </p>
                            <p className="text-white/50 text-xs">
                              {request.fileSize} KB ·{" "}
                              {new Date(request.createdAt).toLocaleString()}
                            </p>

                            {selectedRequest?._id === request._id && (
                              <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                                <div className="flex gap-2">
                                  <button
                                    onClick={() =>
                                      handleApproveChange(request._id)
                                    }
                                    disabled={changingRequestId === request._id}
                                    className="flex-1 py-2 bg-green-600/20 hover:bg-green-600/30 disabled:opacity-50 text-green-400 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-1"
                                  >
                                    <Check size={16} />
                                    Approve
                                  </button>
                                  <button
                                    onClick={() =>
                                      setSelectedRequest({
                                        ...selectedRequest,
                                        showRejectForm: true,
                                      })
                                    }
                                    disabled={changingRequestId === request._id}
                                    className="flex-1 py-2 bg-red-600/20 hover:bg-red-600/30 disabled:opacity-50 text-red-400 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-1"
                                  >
                                    <X size={16} />
                                    Reject
                                  </button>
                                </div>

                                {selectedRequest?.showRejectForm && (
                                  <div className="space-y-2 pt-2 border-t border-white/10">
                                    <textarea
                                      value={rejectionReason}
                                      onChange={(e) =>
                                        setRejectionReason(e.target.value)
                                      }
                                      placeholder="Reason for rejection..."
                                      rows="2"
                                      className="w-full p-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 text-sm focus:border-red-500 outline-none"
                                    />
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() =>
                                          handleRejectChange(request._id)
                                        }
                                        disabled={
                                          changingRequestId === request._id
                                        }
                                        className="flex-1 py-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm rounded-lg transition-all"
                                      >
                                        Confirm Reject
                                      </button>
                                      <button
                                        onClick={() => {
                                          setSelectedRequest(null);
                                          setRejectionReason("");
                                        }}
                                        className="flex-1 py-1 bg-white/10 hover:bg-white/20 text-white text-sm rounded-lg transition-all"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </GlassCard>
              )}

              {/* Members Section */}
              <GlassCard className="p-6">
                <button
                  onClick={() => {
                    setShowMemberPanel(!showMemberPanel);
                    if (!showMemberPanel && isCreator) {
                      fetchAvailableUsers();
                    }
                  }}
                  className="w-full text-left font-semibold text-white flex items-center justify-between hover:text-primary transition-colors mb-4"
                >
                  <span className="flex items-center gap-2">
                    <Users size={20} className="text-primary" />
                    Team Members ({project.members.length + 1})
                  </span>
                  <ChevronDown
                    size={20}
                    className={`transition-transform ${
                      showMemberPanel ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {showMemberPanel && (
                  <div className="space-y-4">
                    {/* Current Members */}
                    <div className="space-y-2">
                      {/* Creator */}
                      <div className="bg-white/5 p-3 rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1">
                          <div className="w-8 h-8 rounded-full bg-primary/30 text-primary flex items-center justify-center text-xs font-bold">
                            {project.createdBy.name[0].toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <p className="text-white text-sm font-semibold">
                              {project.createdBy.name}
                            </p>
                            <p className="text-white/50 text-xs">Creator</p>
                          </div>
                        </div>
                        <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">
                          👑
                        </span>
                      </div>

                      {/* Team Members */}
                      {project.members
                        .filter(
                          (member) => member._id !== project.createdBy._id,
                        )
                        .map((member) => (
                          <div
                            key={member._id}
                            className="bg-white/5 p-3 rounded-lg flex items-center justify-between hover:bg-white/10 transition-all"
                          >
                            <div className="flex items-center gap-2 flex-1">
                              <div className="w-8 h-8 rounded-full bg-accent/30 text-accent flex items-center justify-center text-xs font-bold">
                                {member.name[0].toUpperCase()}
                              </div>
                              <div className="flex-1">
                                <p className="text-white text-sm font-semibold">
                                  {member.name}
                                </p>
                                <p className="text-white/50 text-xs">Member</p>
                              </div>
                            </div>
                            {isCreator && (
                              <button
                                onClick={() => handleRemoveMember(member._id)}
                                className="p-1 text-red-400 hover:text-red-300 hover:bg-red-600/20 rounded transition-all"
                                title="Remove member"
                              >
                                <X size={16} />
                              </button>
                            )}
                          </div>
                        ))}
                    </div>

                    {/* Add Members (Creator Only) */}
                    {isCreator && (
                      <div className="pt-4 border-t border-white/10 space-y-2">
                        <p className="text-sm text-white/60 font-semibold">
                          Add Team Members
                        </p>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {availableUsers.length === 0 ? (
                            <p className="text-xs text-white/50 text-center py-2">
                              All users are already members
                            </p>
                          ) : (
                            availableUsers.map((user) => (
                              <label
                                key={user._id}
                                className="flex items-center gap-2 p-2 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-all"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedUsers.has(user._id)}
                                  onChange={(e) => {
                                    const newSet = new Set(selectedUsers);
                                    if (e.target.checked) {
                                      newSet.add(user._id);
                                    } else {
                                      newSet.delete(user._id);
                                    }
                                    setSelectedUsers(newSet);
                                  }}
                                  className="w-4 h-4 rounded accent"
                                />
                                <span className="text-xs text-white">
                                  {user.name}
                                </span>
                              </label>
                            ))
                          )}
                        </div>
                        {availableUsers.length > 0 && (
                          <button
                            onClick={handleAddMembers}
                            disabled={selectedUsers.size === 0 || addingMembers}
                            className="w-full py-2 bg-primary hover:bg-primaryHover disabled:opacity-50 text-white text-sm rounded-lg font-semibold transition-all flex items-center justify-center gap-1"
                          >
                            <UserPlus size={16} />
                            {addingMembers
                              ? "Adding..."
                              : `Add ${selectedUsers.size} Member${selectedUsers.size !== 1 ? "s" : ""}`}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </GlassCard>
              {versions.length > 1 && (
                <GlassCard className="p-6">
                  <button
                    onClick={() => setCompareMode(!compareMode)}
                    className="w-full text-left font-semibold text-white flex items-center justify-between hover:text-primary transition-colors"
                  >
                    Compare Versions
                    <ChevronDown
                      size={20}
                      className={`transition-transform ${
                        compareMode ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {compareMode && (
                    <div className="mt-4 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-white mb-2">
                            Version 1
                          </label>
                          <select
                            value={selectedVersions[0] || ""}
                            onChange={(e) =>
                              setSelectedVersions([
                                e.target.value,
                                selectedVersions[1],
                              ])
                            }
                            className="w-full p-2 bg-white/10 border border-white/20 rounded-lg text-white focus:border-primary outline-none"
                          >
                            <option value="">Select version...</option>
                            {versions.map((v) => (
                              <option key={v._id} value={v._id}>
                                v{v.versionNumber}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-white mb-2">
                            Version 2
                          </label>
                          <select
                            value={selectedVersions[1] || ""}
                            onChange={(e) =>
                              setSelectedVersions([
                                selectedVersions[0],
                                e.target.value,
                              ])
                            }
                            className="w-full p-2 bg-white/10 border border-white/20 rounded-lg text-white focus:border-primary outline-none"
                          >
                            <option value="">Select version...</option>
                            {versions.map((v) => (
                              <option key={v._id} value={v._id}>
                                v{v.versionNumber}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <button
                        onClick={handleCompareVersions}
                        className="w-full py-2 bg-accent hover:bg-accent/80 text-white rounded-lg font-semibold transition-all"
                      >
                        Compare
                      </button>

                      {comparisonResult && (
                        <GlassCard className="mt-4 p-4">
                          <div className="space-y-4 text-sm">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="bg-white/5 p-3 rounded-lg">
                                <div className="text-white/60 mb-2">
                                  Version 1
                                </div>
                                <div className="text-white font-semibold">
                                  v{comparisonResult.version1.versionNumber}
                                </div>
                                <div className="text-white/60 mt-2">
                                  {comparisonResult.version1.fileName}
                                </div>
                                <div className="text-white/50 text-xs mt-1">
                                  {comparisonResult.version1.fileSize} KB
                                </div>
                                <div className="text-white/60 mt-2">
                                  {comparisonResult.version1.message}
                                </div>
                              </div>
                              <div className="bg-white/5 p-3 rounded-lg">
                                <div className="text-white/60 mb-2">
                                  Version 2
                                </div>
                                <div className="text-white font-semibold">
                                  v{comparisonResult.version2.versionNumber}
                                </div>
                                <div className="text-white/60 mt-2">
                                  {comparisonResult.version2.fileName}
                                </div>
                                <div className="text-white/50 text-xs mt-1">
                                  {comparisonResult.version2.fileSize} KB
                                </div>
                                <div className="text-white/60 mt-2">
                                  {comparisonResult.version2.message}
                                </div>
                              </div>
                            </div>
                          </div>
                        </GlassCard>
                      )}
                    </div>
                  )}
                </GlassCard>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectDetailPage;
