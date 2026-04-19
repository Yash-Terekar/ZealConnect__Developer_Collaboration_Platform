import dotenv from "dotenv";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    // Organize uploads by field name
    const folder =
      file.fieldname === "avatar" ? "zealconnect/avatars" : "zealconnect/media";
    return {
      folder,
      allowed_formats: [
        "jpg",
        "jpeg",
        "png",
        "gif",
        "webp",
        "mp4",
        "mov",
        "mkv",
        "avi",
        "webm",
      ],
      resource_type: "auto",
    };
  },
});

export { cloudinary, storage };
