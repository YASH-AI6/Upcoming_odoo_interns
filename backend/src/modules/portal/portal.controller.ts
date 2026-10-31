import { Request, Response, NextFunction } from "express";
import { subscriptionsService } from "../subscriptions/subscriptions.service";
import { invoicesService } from "../invoices/invoices.service";
import { paymentsService } from "../payments/payments.service";
import { UnauthorizedError } from "../../utils/errors";

export class PortalController {
  async getSubscriptions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.customerId) {
        throw new UnauthorizedError("User is not associated with a customer account");
      }
      const result = await subscriptionsService.list(req.query as any, {
        userId: req.user.userId,
        role: req.user.role,
        customerId: req.user.customerId
      });
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async getInvoices(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.customerId) {
        throw new UnauthorizedError("User is not associated with a customer account");
      }
      const result = await invoicesService.list(req.query as any, {
        userId: req.user.userId,
        role: req.user.role,
        customerId: req.user.customerId
      });
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async getPayments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.customerId) {
        throw new UnauthorizedError("User is not associated with a customer account");
      }
      const result = await paymentsService.list(req.query as any, {
        userId: req.user.userId,
        role: req.user.role,
        customerId: req.user.customerId
      });
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }
}

export const portalController = new PortalController();
