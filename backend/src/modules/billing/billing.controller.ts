import { Request, Response, NextFunction } from "express";
import { billingService } from "./billing.service";

export class BillingController {
  async preview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const date = req.body.date ? new Date(req.body.date) : new Date();
      const result = await billingService.runBilling(date, { dryRun: true });
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async run(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const date = req.body.date ? new Date(req.body.date) : new Date();
      const result = await billingService.runBilling(date, { dryRun: false });
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }
}

export const billingController = new BillingController();
