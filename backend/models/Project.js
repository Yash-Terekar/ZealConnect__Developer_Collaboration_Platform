import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    versionCount: { type: Number, default: 0 },
    latestVersionId: { type: String, default: "0" },
    isPublic: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const Project = mongoose.model("Project", projectSchema);
export default Project;
