import request from "supertest";
import { app } from "../src/app";
import { prisma } from "../src/config/prisma";
import { discountsService } from "../src/modules/discounts/discounts.service";
import { DiscountScope, DiscountType, Role } from "@prisma/client";
import { getAuthToken } from "./helpers";

describe("Taxes, Discounts & Variant Extra Price Rules", () => {
  const adminToken = getAuthToken(Role.ADMIN);
  let customerId: string;
  let productWithVariant: any;

  beforeAll(async () => {
    const cust = await prisma.customer.create({
      data: { name: "Tax Discount Tester", email: `tax_disc_${Date.now()}@test.org` }
    });
    customerId = cust.id;

    productWithVariant = await prisma.product.create({
      data: {
        name: "Enterprise ERP System",
        salesPrice: 200,
        variants: {
          create: [{ attribute: "Brand", value: "Odoo", extraPrice: 560 }]
        }
      },
      include: { variants: true }
    });
  });

  describe("Tax Calculations", () => {
    it("should calculate exact tax totals when creating an invoice", async () => {
      // 1 line: qty 2, unitPrice 100, taxRate 10%
      // Subtotal = 200, Tax = 20, Total = 220
      const res = await request(app)
        .post("/api/v1/invoices")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          customerId,
          lines: [
            {
              productId: productWithVariant.id,
              quantity: 2,
              unitPrice: 100,
              taxRate: 10,
              discountAmount: 0
            }
          ]
        });

      expect(res.status).toBe(201);
      expect(Number(res.body.invoice.subtotal)).toBe(200);
      expect(Number(res.body.invoice.taxTotal)).toBe(20);
      expect(Number(res.body.invoice.total)).toBe(220);
    });
  });

  describe("Discount Usage Limits, Expiry, and Scope", () => {
    it("should stop applying discount once usageLimit is reached", async () => {
      const discount = await prisma.discount.create({
        data: {
          name: `Limit Test ${Date.now()}`,
          type: DiscountType.PERCENTAGE,
          value: 10,
          scope: DiscountScope.PRODUCT,
          minPurchase: 0,
          usageLimit: 2,
          usedCount: 2 // already at limit
        }
      });

      const isEligible = discountsService.isDiscountEligible(discount, {
        purchaseAmount: 500,
        quantity: 1,
        scope: DiscountScope.PRODUCT,
        targetId: productWithVariant.id
      });

      expect(isEligible).toBe(false);
    });

    it("should reject expired discount (endDate in the past)", async () => {
      const expiredDiscount = await prisma.discount.create({
        data: {
          name: `Expired Test ${Date.now()}`,
          type: DiscountType.FIXED,
          value: 20,
          scope: DiscountScope.PRODUCT,
          endDate: new Date(Date.now() - 86400000), // yesterday
          usageLimit: 10,
          usedCount: 0
        }
      });

      const isEligible = discountsService.isDiscountEligible(expiredDiscount, {
        purchaseAmount: 100,
        quantity: 1,
        scope: DiscountScope.PRODUCT,
        targetId: productWithVariant.id
      });

      expect(isEligible).toBe(false);
    });

    it("should correctly compute percentage and fixed discount amounts", () => {
      const pctDiscount: any = {
        type: DiscountType.PERCENTAGE,
        value: 15
      };
      // 15% of $200 = $30
      expect(discountsService.calculateDiscountAmount(pctDiscount, 200)).toBe(30);

      const fixedDiscount: any = {
        type: DiscountType.FIXED,
        value: 50
      };
      // Fixed $50 on $200 = $50
      expect(discountsService.calculateDiscountAmount(fixedDiscount, 200)).toBe(50);

      // Fixed discount capped at base amount (cannot be negative)
      expect(discountsService.calculateDiscountAmount(fixedDiscount, 30)).toBe(30);
    });
  });

  describe("Product Variant Extra Price Calculation", () => {
    it("selecting a variant adds extraPrice to the unit price (e.g. brand Odoo = +560)", async () => {
      const plan = await prisma.plan.findFirst();
      const odooVariant = productWithVariant.variants.find((v: any) => v.value === "Odoo");

      const res = await request(app)
        .post("/api/v1/subscriptions")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          customerId,
          planId: plan!.id,
          lines: [
            {
              productId: productWithVariant.id,
              variantId: odooVariant.id,
              quantity: 1
            }
          ]
        });

      expect(res.status).toBe(201);
      // Base: 200 + Extra: 560 = 760
      const line = res.body.subscription.lines[0];
      expect(Number(line.unitPrice)).toBe(760);
      expect(Number(line.amount)).toBe(760);
    });
  });
});
