import { Request, Response, NextFunction } from "express";
import { subscriptionsService } from "./subscriptions.service";
import { SubscriptionStatus } from "@prisma/client";

export class SubscriptionsController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const subscription = await subscriptionsService.create(req.body, {
        userId: req.user?.userId,
        role: req.user?.role,
        customerId: req.user?.customerId
      });
      res.status(201).json({ success: true, subscription });
    } catch (error) {
      next(error);
    }
  }

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await subscriptionsService.list(req.query as any, {
        userId: req.user?.userId,
        role: req.user?.role,
        customerId: req.user?.customerId
      });
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const subscription = await subscriptionsService.getById(req.params.id, {
        userId: req.user?.userId,
        role: req.user?.role,
        customerId: req.user?.customerId
      });
      res.json({ success: true, subscription });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const subscription = await subscriptionsService.update(req.params.id, req.body, {
        userId: req.user?.userId,
        role: req.user?.role
      });
      res.json({ success: true, subscription });
    } catch (error) {
      next(error);
    }
  }

  async confirm(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const subscription = await subscriptionsService.transitionStatus(
        req.params.id,
        SubscriptionStatus.CONFIRMED,
        req.user?.userId
      );
      res.json({ success: true, subscription });
    } catch (error) {
      next(error);
    }
  }

  async activate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const subscription = await subscriptionsService.transitionStatus(
        req.params.id,
        SubscriptionStatus.ACTIVE,
        req.user?.userId
      );
      res.json({ success: true, subscription });
    } catch (error) {
      next(error);
    }
  }

  async pause(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const subscription = await subscriptionsService.transitionStatus(
        req.params.id,
        SubscriptionStatus.PAUSED,
        req.user?.userId
      );
      res.json({ success: true, subscription });
    } catch (error) {
      next(error);
    }
  }

  async resume(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const subscription = await subscriptionsService.transitionStatus(
        req.params.id,
        SubscriptionStatus.ACTIVE,
        req.user?.userId
      );
      res.json({ success: true, subscription });
    } catch (error) {
      next(error);
    }
  }

  async close(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const subscription = await subscriptionsService.transitionStatus(
        req.params.id,
        SubscriptionStatus.CLOSED,
        req.user?.userId
      );
      res.json({ success: true, subscription });
    } catch (error) {
      next(error);
    }
  }

  async renew(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const subscription = await subscriptionsService.renew(req.params.id, req.user?.userId);
      res.json({ success: true, subscription });
    } catch (error) {
      next(error);
    }
  }
}

export const subscriptionsController = new SubscriptionsController();
