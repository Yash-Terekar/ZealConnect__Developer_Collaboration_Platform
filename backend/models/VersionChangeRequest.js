import mongoose from "mongoose";

const versionChangeRequestSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    fileName: { type: String, required: true },
    fileUrl: { type: String, required: true },
    fileSize: { type: Number }, // in KB
    fileMimeType: { type: String },
    message: { type: String, default: "" }, // Change description
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    rejectionReason: { type: String, default: "" },
    nextVersionNumber: { type: Number }, // The version number it will get if approved
  },
  { timestamps: true },
);

const VersionChangeRequest = mongoose.model(
  "VersionChangeRequest",
  versionChangeRequestSchema,
);
export default VersionChangeRequest;
