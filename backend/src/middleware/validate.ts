import { Request, Response, NextFunction } from "express";
import { AnyZodObject, ZodError } from "zod";
import { BadRequestError } from "../utils/errors";

export const validateBody = (schema: AnyZodObject) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(
          new BadRequestError("Validation failed", {
            issues: error.issues.map((i) => ({
              path: i.path.join("."),
              message: i.message
            }))
          })
        );
      } else {
        next(error);
      }
    }
  };
};

export const validateQuery = (schema: AnyZodObject) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      req.query = (await schema.parseAsync(req.query)) as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(
          new BadRequestError("Query parameter validation failed", {
            issues: error.issues.map((i) => ({
              path: i.path.join("."),
              message: i.message
            }))
          })
        );
      } else {
        next(error);
      }
    }
  };
};

export const validateParams = (schema: AnyZodObject) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      req.params = (await schema.parseAsync(req.params)) as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(
          new BadRequestError("Route parameter validation failed", {
            issues: error.issues.map((i) => ({
              path: i.path.join("."),
              message: i.message
            }))
          })
        );
      } else {
        next(error);
      }
    }
  };
};
