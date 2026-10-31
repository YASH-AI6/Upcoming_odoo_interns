import request from "supertest";
import { app } from "../src/app";
import { prisma } from "../src/config/prisma";
import { BillingPeriod, Role, SubscriptionStatus } from "@prisma/client";
import { getAuthToken } from "./helpers";

describe("Subscription State Machine, Plan Flags, and Quotation Hydration", () => {
  const adminToken = getAuthToken(Role.ADMIN);
  let customerId: string;
  let standardPlanId: string;
  let unpausablePlanId: string;
  let productId: string;
  let templateId: string;

  beforeAll(async () => {
    const cust = await prisma.customer.create({
      data: { name: "State Machine Tester", email: `sm_test_${Date.now()}@example.com` }
    });
    customerId = cust.id;

    const p = await prisma.product.findFirst({ include: { variants: true } });
    productId = p!.id;

    const plan1 = await prisma.plan.create({
      data: {
        name: `Pausable Plan ${Date.now()}`,
        price: 50,
        billingPeriod: BillingPeriod.MONTHLY,
        minQuantity: 1,
        closable: true,
        pausable: true,
        renewable: true
      }
    });
    standardPlanId = plan1.id;

    const plan2 = await prisma.plan.create({
      data: {
        name: `Unpausable Plan ${Date.now()}`,
        price: 150,
        billingPeriod: BillingPeriod.MONTHLY,
        minQuantity: 2,
        closable: false,
        pausable: false,
        renewable: false
      }
    });
    unpausablePlanId = plan2.id;

    const t = await prisma.quotationTemplate.create({
      data: {
        name: `Template ${Date.now()}`,
        validityDays: 14,
        planId: standardPlanId,
        lines: {
          create: [{ productId, quantity: 2 }]
        }
      }
    });
    templateId = t.id;
  });

  it("should create subscription from quotation template with prefilled plan, lines, and validityDays", async () => {
    const res = await request(app)
      .post("/api/v1/subscriptions")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        customerId,
        templateId
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.subscription.status).toBe(SubscriptionStatus.QUOTATION);
    expect(res.body.subscription.planId).toBe(standardPlanId);
    expect(res.body.subscription.lines.length).toBe(1);
    expect(res.body.subscription.lines[0].quantity).toBe(2);
    expect(res.body.subscription.expiryDate).toBeDefined();
  });

  it("should enforce plan minQuantity", async () => {
    const res = await request(app)
      .post("/api/v1/subscriptions")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        customerId,
        planId: unpausablePlanId, // minQuantity = 2
        lines: [{ productId, quantity: 1 }] // 1 < 2 -> fails
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("below the plan minimum required quantity");
  });

  it("should enforce state machine transitions: DRAFT -> CONFIRMED -> ACTIVE -> PAUSED -> ACTIVE -> CLOSED", async () => {
    // 1. Create DRAFT
    const createRes = await request(app)
      .post("/api/v1/subscriptions")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        customerId,
        planId: standardPlanId,
        status: SubscriptionStatus.DRAFT,
        lines: [{ productId, quantity: 1 }]
      });
    const subId = createRes.body.subscription.id;
    expect(createRes.body.subscription.status).toBe(SubscriptionStatus.DRAFT);

    // 2. Reject illegal transition: DRAFT cannot go directly to PAUSED
    const illegalPauseRes = await request(app)
      .post(`/api/v1/subscriptions/${subId}/pause`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(illegalPauseRes.status).toBe(400);
    expect(illegalPauseRes.body.message).toContain("Illegal subscription status transition");

    // 3. Confirm (DRAFT -> CONFIRMED)
    const confirmRes = await request(app)
      .post(`/api/v1/subscriptions/${subId}/confirm`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.subscription.status).toBe(SubscriptionStatus.CONFIRMED);

    // 4. Activate (CONFIRMED -> ACTIVE)
    const activateRes = await request(app)
      .post(`/api/v1/subscriptions/${subId}/activate`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(activateRes.status).toBe(200);
    expect(activateRes.body.subscription.status).toBe(SubscriptionStatus.ACTIVE);

    // 5. Pause (ACTIVE -> PAUSED)
    const pauseRes = await request(app)
      .post(`/api/v1/subscriptions/${subId}/pause`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(pauseRes.status).toBe(200);
    expect(pauseRes.body.subscription.status).toBe(SubscriptionStatus.PAUSED);

    // 6. Resume (PAUSED -> ACTIVE)
    const resumeRes = await request(app)
      .post(`/api/v1/subscriptions/${subId}/resume`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(resumeRes.status).toBe(200);
    expect(resumeRes.body.subscription.status).toBe(SubscriptionStatus.ACTIVE);

    // 7. Close (ACTIVE -> CLOSED)
    const closeRes = await request(app)
      .post(`/api/v1/subscriptions/${subId}/close`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(closeRes.status).toBe(200);
    expect(closeRes.body.subscription.status).toBe(SubscriptionStatus.CLOSED);

    // 8. Renew (CLOSED -> ACTIVE)
    const renewRes = await request(app)
      .post(`/api/v1/subscriptions/${subId}/renew`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(renewRes.status).toBe(200);
    expect(renewRes.body.subscription.status).toBe(SubscriptionStatus.ACTIVE);
  });

  it("should reject pause if plan.pausable is false", async () => {
    // Create subscription on unpausable plan
    const createRes = await request(app)
      .post("/api/v1/subscriptions")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        customerId,
        planId: unpausablePlanId,
        status: SubscriptionStatus.CONFIRMED,
        lines: [{ productId, quantity: 2 }]
      });
    const subId = createRes.body.subscription.id;

    // Activate
    await request(app)
      .post(`/api/v1/subscriptions/${subId}/activate`)
      .set("Authorization", `Bearer ${adminToken}`);

    // Try to pause -> rejected because plan.pausable is false!
    const pauseRes = await request(app)
      .post(`/api/v1/subscriptions/${subId}/pause`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(pauseRes.status).toBe(400);
    expect(pauseRes.body.message).toContain("does not allow pausing");
  });
});
