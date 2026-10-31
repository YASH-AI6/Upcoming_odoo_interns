import { z } from "zod";
import { SubscriptionStatus } from "@prisma/client";
import { paginationQuerySchema } from "../../utils/pagination";

export const createSubscriptionLineSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional(),
  quantity: z.coerce.number().int().min(1).default(1),
  unitPrice: z.coerce.number().min(0).optional(),
  taxRate: z.coerce.number().min(0).max(100).optional()
});

export const createSubscriptionSchema = z.object({
  customerId: z.string().uuid(),
  planId: z.string().uuid().optional(),
  templateId: z.string().uuid().optional(),
  startDate: z.coerce.date().default(() => new Date()),
  expiryDate: z.coerce.date().optional(),
  paymentTerms: z.coerce.number().int().min(0).default(15),
  status: z.nativeEnum(SubscriptionStatus).default(SubscriptionStatus.DRAFT),
  lines: z.array(createSubscriptionLineSchema).optional()
});

export const updateSubscriptionSchema = z.object({
  paymentTerms: z.coerce.number().int().min(0).optional(),
  expiryDate: z.coerce.date().nullable().optional(),
  lines: z.array(createSubscriptionLineSchema).optional()
});

export const listSubscriptionsQuerySchema = paginationQuerySchema.extend({
  status: z.nativeEnum(SubscriptionStatus).optional(),
  planId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional()
});

export const subscriptionIdParamSchema = z.object({
  id: z.string().uuid()
});

export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>;
export type UpdateSubscriptionInput = z.infer<typeof updateSubscriptionSchema>;
export type ListSubscriptionsQuery = z.infer<typeof listSubscriptionsQuerySchema>;
