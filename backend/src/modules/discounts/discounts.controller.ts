import { Request, Response, NextFunction } from "express";
import { discountsService } from "./discounts.service";

export class DiscountsController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const discount = await discountsService.create(req.body, req.user?.userId);
      res.status(201).json({ success: true, discount });
    } catch (error) {
      next(error);
    }
  }

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await discountsService.list(req.query as any);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const discount = await discountsService.getById(req.params.id);
      res.json({ success: true, discount });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const discount = await discountsService.update(req.params.id, req.body, req.user?.userId);
      res.json({ success: true, discount });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await discountsService.delete(req.params.id, req.user?.userId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

export const discountsController = new DiscountsController();
