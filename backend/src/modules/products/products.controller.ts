import { Request, Response, NextFunction } from "express";
import { productsService } from "./products.service";

export class ProductsController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const product = await productsService.create(req.body, req.user?.userId);
      res.status(201).json({ success: true, product });
    } catch (error) {
      next(error);
    }
  }

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await productsService.list(req.query as any);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const product = await productsService.getById(req.params.id);
      res.json({ success: true, product });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const product = await productsService.update(req.params.id, req.body, req.user?.userId);
      res.json({ success: true, product });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await productsService.delete(req.params.id, req.user?.userId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async addVariant(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const variant = await productsService.addVariant(req.params.id, req.body);
      res.status(201).json({ success: true, variant });
    } catch (error) {
      next(error);
    }
  }

  async deleteVariant(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await productsService.deleteVariant(req.params.productId, req.params.variantId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

export const productsController = new ProductsController();
