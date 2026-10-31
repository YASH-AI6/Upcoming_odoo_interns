import { z } from "zod";
import { InvoiceStatus } from "@prisma/client";
import { paginationQuerySchema } from "../../utils/pagination";

export const createInvoiceLineSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional(),
  quantity: z.coerce.number().int().min(1).default(1),
  unitPrice: z.coerce.number().min(0),
  taxRate: z.coerce.number().min(0).max(100).default(0),
  discountAmount: z.coerce.number().min(0).default(0)
});

export const createInvoiceSchema = z.object({
  customerId: z.string().uuid(),
  subscriptionId: z.string().uuid().optional(),
  billingPeriodStart: z.coerce.date().optional(),
  billingPeriodEnd: z.coerce.date().optional(),
  issueDate: z.coerce.date().default(() => new Date()),
  dueDate: z.coerce.date().optional(),
  lines: z.array(createInvoiceLineSchema).min(1, "Invoice must include at least one item line")
});

export const listInvoicesQuerySchema = paginationQuerySchema.extend({
  status: z.nativeEnum(InvoiceStatus).optional(),
  customerId: z.string().uuid().optional(),
  subscriptionId: z.string().uuid().optional(),
  isOverdue: z.coerce.boolean().optional(),
  overdueBucket: z.enum(["1-7", "8-30", "30+"]).optional()
});

export const invoiceIdParamSchema = z.object({
  id: z.string().uuid()
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type ListInvoicesQuery = z.infer<typeof listInvoicesQuerySchema>;
