import { Request, Response, NextFunction } from "express";
import { invoicesService } from "./invoices.service";

export class InvoicesController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const invoice = await invoicesService.create(req.body, req.user?.userId);
      res.status(201).json({ success: true, invoice });
    } catch (error) {
      next(error);
    }
  }

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await invoicesService.list(req.query as any, {
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
      const invoice = await invoicesService.getById(req.params.id, {
        userId: req.user?.userId,
        role: req.user?.role,
        customerId: req.user?.customerId
      });
      res.json({ success: true, invoice });
    } catch (error) {
      next(error);
    }
  }

  async confirm(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const invoice = await invoicesService.confirm(req.params.id, req.user?.userId);
      res.json({ success: true, invoice });
    } catch (error) {
      next(error);
    }
  }

  async cancel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const invoice = await invoicesService.cancel(req.params.id, req.user?.userId);
      res.json({ success: true, invoice });
    } catch (error) {
      next(error);
    }
  }

  async send(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await invoicesService.send(req.params.id, req.user?.userId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async downloadPdf(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const pdfBuffer = await invoicesService.generatePdf(req.params.id, {
        userId: req.user?.userId,
        role: req.user?.role,
        customerId: req.user?.customerId
      });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `inline; filename="invoice-${req.params.id}.pdf"`
      );
      res.send(pdfBuffer);
    } catch (error) {
      next(error);
    }
  }
}

export const invoicesController = new InvoicesController();
