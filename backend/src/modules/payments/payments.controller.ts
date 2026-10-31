import { Request, Response, NextFunction } from "express";
import { paymentsService } from "./payments.service";

export class PaymentsController {
  async recordPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await paymentsService.recordPayment(req.params.id, req.body, {
        userId: req.user?.userId,
        role: req.user?.role,
        customerId: req.user?.customerId
      });
      res.status(201).json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await paymentsService.list(req.query as any, {
        userId: req.user?.userId,
        role: req.user?.role,
        customerId: req.user?.customerId
      });
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async listByInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const payments = await paymentsService.listByInvoice(req.params.id, {
        userId: req.user?.userId,
        role: req.user?.role,
        customerId: req.user?.customerId
      });
      res.json({ success: true, payments });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const payment = await paymentsService.getById(req.params.id, {
        userId: req.user?.userId,
        role: req.user?.role,
        customerId: req.user?.customerId
      });
      res.json({ success: true, payment });
    } catch (error) {
      next(error);
    }
  }
}

export const paymentsController = new PaymentsController();
