import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import GlassCard from "../components/GlassCard.jsx";
import { ArrowLeft } from "lucide-react";

const EditProfilePage = () => {
  const { user, updateUser } = useAuth();
  const [preview, setPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || "",
    bio: user?.bio || "",
  });
  const [cropRect, setCropRect] = useState(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const applyCrop = async () => {
    if (!preview || !avatarFile) return;

    // Create image element from preview data
    const img = document.createElement("img");
    img.src = preview;
    await new Promise((res) => (img.onload = res));

    // Determine crop rectangle: if not set, use center square
    const cw = img.width;
    const ch = img.height;
    const size = Math.min(cw, ch);
    const sx = cropRect?.sx ?? Math.floor((cw - size) / 2);
    const sy = cropRect?.sy ?? Math.floor((ch - size) / 2);
    const sWidth = cropRect?.sWidth ?? size;
    const sHeight = cropRect?.sHeight ?? size;

    const canvas = document.createElement("canvas");
    canvas.width = 256; // output size
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, 256, 256);

    // Convert canvas to blob and create new File
    const blob = await new Promise((res) =>
      canvas.toBlob(res, avatarFile.type),
    );
    const croppedFile = new File([blob], avatarFile.name, {
      type: avatarFile.type,
    });
    setAvatarFile(croppedFile);

    // Update preview
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result);
    reader.readAsDataURL(croppedFile);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Edit profile submitted for user:", user?._id);

    if (!user?._id) {
      alert("User not logged in");
      return;
    }

    setLoading(true);
    try {
      const updateData = new FormData();
      updateData.append("name", formData.name);
      updateData.append("bio", formData.bio);
      if (avatarFile) updateData.append("avatar", avatarFile);

      console.log("Sending update to /users/" + user._id);
      const result = await updateUser(user._id, updateData, true);
      console.log("Profile updated successfully:", result);
      alert("Profile updated successfully!");
      window.history.back();
    } catch (error) {
      console.error("Profile update failed:", error);
      alert(
        "Update failed: " + (error.response?.data?.message || error.message),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="home-body ">
      <div className="home-body p-4 md:p-10 flex items-center justify-center min-h-screen mt-4">
        <div className="edit-profile-wrapper">
          <GlassCard className="edit-profile-card w-full max-w-md">
            <button
              onClick={() => window.history.back()}
              className="mb-6 text-white/70 hover:text-white flex items-center gap-2"
            >
              <ArrowLeft size={20} />
              Back to Profile
            </button>

            <h2 className="text-3xl font-bold text-white mb-8 text-center">
              Edit Profile ✨
            </h2>

            {/* Avatar Upload */}
            <div className="edit-avatar mx-auto mb-4">
              <div
                className="profile-pic w-28 h-28 bg-primary rounded-full mx-auto mb-4 cursor-pointer relative overflow-hidden hover:scale-105 transition-transform"
                style={{
                  backgroundImage: preview ? `url(${preview})` : "none",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                {!preview && (
                  <div className="absolute inset-0 flex items-center justify-center text-white/70 text-sm">
                    Edit
                  </div>
                )}
              </div>
              <input
                type="file"
                id="imageInput"
                onChange={handleImageChange}
                className="w-full text-sm text-white file:bg-primary file:text-white file:border-0 file:rounded-lg file:px-4 file:py-2 file:cursor-pointer hover:file:bg-primaryHover"
              />
              <div className="flex gap-2 mt-3">
                <button
                  type="button"
                  onClick={applyCrop}
                  disabled={!avatarFile}
                  className="px-3 py-2 bg-primary text-white rounded-lg text-sm"
                >
                  Crop & Resize
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPreview(null);
                    setAvatarFile(null);
                    setCropRect(null);
                  }}
                  disabled={!avatarFile}
                  className="px-3 py-2 border border-white/20 rounded-lg text-sm"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Inputs */}
            <input
              type="text"
              placeholder="Enter name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full p-4 bg-white/10 border border-white/20 rounded-xl text-white mb-4 focus:bg-white/20 focus:border-primary outline-none text-lg"
            />
            <input
              type="text"
              placeholder="Enter bio"
              value={formData.bio}
              onChange={(e) =>
                setFormData({ ...formData, bio: e.target.value })
              }
              className="w-full p-4 bg-white/10 border border-white/20 rounded-xl text-white mb-8 focus:bg-white/20 focus:border-primary outline-none text-lg"
            />

            {/* Buttons */}
            <div className="flex gap-4">
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="btn flex-1 bg-primary hover:bg-primaryHover px-8 py-4 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Saving..." : "Save Changes"}
              </button>
              <button
                onClick={() => window.history.back()}
                disabled={loading}
                className="flex-1 px-8 py-4 border border-white/20 text-white rounded-xl hover:bg-white/10 transition-all text-lg disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};

export default EditProfilePage;
