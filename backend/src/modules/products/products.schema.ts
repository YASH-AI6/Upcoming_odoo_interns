import { z } from "zod";
import { paginationQuerySchema } from "../../utils/pagination";

export const createVariantSchema = z.object({
  attribute: z.string().min(1).trim(),
  value: z.string().min(1).trim(),
  extraPrice: z.coerce.number().min(0).default(0)
});

export const createProductSchema = z.object({
  name: z.string().min(1).trim(),
  type: z.string().default("SERVICE"),
  salesPrice: z.coerce.number().min(0),
  costPrice: z.coerce.number().min(0).default(0),
  notes: z.string().optional(),
  taxIds: z.array(z.string().uuid()).optional(),
  variants: z.array(createVariantSchema).optional()
});

export const updateProductSchema = createProductSchema.partial();

export const listProductsQuerySchema = paginationQuerySchema.extend({
  type: z.string().optional()
});

export const productIdParamSchema = z.object({
  id: z.string().uuid()
});

export const variantIdParamSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid()
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type CreateVariantInput = z.infer<typeof createVariantSchema>;
export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;
