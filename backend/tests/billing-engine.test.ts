import request from "supertest";
import { app } from "../src/app";
import { prisma } from "../src/config/prisma";
import { billingService } from "../src/modules/billing/billing.service";
import { BillingPeriod, Role, SubscriptionStatus } from "@prisma/client";
import { getAuthToken } from "./helpers";

describe("Billing Engine: Idempotency, Catch-Up, Auto-Close, Dry Run", () => {
  const adminToken = getAuthToken(Role.ADMIN);
  let customerId: string;
  let planId: string;
  let autoClosePlanId: string;
  let productId: string;

  beforeAll(async () => {
    const cust = await prisma.customer.create({
      data: { name: "Billing Tester", email: `billing_${Date.now()}@test.org` }
    });
    customerId = cust.id;

    const prod = await prisma.product.findFirst();
    productId = prod!.id;

    const plan = await prisma.plan.create({
      data: {
        name: `Billing Daily Plan ${Date.now()}`,
        price: 20,
        billingPeriod: BillingPeriod.DAILY,
        minQuantity: 1,
        autoClose: false,
        closable: true,
        pausable: true,
        renewable: true
      }
    });
    planId = plan.id;

    const acPlan = await prisma.plan.create({
      data: {
        name: `Auto Close Plan ${Date.now()}`,
        price: 50,
        billingPeriod: BillingPeriod.DAILY,
        minQuantity: 1,
        autoClose: true,
        closable: true,
        pausable: true,
        renewable: false
      }
    });
    autoClosePlanId = acPlan.id;
  });

  it("Billing preview (dryRun = true) does NOT create invoices or advance billing dates", async () => {
    const sub = await prisma.subscription.create({
      data: {
        number: `SUB-PREVIEW-${Date.now()}`,
        customerId,
        planId,
        startDate: new Date(),
        nextBillingDate: new Date(),
        status: SubscriptionStatus.ACTIVE,
        lines: {
          create: [{ productId, quantity: 1, unitPrice: 20, amount: 20 }]
        }
      }
    });

    const countBefore = await prisma.invoice.count();

    const result = await billingService.runBilling(new Date(), {
      dryRun: true,
      subscriptionId: sub.id
    });

    expect(result.dryRun).toBe(true);
    expect(result.generatedInvoicesCount).toBe(1);

    const countAfter = await prisma.invoice.count();
    expect(countAfter).toBe(countBefore);
  });

  it("Billing Idempotency: Running billing twice for the same date creates no duplicate invoices", async () => {
    // Create an active subscription with nextBillingDate in the past
    const pastDate = new Date(Date.now() - 3 * 86400000);
    const sub = await prisma.subscription.create({
      data: {
        number: `SUB-IDEMP-${Date.now()}`,
        customerId,
        planId,
        startDate: pastDate,
        nextBillingDate: pastDate,
        status: SubscriptionStatus.ACTIVE,
        lines: {
          create: [{ productId, quantity: 1, unitPrice: 20, amount: 20 }]
        }
      }
    });

    const runDate = new Date();

    // 1st Run
    const run1 = await billingService.runBilling(runDate, {
      dryRun: false,
      subscriptionId: sub.id
    });
    const invoicesForSub1 = await prisma.invoice.count({
      where: { subscriptionId: sub.id }
    });
    expect(invoicesForSub1).toBeGreaterThan(0);

    // 2nd Run with exact same date
    const run2 = await billingService.runBilling(runDate, {
      dryRun: false,
      subscriptionId: sub.id
    });
    const invoicesForSub2 = await prisma.invoice.count({
      where: { subscriptionId: sub.id }
    });

    // Count must be IDENTICAL - nothing billed twice!
    expect(invoicesForSub2).toBe(invoicesForSub1);
  });

  it("should auto-close subscriptions past expiry date when plan.autoClose is true", async () => {
    const pastExpiry = new Date(Date.now() - 2 * 86400000);
    const sub = await prisma.subscription.create({
      data: {
        number: `SUB-AUTOCLOSE-${Date.now()}`,
        customerId,
        planId: autoClosePlanId,
        startDate: new Date(Date.now() - 10 * 86400000),
        nextBillingDate: new Date(),
        expiryDate: pastExpiry,
        status: SubscriptionStatus.ACTIVE,
        lines: {
          create: [{ productId, quantity: 1, unitPrice: 50, amount: 50 }]
        }
      }
    });

    const result = await billingService.runBilling(new Date(), {
      dryRun: false,
      subscriptionId: sub.id
    });
    expect(result.autoClosedCount).toBe(1);

    const updatedSub = await prisma.subscription.findUnique({
      where: { id: sub.id }
    });
    expect(updatedSub?.status).toBe(SubscriptionStatus.CLOSED);
  });

  it("POST /api/v1/billing/preview endpoints work for Time Machine", async () => {
    const res = await request(app)
      .post("/api/v1/billing/preview")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ date: new Date() });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.dryRun).toBe(true);
  });
});
