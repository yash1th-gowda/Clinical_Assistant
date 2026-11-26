import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError.js";

const errorHandler = (err, req, res, next) => {
  let error = err;

  if (!(err instanceof ApiError)) {
    const statusCode =
      err.statusCode || (err instanceof mongoose.Error ? 400 : 500);
    const isDevelopment = process.env.NODE_ENV === "development";
    const message =
      statusCode >= 500 && !isDevelopment
        ? "Internal server error"
        : err.message || "Something went wrong";

    error = new ApiError(
      statusCode,
      message,
      statusCode >= 500 ? [] : err.errors || [],
      isDevelopment ? err.stack : ""
    );
  }

  const response = {
    success: false,
    statusCode: error.statusCode,
    message: error.message,
    errors: error.errors,
  };

  if (process.env.NODE_ENV === "development") {
    response.stack = error.stack;
  }

  res.status(error.statusCode || 500).json(response);
};

export { errorHandler };
