import dotenv from "dotenv";
dotenv.config();

import app from "./app.js";
import connectDB from "./db/index.js";

const port = Number(process.env.PORT) || 5002;

const startServer = async () => {
  try {
    await connectDB();
    app.listen(port, "0.0.0.0", () => {
      console.log(`Server listening on port ${port}`);
    });
  } catch (error) {
    console.error("Application startup failed:", error.message);
    process.exit(1);
  }
};

startServer();
