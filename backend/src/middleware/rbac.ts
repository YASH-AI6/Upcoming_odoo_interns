import { Request, Response, NextFunction } from "express";
import { Role } from "@prisma/client";
import { ForbiddenError, UnauthorizedError } from "../utils/errors";

export const requireRoles = (...allowedRoles: Role[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError();
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new ForbiddenError(
        `Access denied. Role ${req.user.role} is not permitted for this resource.`
      );
    }

    next();
  };
};
