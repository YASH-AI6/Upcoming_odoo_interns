import { z } from "zod";
import { paginationQuerySchema } from "../../utils/pagination";

export const recordPaymentSchema = z.object({
  method: z.string().min(1).default("CREDIT_CARD"),
  amount: z.coerce.number().positive("Payment amount must be greater than zero"),
  date: z.coerce.date().default(() => new Date()),
  note: z.string().optional()
});

export const listPaymentsQuerySchema = paginationQuerySchema.extend({
  invoiceId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  method: z.string().optional()
});

export const paymentIdParamSchema = z.object({
  id: z.string().uuid()
});

export const invoicePaymentParamSchema = z.object({
  id: z.string().uuid()
});

export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;
export type ListPaymentsQuery = z.infer<typeof listPaymentsQuerySchema>;
