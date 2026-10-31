import { Request, Response, NextFunction } from "express";
import { plansService } from "./plans.service";

export class PlansController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const plan = await plansService.create(req.body, req.user?.userId);
      res.status(201).json({ success: true, plan });
    } catch (error) {
      next(error);
    }
  }

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await plansService.list(req.query as any);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const plan = await plansService.getById(req.params.id);
      res.json({ success: true, plan });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const plan = await plansService.update(req.params.id, req.body, req.user?.userId);
      res.json({ success: true, plan });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await plansService.delete(req.params.id, req.user?.userId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

export const plansController = new PlansController();
