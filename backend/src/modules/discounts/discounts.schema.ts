import { z } from "zod";
import { DiscountScope, DiscountType } from "@prisma/client";
import { paginationQuerySchema } from "../../utils/pagination";

export const createDiscountSchema = z.object({
  name: z.string().min(1).trim(),
  type: z.nativeEnum(DiscountType),
  value: z.coerce.number().min(0),
  minPurchase: z.coerce.number().min(0).default(0),
  minQuantity: z.coerce.number().int().min(0).default(0),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  usageLimit: z.coerce.number().int().min(1).optional(),
  scope: z.nativeEnum(DiscountScope),
  targetProductIds: z.array(z.string().uuid()).default([]),
  targetSubscriptionIds: z.array(z.string().uuid()).default([])
});

export const updateDiscountSchema = createDiscountSchema.partial();

export const listDiscountsQuerySchema = paginationQuerySchema.extend({
  scope: z.nativeEnum(DiscountScope).optional(),
  type: z.nativeEnum(DiscountType).optional(),
  activeOnly: z.coerce.boolean().optional()
});

export const discountIdParamSchema = z.object({
  id: z.string().uuid()
});

export type CreateDiscountInput = z.infer<typeof createDiscountSchema>;
export type UpdateDiscountInput = z.infer<typeof updateDiscountSchema>;
export type ListDiscountsQuery = z.infer<typeof listDiscountsQuerySchema>;
