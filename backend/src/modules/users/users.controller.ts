import { Request, Response, NextFunction } from "express";
import { usersService } from "./users.service";

export class UsersController {
  async createStaff(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await usersService.createStaff(req.body, req.user!.userId);
      res.status(201).json({ success: true, user });
    } catch (error) {
      next(error);
    }
  }

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await usersService.listUsers(req.query as any);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await usersService.getUserById(req.params.id);
      res.json({ success: true, user });
    } catch (error) {
      next(error);
    }
  }
}

export const usersController = new UsersController();
