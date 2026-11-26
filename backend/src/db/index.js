import mongoose from "mongoose";

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is required");
  }

  try {
    const connection = await mongoose.connect(uri);
    // Never log the full connection URI; it may contain credentials.
    console.log(`Connected to MongoDB host: ${connection.connection.host}`);
    return connection;
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    throw error;
  }
};

export default connectDB;
