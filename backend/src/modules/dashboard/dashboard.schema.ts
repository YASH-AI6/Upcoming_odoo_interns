import { z } from "zod";
import { SubscriptionStatus } from "@prisma/client";

export const dashboardSummaryQuerySchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  planId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  status: z.nativeEnum(SubscriptionStatus).optional()
});

export type DashboardSummaryQuery = z.infer<typeof dashboardSummaryQuerySchema>;
