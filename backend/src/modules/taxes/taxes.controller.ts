import { Request, Response, NextFunction } from "express";
import { taxesService } from "./taxes.service";

export class TaxesController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tax = await taxesService.create(req.body, req.user?.userId);
      res.status(201).json({ success: true, tax });
    } catch (error) {
      next(error);
    }
  }

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await taxesService.list(req.query as any);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tax = await taxesService.getById(req.params.id);
      res.json({ success: true, tax });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tax = await taxesService.update(req.params.id, req.body, req.user?.userId);
      res.json({ success: true, tax });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await taxesService.delete(req.params.id, req.user?.userId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

export const taxesController = new TaxesController();
