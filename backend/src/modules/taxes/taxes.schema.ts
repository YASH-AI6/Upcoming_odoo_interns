import { z } from "zod";
import { paginationQuerySchema } from "../../utils/pagination";

export const createTaxSchema = z.object({
  name: z.string().min(1).trim(),
  rate: z.coerce.number().min(0).max(100),
  productIds: z.array(z.string().uuid()).optional()
});

export const updateTaxSchema = createTaxSchema.partial();

export const listTaxesQuerySchema = paginationQuerySchema;

export const taxIdParamSchema = z.object({
  id: z.string().uuid()
});

export type CreateTaxInput = z.infer<typeof createTaxSchema>;
export type UpdateTaxInput = z.infer<typeof updateTaxSchema>;
export type ListTaxesQuery = z.infer<typeof listTaxesQuerySchema>;
