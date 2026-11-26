import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
import fs from "node:fs/promises";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const removeLocalFile = async (filePath) => {
  if (!filePath) return;
  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error("Could not remove temporary upload:", error.message);
    }
  }
};

const uploadOnCloudinary = async (localFilePath) => {
  if (!localFilePath) return null;

  try {
    return await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
  } catch (error) {
    console.error("Cloudinary upload failed:", error.message);
    return null;
  } finally {
    await removeLocalFile(localFilePath);
  }
};

const deleteFromCloudinary = async (publicId) => {
  if (!publicId) return null;
  try {
    return await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error("Cloudinary deletion failed:", error.message);
    return null;
  }
};

export { uploadOnCloudinary, deleteFromCloudinary };
