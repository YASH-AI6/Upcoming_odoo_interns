import { BillingPeriod } from "@prisma/client";

export const addBillingPeriod = (startDate: Date, period: BillingPeriod): Date => {
  const result = new Date(startDate.getTime());

  switch (period) {
    case BillingPeriod.DAILY: {
      result.setUTCDate(result.getUTCDate() + 1);
      break;
    }
    case BillingPeriod.WEEKLY: {
      result.setUTCDate(result.getUTCDate() + 7);
      break;
    }
    case BillingPeriod.MONTHLY: {
      const originalDay = result.getUTCDate();
      const currentMonth = result.getUTCMonth();
      result.setUTCMonth(currentMonth + 1, 1);
      const daysInTargetMonth = new Date(
        Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)
      ).getUTCDate();
      result.setUTCDate(Math.min(originalDay, daysInTargetMonth));
      break;
    }
    case BillingPeriod.YEARLY: {
      const originalDay = result.getUTCDate();
      const originalMonth = result.getUTCMonth();
      const targetYear = result.getUTCFullYear() + 1;
      result.setUTCFullYear(targetYear, originalMonth, 1);
      const daysInTargetMonth = new Date(
        Date.UTC(targetYear, originalMonth + 1, 0)
      ).getUTCDate();
      result.setUTCDate(Math.min(originalDay, daysInTargetMonth));
      break;
    }
  }

  return result;
};

export const getOverdueBucket = (
  dueDate: Date,
  asOfDate: Date = new Date()
): "1-7" | "8-30" | "30+" | null => {
  const due = new Date(dueDate).setUTCHours(0, 0, 0, 0);
  const current = new Date(asOfDate).setUTCHours(0, 0, 0, 0);

  const diffMs = current - due;
  if (diffMs <= 0) return null;

  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 7) return "1-7";
  if (diffDays <= 30) return "8-30";
  return "30+";
};
