import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import GlassCard from "../components/GlassCard.jsx";
import api from "../utils/api.js";
import { ArrowLeft } from "lucide-react";

const CreatePostPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [caption, setCaption] = useState("");
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user?._id) {
      alert("User not logged in");
      return;
    }

    if (!caption.trim() && !image) {
      alert("Please add caption or image");
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("authorId", user._id);
      formData.append("caption", caption);
      if (image) formData.append("media", image);

      await api.post("/posts", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        navigate("/");
      }, 2000);
    } catch (error) {
      console.error("Post creation error:", error);
      alert("Failed to create post. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="home-body p-4 md:p-10 flex items-center justify-center min-h-screen">
        <div className="create-wrapper">
          <GlassCard className="create-card w-full max-w-md">
            <button
              onClick={() => window.history.back()}
              className="mb-4 text-white/70 hover:text-white flex items-center gap-2 text-lg"
            >
              <ArrowLeft size={24} />
            </button>

            <h2 className="text-3xl font-bold text-white mb-6 text-center">
              Create Post ✨
            </h2>

            <form onSubmit={handleSubmit}>
              <textarea
                id="caption"
                placeholder="Write something..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="w-full h-28 p-6 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-white/50 resize-none mb-6 outline-none focus:bg-white/20 focus:border-primary"
              ></textarea>

              <input
                type="file"
                id="imageInput"
                accept="image/*"
                onChange={handleImageChange}
                className="w-full mb-4 text-sm text-white file:mr-4 file:py-3 file:px-6 file:rounded-2xl file:border-0 file:text-lg file:font-semibold file:bg-primary file:text-white hover:file:bg-primaryHover cursor-pointer"
              />

              {/* Image Preview */}
              {preview && (
                <div id="preview" className="mb-6">
                  <img
                    src={preview}
                    alt="Preview"
                    className="w-full rounded-2xl object-cover aspect-video"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || (!caption.trim() && !image)}
                className="btn w-full p-4 bg-primary hover:bg-primaryHover text-lg font-bold shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isLoading ? "Posting..." : "Post"}
              </button>
            </form>
          </GlassCard>
        </div>
      </div>

      {/* Success Popup */}
      {showSuccess && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-white p-10 rounded-3xl text-center w-80">
            <div className="w-20 h-20 bg-green-500 text-white rounded-full flex items-center justify-center text-3xl font-bold mx-auto mb-6">
              ✓
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-3">
              Post Created Successfully!
            </h3>
            <p className="text-gray-600 mb-8">Your post has been published.</p>
            <div className="w-full h-24 bg-gradient-to-r from-primary to-accent rounded-2xl mx-auto mb-6 animate-pulse"></div>
            <button className="px-10 py-4 bg-gray-800 text-white rounded-2xl font-semibold hover:bg-gray-900 transition-all w-full">
              Continue
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default CreatePostPage;
