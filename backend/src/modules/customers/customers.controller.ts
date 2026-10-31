import { Request, Response, NextFunction } from "express";
import { customersService } from "./customers.service";

export class CustomersController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const customer = await customersService.create(req.body, req.user?.userId);
      res.status(201).json({ success: true, customer });
    } catch (error) {
      next(error);
    }
  }

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await customersService.list(req.query as any);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const customer = await customersService.getById(req.params.id);
      res.json({ success: true, customer });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const customer = await customersService.update(req.params.id, req.body, req.user?.userId);
      res.json({ success: true, customer });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await customersService.delete(req.params.id, req.user?.userId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

export const customersController = new CustomersController();
