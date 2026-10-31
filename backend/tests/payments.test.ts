import request from "supertest";
import { app } from "../src/app";
import { prisma } from "../src/config/prisma";
import { InvoiceStatus, Role } from "@prisma/client";
import { getAuthToken } from "./helpers";

describe("Payments: Partial Payments & Auto-Marking Invoices PAID", () => {
  const adminToken = getAuthToken(Role.ADMIN);
  let customerId: string;
  let productId: string;

  beforeAll(async () => {
    const cust = await prisma.customer.create({
      data: { name: "Payment Tester", email: `pay_test_${Date.now()}@test.org` }
    });
    customerId = cust.id;

    const prod = await prisma.product.findFirst();
    productId = prod!.id;
  });

  it("should record partial payment and leave status CONFIRMED", async () => {
    // Create an invoice with total $100
    const invRes = await request(app)
      .post("/api/v1/invoices")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        customerId,
        lines: [{ productId, quantity: 1, unitPrice: 100, taxRate: 0, discountAmount: 0 }]
      });
    const invId = invRes.body.invoice.id;

    // Confirm invoice so it can accept payments
    await request(app)
      .post(`/api/v1/invoices/${invId}/confirm`)
      .set("Authorization", `Bearer ${adminToken}`);

    // Pay $40 (partial payment)
    const payRes = await request(app)
      .post(`/api/v1/invoices/${invId}/payments`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        method: "CREDIT_CARD",
        amount: 40,
        note: "First installment"
      });

    expect(payRes.status).toBe(201);
    expect(payRes.body.success).toBe(true);
    expect(Number(payRes.body.invoice.amountPaid)).toBe(40);
    expect(payRes.body.invoice.status).toBe(InvoiceStatus.CONFIRMED);
  });

  it("should mark invoice PAID once cumulative payments reach or exceed total", async () => {
    // Create invoice with total $100
    const invRes = await request(app)
      .post("/api/v1/invoices")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        customerId,
        lines: [{ productId, quantity: 1, unitPrice: 100, taxRate: 0, discountAmount: 0 }]
      });
    const invId = invRes.body.invoice.id;

    await request(app)
      .post(`/api/v1/invoices/${invId}/confirm`)
      .set("Authorization", `Bearer ${adminToken}`);

    // Pay 1st installment $60
    await request(app)
      .post(`/api/v1/invoices/${invId}/payments`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ method: "BANK_TRANSFER", amount: 60 });

    // Pay 2nd installment $40 (total now $100)
    const payRes2 = await request(app)
      .post(`/api/v1/invoices/${invId}/payments`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ method: "CASH", amount: 40 });

    expect(payRes2.status).toBe(201);
    expect(Number(payRes2.body.invoice.amountPaid)).toBe(100);
    expect(payRes2.body.invoice.status).toBe(InvoiceStatus.PAID);
  });

  it("should reject paying a draft or cancelled invoice", async () => {
    // Draft invoice
    const draftRes = await request(app)
      .post("/api/v1/invoices")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        customerId,
        lines: [{ productId, quantity: 1, unitPrice: 50, taxRate: 0, discountAmount: 0 }]
      });
    const draftId = draftRes.body.invoice.id;

    const payDraftRes = await request(app)
      .post(`/api/v1/invoices/${draftId}/payments`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ method: "CREDIT_CARD", amount: 50 });

    expect(payDraftRes.status).toBe(400);
    expect(payDraftRes.body.message).toContain("must be confirmed");

    // Cancel invoice
    const cancelRes = await request(app)
      .post(`/api/v1/invoices/${draftId}/cancel`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(cancelRes.status).toBe(200);

    const payCancelRes = await request(app)
      .post(`/api/v1/invoices/${draftId}/payments`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ method: "CREDIT_CARD", amount: 50 });

    expect(payCancelRes.status).toBe(400);
    expect(payCancelRes.body.message).toContain("cancelled");
  });
});
