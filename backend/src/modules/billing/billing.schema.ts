import { z } from "zod";

export const billingDateSchema = z.object({
  date: z.coerce.date().default(() => new Date()),
  dryRun: z.boolean().optional()
});

export type BillingDateInput = z.infer<typeof billingDateSchema>;
