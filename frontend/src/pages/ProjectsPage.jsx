import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import GlassCard from "../components/GlassCard.jsx";
import api from "../utils/api.js";
import { Plus, Code2, Users, GitBranch, Trash2 } from "lucide-react";

const ProjectsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({ title: "", description: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?._id) {
      loadProjects();
    }
  }, [user]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/projects/user/${user._id}`);
      setProjects(res.data);
    } catch (error) {
      console.error("Error loading projects:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      alert("❌ Project title is required");
      return;
    }

    try {
      const res = await api.post("/projects", formData);
      setProjects([res.data, ...projects]);
      setFormData({ title: "", description: "" });
      setShowCreateForm(false);
      alert("✅ Project created successfully!");
    } catch (error) {
      console.error("Error creating project:", error);
      alert("❌ Failed to create project");
    }
  };

  const handleDeleteProject = async (projectId) => {
    if (
      !confirm(
        "Are you sure? This will delete all versions and messages in this project.",
      )
    ) {
      return;
    }

    try {
      await api.delete(`/projects/${projectId}`);
      setProjects(projects.filter((p) => p._id !== projectId));
      alert("✅ Project deleted successfully!");
    } catch (error) {
      console.error("Error deleting project:", error);
      alert("❌ Failed to delete project");
    }
  };

  return (
    <div className="home-body">
      <div className="min-h-screen p-6 mt-10">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-10">
            <div>
              <h1 className="text-4xl font-bold text-white flex items-center gap-3">
                <GitBranch className="w-10 h-10 text-primary" />
                My Projects
              </h1>
              <p className="text-white/60 mt-2">
                Version control for developers
              </p>
            </div>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="btn flex items-center gap-2 bg-primary hover:bg-primaryHover text-white px-6 py-3 rounded-lg font-semibold transition-all"
            >
              <Plus size={20} />
              New Project
            </button>
          </div>

          {/* Create Project Form */}
          {showCreateForm && (
            <GlassCard className="mb-8 p-6">
              <h2 className="text-xl font-bold text-white mb-4">
                Create New Project
              </h2>
              <form onSubmit={handleCreateProject} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Project Title
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    placeholder="e.g., MERN Stack E-Commerce"
                    className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:bg-white/20 focus:border-primary outline-none transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        description: e.target.value,
                      })
                    }
                    placeholder="Project description..."
                    className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:bg-white/20 focus:border-primary outline-none transition-all resize-none"
                    rows="3"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-primary hover:bg-primaryHover text-white rounded-lg font-semibold transition-all"
                  >
                    Create Project
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="flex-1 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-semibold transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </GlassCard>
          )}

          {/* Projects Grid */}
          {loading ? (
            <div className="text-center py-12">
              <p className="text-white/60">Loading projects...</p>
            </div>
          ) : projects.length === 0 ? (
            <GlassCard className="text-center p-12">
              <Code2 className="w-16 h-16 text-white/30 mx-auto mb-4" />
              <p className="text-white text-lg">No projects yet</p>
              <p className="text-white/60 mt-2">
                Create your first project to start tracking versions!
              </p>
            </GlassCard>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <GlassCard
                  key={project._id}
                  className="p-6 hover:shadow-lg transition-all cursor-pointer group"
                >
                  <div
                    onClick={() => navigate(`/projects/${project._id}`)}
                    className="mb-4"
                  >
                    <h3 className="text-xl font-bold text-white group-hover:text-primary transition-colors">
                      {project.title}
                    </h3>
                    <p className="text-white/60 text-sm mt-2 line-clamp-2">
                      {project.description || "No description"}
                    </p>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                    <div className="bg-primary/10 p-3 rounded-lg">
                      <div className="text-white/60 text-xs mb-1">Versions</div>
                      <div className="text-2xl font-bold text-primary">
                        {project.versionCount}
                      </div>
                    </div>
                    <div className="bg-accent/10 p-3 rounded-lg">
                      <div className="text-white/60 text-xs mb-1">Members</div>
                      <div className="text-2xl font-bold text-accent">
                        {project.members.length}
                      </div>
                    </div>
                  </div>

                  {/* Creator */}
                  <div className="flex items-center gap-2 mb-4 text-sm">
                    <div
                      className="w-6 h-6 rounded-full bg-gradient-to-r from-primary to-accent"
                      style={{
                        backgroundImage: project.createdBy.avatar
                          ? `url(${project.createdBy.avatar})`
                          : "none",
                        backgroundSize: "cover",
                      }}
                    />
                    <span className="text-white/80">
                      {project.createdBy.name}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => navigate(`/projects/${project._id}`)}
                      className="flex-1 py-2 bg-primary hover:bg-primaryHover text-white rounded-lg text-sm font-semibold transition-all"
                    >
                      View Project
                    </button>
                    {project.createdBy._id === user._id && (
                      <button
                        onClick={() => handleDeleteProject(project._id)}
                        className="py-2 px-3 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-all"
                        title="Delete project"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </GlassCard>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectsPage;
