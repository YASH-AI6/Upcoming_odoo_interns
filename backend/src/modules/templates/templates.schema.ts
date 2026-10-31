import { z } from "zod";
import { paginationQuerySchema } from "../../utils/pagination";

export const createTemplateLineSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional(),
  quantity: z.coerce.number().int().min(1).default(1)
});

export const createTemplateSchema = z.object({
  name: z.string().min(1).trim(),
  validityDays: z.coerce.number().int().min(1).default(30),
  planId: z.string().uuid(),
  lines: z.array(createTemplateLineSchema).min(1, "Template must include at least one product line")
});

export const updateTemplateSchema = z.object({
  name: z.string().min(1).trim().optional(),
  validityDays: z.coerce.number().int().min(1).optional(),
  planId: z.string().uuid().optional(),
  lines: z.array(createTemplateLineSchema).optional()
});

export const listTemplatesQuerySchema = paginationQuerySchema.extend({
  planId: z.string().uuid().optional()
});

export const templateIdParamSchema = z.object({
  id: z.string().uuid()
});

export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;
export type ListTemplatesQuery = z.infer<typeof listTemplatesQuerySchema>;
