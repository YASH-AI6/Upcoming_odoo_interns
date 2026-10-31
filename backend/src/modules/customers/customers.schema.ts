import { z } from "zod";
import { paginationQuerySchema } from "../../utils/pagination";

export const createCustomerSchema = z.object({
  name: z.string().min(1).trim(),
  email: z.string().email().toLowerCase().trim(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional()
});

export const updateCustomerSchema = createCustomerSchema.partial();

export const listCustomersQuerySchema = paginationQuerySchema.extend({
  city: z.string().optional(),
  country: z.string().optional()
});

export const customerIdParamSchema = z.object({
  id: z.string().uuid()
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type ListCustomersQuery = z.infer<typeof listCustomersQuerySchema>;
