import { Request, Response, NextFunction } from "express";
import { verifyToken, AuthTokenPayload } from "../utils/jwt";
import { UnauthorizedError } from "../utils/errors";

declare global {
  namespace Express {
    interface Request {
      user?: AuthTokenPayload;
    }
  }
}

export const authenticate = (req: Request, _res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new UnauthorizedError("Authentication token is required");
  }

  const token = authHeader.split(" ")[1];
  try {
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch {
    throw new UnauthorizedError("Invalid or expired authentication token");
  }
};
