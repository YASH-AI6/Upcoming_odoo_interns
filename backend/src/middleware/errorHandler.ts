import { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import { AppError } from "../utils/errors";
import { env } from "../config/env";

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.details ? { details: err.details } : {})
    });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      const target = (err.meta?.target as string[]) || ["record"];
      res.status(409).json({
        success: false,
        message: `Unique constraint violation on ${target.join(", ")}`,
        code: "DUPLICATE_KEY"
      });
      return;
    }

    if (err.code === "P2025") {
      res.status(404).json({
        success: false,
        message: "Requested record does not exist or was deleted",
        code: "NOT_FOUND"
      });
      return;
    }
  }

  // Fallback for unhandled unexpected server errors
  if (env.NODE_ENV !== "test") {
    console.error("Unhandled error:", err);
  }

  res.status(500).json({
    success: false,
    message: "Internal server error"
  });
};
