import cron from "node-cron";
import { billingService } from "./billing.service";

export const startBillingCron = (): cron.ScheduledTask => {
  // Run nightly at midnight (00:00:00)
  return cron.schedule("0 0 * * *", async () => {
    try {
      const now = new Date();
      console.log(`[Nightly Billing Cron] Running billing job for date: ${now.toISOString()}`);
      const result = await billingService.runBilling(now, { dryRun: false });
      console.log(
        `[Nightly Billing Cron] Completed: generated ${result.generatedInvoicesCount} invoices, total: $${result.totalBilledAmount}, errors: ${result.errors.length}`
      );
    } catch (err) {
      console.error("[Nightly Billing Cron] Execution error:", err);
    }
  });
};
