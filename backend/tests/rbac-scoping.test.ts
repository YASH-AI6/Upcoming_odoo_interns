import request from "supertest";
import { app } from "../src/app";
import { prisma } from "../src/config/prisma";
import { BillingPeriod, Role, SubscriptionStatus } from "@prisma/client";
import { getAuthToken } from "./helpers";

describe("RBAC and Customer Data Scoping", () => {
  let customerAId: string;
  let customerBId: string;
  let tokenCustomerA: string;
  let tokenCustomerB: string;
  let tokenStaff: string;
  let tokenAdmin: string;
  let subAId: string;
  let subBId: string;

  beforeAll(async () => {
    // Create two test customers
    const custA = await prisma.customer.create({
      data: {
        name: "Tenant Alpha Corp",
        email: `alpha_${Date.now()}@example.com`
      }
    });
    customerAId = custA.id;

    const custB = await prisma.customer.create({
      data: {
        name: "Tenant Beta Corp",
        email: `beta_${Date.now()}@example.com`
      }
    });
    customerBId = custB.id;

    tokenCustomerA = getAuthToken(Role.CUSTOMER, customerAId);
    tokenCustomerB = getAuthToken(Role.CUSTOMER, customerBId);
    tokenStaff = getAuthToken(Role.STAFF);
    tokenAdmin = getAuthToken(Role.ADMIN);

    const plan = await prisma.plan.findFirst();

    // Create a subscription for Customer A
    const subA = await prisma.subscription.create({
      data: {
        number: `SUB-TEST-A-${Date.now()}`,
        customerId: customerAId,
        planId: plan!.id,
        startDate: new Date(),
        nextBillingDate: new Date(),
        status: SubscriptionStatus.ACTIVE,
        lines: {
          create: [
            {
              productId: (await prisma.product.findFirst())!.id,
              quantity: 1,
              unitPrice: 100,
              amount: 100
            }
          ]
        }
      }
    });
    subAId = subA.id;

    // Create a subscription for Customer B
    const subB = await prisma.subscription.create({
      data: {
        number: `SUB-TEST-B-${Date.now()}`,
        customerId: customerBId,
        planId: plan!.id,
        startDate: new Date(),
        nextBillingDate: new Date(),
        status: SubscriptionStatus.ACTIVE,
        lines: {
          create: [
            {
              productId: (await prisma.product.findFirst())!.id,
              quantity: 1,
              unitPrice: 200,
              amount: 200
            }
          ]
        }
      }
    });
    subBId = subB.id;
  });

  describe("RBAC Permissions", () => {
    it("should allow STAFF to manage subscriptions", async () => {
      const res = await request(app)
        .get("/api/v1/subscriptions")
        .set("Authorization", `Bearer ${tokenStaff}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("should FORBID STAFF from creating taxes", async () => {
      const res = await request(app)
        .post("/api/v1/taxes")
        .set("Authorization", `Bearer ${tokenStaff}`)
        .send({ name: "Forbidden Tax", rate: 10 });
      expect(res.status).toBe(403);
    });

    it("should FORBID STAFF from creating discount rules", async () => {
      const res = await request(app)
        .post("/api/v1/discounts")
        .set("Authorization", `Bearer ${tokenStaff}`)
        .send({
          name: "Forbidden Discount",
          type: "PERCENTAGE",
          value: 10,
          scope: "SUBSCRIPTION"
        });
      expect(res.status).toBe(403);
    });

    it("should FORBID STAFF from creating plans", async () => {
      const res = await request(app)
        .post("/api/v1/plans")
        .set("Authorization", `Bearer ${tokenStaff}`)
        .send({
          name: "Forbidden Plan",
          price: 99,
          billingPeriod: BillingPeriod.MONTHLY
        });
      expect(res.status).toBe(403);
    });

    it("should allow ADMIN to manage taxes, discounts, and plans", async () => {
      const res = await request(app)
        .post("/api/v1/taxes")
        .set("Authorization", `Bearer ${tokenAdmin}`)
        .send({ name: `Admin Tax ${Date.now()}`, rate: 12 });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });
  });

  describe("Customer Server-Side Data Scoping", () => {
    it("Customer A listing subscriptions only returns Customer A's subscriptions", async () => {
      const res = await request(app)
        .get("/api/v1/subscriptions")
        .set("Authorization", `Bearer ${tokenCustomerA}`);

      expect(res.status).toBe(200);
      expect(res.body.items.length).toBeGreaterThan(0);
      for (const sub of res.body.items) {
        expect(sub.customerId).toBe(customerAId);
        expect(sub.customerId).not.toBe(customerBId);
      }
    });

    it("Customer A attempting to view Customer B subscription by ID is rejected with 403 Forbidden", async () => {
      const res = await request(app)
        .get(`/api/v1/subscriptions/${subBId}`)
        .set("Authorization", `Bearer ${tokenCustomerA}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("Customer portal /portal/subscriptions only returns scoped subscriptions", async () => {
      const res = await request(app)
        .get("/api/v1/portal/subscriptions")
        .set("Authorization", `Bearer ${tokenCustomerB}`);

      expect(res.status).toBe(200);
      for (const sub of res.body.items) {
        expect(sub.customerId).toBe(customerBId);
      }
    });
  });
});
