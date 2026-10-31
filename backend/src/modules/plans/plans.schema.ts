import { z } from "zod";
import { BillingPeriod } from "@prisma/client";
import { paginationQuerySchema } from "../../utils/pagination";

export const createPlanSchema = z.object({
  name: z.string().min(1).trim(),
  price: z.coerce.number().min(0),
  billingPeriod: z.nativeEnum(BillingPeriod),
  minQuantity: z.coerce.number().int().min(1).default(1),
  availableFrom: z.coerce.date().optional(),
  availableTo: z.coerce.date().optional(),
  autoClose: z.boolean().default(false),
  closable: z.boolean().default(true),
  pausable: z.boolean().default(true),
  renewable: z.boolean().default(true)
});

export const updatePlanSchema = createPlanSchema.partial();

export const listPlansQuerySchema = paginationQuerySchema.extend({
  billingPeriod: z.nativeEnum(BillingPeriod).optional(),
  activeOnly: z.coerce.boolean().optional()
});

export const planIdParamSchema = z.object({
  id: z.string().uuid()
});

export type CreatePlanInput = z.infer<typeof createPlanSchema>;
export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;
export type ListPlansQuery = z.infer<typeof listPlansQuerySchema>;
