import { Request, Response, NextFunction } from "express";
import { templatesService } from "./templates.service";

export class TemplatesController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const template = await templatesService.create(req.body, req.user?.userId);
      res.status(201).json({ success: true, template });
    } catch (error) {
      next(error);
    }
  }

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await templatesService.list(req.query as any);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const template = await templatesService.getById(req.params.id);
      res.json({ success: true, template });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const template = await templatesService.update(req.params.id, req.body, req.user?.userId);
      res.json({ success: true, template });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await templatesService.delete(req.params.id, req.user?.userId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

export const templatesController = new TemplatesController();
