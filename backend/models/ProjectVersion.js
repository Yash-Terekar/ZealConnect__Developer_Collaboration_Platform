import mongoose from "mongoose";

const projectVersionSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    versionNumber: { type: Number, required: true },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    fileName: { type: String, required: true },
    fileUrl: { type: String, required: true },
    fileSize: { type: Number }, // in KB
    fileMimeType: { type: String },
    message: { type: String, default: "" }, // Commit message
    downloadCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

const ProjectVersion = mongoose.model("ProjectVersion", projectVersionSchema);
export default ProjectVersion;
