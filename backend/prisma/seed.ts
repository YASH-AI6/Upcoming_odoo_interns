import {
  BillingPeriod,
  DiscountScope,
  DiscountType,
  InvoiceStatus,
  Prisma,
  PrismaClient,
  Role,
  SubscriptionStatus
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting database seed...");

  // Clean existing data in reverse relation order
  console.log("Cleaning existing records...");
  await prisma.payment.deleteMany();
  await prisma.discountUsage.deleteMany();
  await prisma.invoiceLine.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.subscriptionLine.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.quotationTemplateLine.deleteMany();
  await prisma.quotationTemplate.deleteMany();
  await prisma.productTax.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.discount.deleteMany();
  await prisma.tax.deleteMany();
  await prisma.product.deleteMany();
  await prisma.plan.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.sequenceTracker.deleteMany();

  const salt = await bcrypt.genSalt(10);
  const adminPasswordHash = await bcrypt.hash("AdminPassword123!", salt);
  const staffPasswordHash = await bcrypt.hash("StaffPassword123!", salt);
  const customerPasswordHash = await bcrypt.hash("CustomerPassword123!", salt);

  // 1. Create Admin
  const admin = await prisma.user.create({
    data: {
      email: "admin@example.com",
      password: adminPasswordHash,
      role: Role.ADMIN
    }
  });

  // 2. Create 2 Staff
  await prisma.user.createMany({
    data: [
      { email: "staff1@example.com", password: staffPasswordHash, role: Role.STAFF },
      { email: "staff2@example.com", password: staffPasswordHash, role: Role.STAFF }
    ]
  });

  // 3. Create 3 Taxes
  const taxesData = await Promise.all([
    prisma.tax.create({ data: { name: "VAT Standard 15%", rate: new Prisma.Decimal(15) } }),
    prisma.tax.create({ data: { name: "Sales Tax 8%", rate: new Prisma.Decimal(8) } }),
    prisma.tax.create({ data: { name: "Tech Service Tax 5%", rate: new Prisma.Decimal(5) } })
  ]);

  // 4. Create 5 Plans across all billing periods
  const plans = await Promise.all([
    prisma.plan.create({
      data: {
        name: "Daily Developer Pass",
        price: new Prisma.Decimal(10),
        billingPeriod: BillingPeriod.DAILY,
        minQuantity: 1,
        autoClose: false,
        closable: true,
        pausable: true,
        renewable: true
      }
    }),
    prisma.plan.create({
      data: {
        name: "Weekly Startup Sprint",
        price: new Prisma.Decimal(49),
        billingPeriod: BillingPeriod.WEEKLY,
        minQuantity: 1,
        autoClose: false,
        closable: true,
        pausable: true,
        renewable: true
      }
    }),
    prisma.plan.create({
      data: {
        name: "Monthly Professional",
        price: new Prisma.Decimal(149),
        billingPeriod: BillingPeriod.MONTHLY,
        minQuantity: 1,
        autoClose: false,
        closable: true,
        pausable: true,
        renewable: true
      }
    }),
    prisma.plan.create({
      data: {
        name: "Monthly Enterprise (Fixed Term)",
        price: new Prisma.Decimal(299),
        billingPeriod: BillingPeriod.MONTHLY,
        minQuantity: 2,
        autoClose: true,
        closable: true,
        pausable: false,
        renewable: false
      }
    }),
    prisma.plan.create({
      data: {
        name: "Yearly Ultimate Cloud",
        price: new Prisma.Decimal(1499),
        billingPeriod: BillingPeriod.YEARLY,
        minQuantity: 1,
        autoClose: false,
        closable: true,
        pausable: true,
        renewable: true
      }
    })
  ]);

  // 5. Create 20 Products with variants (include brand Odoo = +560)
  const productNames = [
    "Core ERP Engine",
    "CRM & Lead Funnel",
    "Accounting & Invoicing Pro",
    "Inventory & Warehouse Hub",
    "Point of Sale Sync",
    "HR & Payroll Manager",
    "E-Commerce Multi-Channel",
    "Business Intelligence & BI",
    "Document AI & OCR",
    "API Gateway & Webhooks",
    "Dedicated Cloud Hosting",
    "Multi-Currency Processor",
    "Enterprise Security Suite",
    "Automated Backup Engine",
    "Audit Log Collector",
    "Workflow Automation Bot",
    "Custom Reporting Builder",
    "Mobile Native Sync",
    "Priority 24/7 Support",
    "Custom Domain & SSL"
  ];

  const products: any[] = [];
  for (let i = 0; i < productNames.length; i++) {
    const p = await prisma.product.create({
      data: {
        name: productNames[i],
        type: i % 3 === 0 ? "SERVICE" : i % 3 === 1 ? "STORABLE" : "CONSUMABLE",
        salesPrice: new Prisma.Decimal(50 + i * 25),
        costPrice: new Prisma.Decimal(20 + i * 10),
        notes: `Enterprise grade module for ${productNames[i]}`,
        variants: {
          create: [
            { attribute: "Brand", value: "Odoo", extraPrice: new Prisma.Decimal(560) },
            { attribute: "Tier", value: "Enterprise", extraPrice: new Prisma.Decimal(120) }
          ]
        },
        taxes: {
          create: [{ taxId: taxesData[i % taxesData.length].id }]
        }
      },
      include: { variants: true }
    });
    products.push(p);
  }

  // 6. Create 3 Discounts
  const discounts = await Promise.all([
    prisma.discount.create({
      data: {
        name: "Early Bird 10%",
        type: DiscountType.PERCENTAGE,
        value: new Prisma.Decimal(10),
        minPurchase: new Prisma.Decimal(50),
        scope: DiscountScope.SUBSCRIPTION,
        usageLimit: 2000,
        usedCount: 0
      }
    }),
    prisma.discount.create({
      data: {
        name: "Odoo Integration Special $50",
        type: DiscountType.FIXED,
        value: new Prisma.Decimal(50),
        minPurchase: new Prisma.Decimal(100),
        scope: DiscountScope.PRODUCT,
        targetProductIds: [products[0].id, products[1].id],
        usageLimit: 1500,
        usedCount: 0
      }
    }),
    prisma.discount.create({
      data: {
        name: "Enterprise Bulk 15%",
        type: DiscountType.PERCENTAGE,
        value: new Prisma.Decimal(15),
        minPurchase: new Prisma.Decimal(300),
        minQuantity: 2,
        scope: DiscountScope.SUBSCRIPTION,
        usageLimit: 1000,
        usedCount: 0
      }
    })
  ]);

  // 7. Create 3 Quotation Templates
  await Promise.all([
    prisma.quotationTemplate.create({
      data: {
        name: "Startup Starter Pack",
        validityDays: 15,
        planId: plans[0].id,
        lines: {
          create: [
            { productId: products[0].id, quantity: 1 },
            { productId: products[1].id, quantity: 1 }
          ]
        }
      }
    }),
    prisma.quotationTemplate.create({
      data: {
        name: "Growth Business Stack",
        validityDays: 30,
        planId: plans[2].id,
        lines: {
          create: [
            { productId: products[0].id, variantId: products[0].variants[0].id, quantity: 1 },
            { productId: products[2].id, quantity: 1 },
            { productId: products[3].id, quantity: 2 }
          ]
        }
      }
    }),
    prisma.quotationTemplate.create({
      data: {
        name: "Enterprise Scale Solution",
        validityDays: 60,
        planId: plans[4].id,
        lines: {
          create: [
            { productId: products[0].id, variantId: products[0].variants[0].id, quantity: 2 },
            { productId: products[4].id, quantity: 1 },
            { productId: products[7].id, quantity: 1 },
            { productId: products[10].id, quantity: 1 }
          ]
        }
      }
    })
  ]);

  // 8. Create 200 Customers in batches
  console.log("Seeding 200 customers...");
  const customerRows: any[] = [];
  for (let i = 1; i <= 200; i++) {
    customerRows.push({
      id: crypto.randomUUID(),
      name: `Customer Company ${i}`,
      email: `customer${i}@business.org`,
      phone: `+1-555-01${String(i).padStart(2, "0")}`,
      address: `${100 + i} Commerce Blvd`,
      city: i % 2 === 0 ? "New York" : "San Francisco",
      state: i % 2 === 0 ? "NY" : "CA",
      postalCode: i % 2 === 0 ? "10001" : "94105",
      country: "USA",
      createdAt: new Date(Date.now() - (200 - i) * 86400000)
    });
  }

  await prisma.customer.createMany({ data: customerRows });
  const allCustomerIds = customerRows.map((c) => c.id);

  // Link first 5 customers to user accounts for login testing
  const customerUsers = [];
  for (let i = 0; i < 5; i++) {
    customerUsers.push({
      email: customerRows[i].email,
      password: customerPasswordHash,
      role: Role.CUSTOMER,
      customerId: customerRows[i].id
    });
  }
  await prisma.user.createMany({ data: customerUsers });

  // 9. Create 5,100 Subscriptions in Batches
  console.log("Seeding 5,100 subscriptions in fast batches...");
  const totalSubscriptions = 5100;
  const statuses = [
    SubscriptionStatus.ACTIVE,
    SubscriptionStatus.ACTIVE,
    SubscriptionStatus.ACTIVE,
    SubscriptionStatus.ACTIVE,
    SubscriptionStatus.CONFIRMED,
    SubscriptionStatus.PAUSED,
    SubscriptionStatus.DRAFT,
    SubscriptionStatus.QUOTATION,
    SubscriptionStatus.CLOSED
  ];

  const now = Date.now();
  const subscriptionRows: any[] = [];
  const subscriptionLineRows: any[] = [];
  const subIds: string[] = [];

  for (let i = 1; i <= totalSubscriptions; i++) {
    const subId = crypto.randomUUID();
    subIds.push(subId);
    const subNum = `SUB-${String(i).padStart(4, "0")}`;
    const custId = allCustomerIds[i % allCustomerIds.length];
    const plan = plans[i % plans.length];
    const status = statuses[i % statuses.length];

    // Spread start dates realistically across the past 365 days
    const daysAgo = (i % 365) + 1;
    const startDate = new Date(now - daysAgo * 86400000);
    const nextBillingDate =
      status === SubscriptionStatus.ACTIVE
        ? new Date(now + ((i % 30) - 10) * 86400000) // some in past (overdue billing), some in future
        : new Date(startDate.getTime() + 30 * 86400000);

    const expiryDate =
      plan.autoClose || i % 4 === 0
        ? new Date(startDate.getTime() + 180 * 86400000)
        : null;

    subscriptionRows.push({
      id: subId,
      number: subNum,
      customerId: custId,
      planId: plan.id,
      startDate,
      expiryDate,
      paymentTerms: 15,
      nextBillingDate,
      status,
      createdAt: startDate,
      updatedAt: startDate
    });

    // 1-2 product lines per subscription
    const product1 = products[i % products.length];
    const useOdooVariant = i % 5 === 0;
    const variant1 = useOdooVariant ? product1.variants[0] : null;
    const unitPrice1 = Number(product1.salesPrice) + (variant1 ? Number(variant1.extraPrice) : 0);
    const qty1 = 1 + (i % 3);

    subscriptionLineRows.push({
      id: crypto.randomUUID(),
      subscriptionId: subId,
      productId: product1.id,
      variantId: variant1 ? variant1.id : null,
      quantity: qty1,
      unitPrice: new Prisma.Decimal(unitPrice1),
      taxRate: new Prisma.Decimal(15),
      amount: new Prisma.Decimal(unitPrice1 * qty1),
      createdAt: startDate,
      updatedAt: startDate
    });
  }

  // Insert subscriptions in batches of 1000
  const CHUNK_SIZE = 1000;
  for (let i = 0; i < subscriptionRows.length; i += CHUNK_SIZE) {
    const chunk = subscriptionRows.slice(i, i + CHUNK_SIZE);
    await prisma.subscription.createMany({ data: chunk });
  }

  // Insert subscription lines in batches of 1000
  for (let i = 0; i < subscriptionLineRows.length; i += CHUNK_SIZE) {
    const chunk = subscriptionLineRows.slice(i, i + CHUNK_SIZE);
    await prisma.subscriptionLine.createMany({ data: chunk });
  }

  // Initialize sequence tracker for SUB
  await prisma.sequenceTracker.upsert({
    where: { prefix: "SUB" },
    update: { currentValue: totalSubscriptions },
    create: { id: "SUB", prefix: "SUB", currentValue: totalSubscriptions }
  });

  // 10. Seed Invoices (around 1,200 past invoices)
  console.log("Seeding past invoices, overdue invoices, and payments...");
  const invoiceCount = 1200;
  const invoiceRows: any[] = [];
  const invoiceLineRows: any[] = [];
  const paymentRows: any[] = [];

  for (let i = 1; i <= invoiceCount; i++) {
    const invId = crypto.randomUUID();
    const invNum = `INV-${String(i).padStart(4, "0")}`;
    const sub = subscriptionRows[i % subscriptionRows.length];
    const line = subscriptionLineRows[i % subscriptionLineRows.length];

    const subtotal = Number(line.amount);
    const taxTotal = (subtotal * 15) / 100;
    const total = subtotal + taxTotal;

    // Mixed statuses: PAID, CONFIRMED (some overdue), DRAFT
    let status: InvoiceStatus = InvoiceStatus.PAID;
    let amountPaid = total;
    let dueDate = new Date(now - (i % 60) * 86400000);
    let issueDate = new Date(dueDate.getTime() - 15 * 86400000);

    if (i % 3 === 0) {
      // Overdue CONFIRMED invoice
      status = InvoiceStatus.CONFIRMED;
      amountPaid = 0;
      dueDate = new Date(now - ((i % 45) + 1) * 86400000); // 1 to 45 days ago -> tests 1-7, 8-30, 30+ buckets!
    } else if (i % 5 === 0) {
      // Partially paid CONFIRMED invoice
      status = InvoiceStatus.CONFIRMED;
      amountPaid = Math.round(total / 2);
      dueDate = new Date(now + 10 * 86400000); // future due date
    } else if (i % 10 === 0) {
      status = InvoiceStatus.DRAFT;
      amountPaid = 0;
      dueDate = new Date(now + 15 * 86400000);
    }

    const periodStart = issueDate;
    const periodEnd = new Date(issueDate.getTime() + 30 * 86400000);

    invoiceRows.push({
      id: invId,
      number: invNum,
      subscriptionId: sub.id,
      customerId: sub.customerId,
      billingPeriodStart: periodStart,
      billingPeriodEnd: periodEnd,
      issueDate,
      dueDate,
      status,
      subtotal: new Prisma.Decimal(subtotal),
      discountTotal: new Prisma.Decimal(0),
      taxTotal: new Prisma.Decimal(taxTotal),
      total: new Prisma.Decimal(total),
      amountPaid: new Prisma.Decimal(amountPaid),
      createdAt: issueDate,
      updatedAt: issueDate
    });

    invoiceLineRows.push({
      id: crypto.randomUUID(),
      invoiceId: invId,
      productId: line.productId,
      variantId: line.variantId,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      taxRate: line.taxRate,
      discountAmount: new Prisma.Decimal(0),
      amount: new Prisma.Decimal(total),
      createdAt: issueDate,
      updatedAt: issueDate
    });

    if (amountPaid > 0) {
      paymentRows.push({
        id: crypto.randomUUID(),
        invoiceId: invId,
        method: i % 2 === 0 ? "CREDIT_CARD" : "BANK_TRANSFER",
        amount: new Prisma.Decimal(amountPaid),
        date: new Date(issueDate.getTime() + 2 * 86400000),
        note: `Payment for ${invNum}`,
        createdAt: issueDate,
        updatedAt: issueDate
      });
    }
  }

  // Insert invoices, lines, and payments in batches
  for (let i = 0; i < invoiceRows.length; i += CHUNK_SIZE) {
    await prisma.invoice.createMany({ data: invoiceRows.slice(i, i + CHUNK_SIZE) });
  }
  for (let i = 0; i < invoiceLineRows.length; i += CHUNK_SIZE) {
    await prisma.invoiceLine.createMany({ data: invoiceLineRows.slice(i, i + CHUNK_SIZE) });
  }
  for (let i = 0; i < paymentRows.length; i += CHUNK_SIZE) {
    await prisma.payment.createMany({ data: paymentRows.slice(i, i + CHUNK_SIZE) });
  }

  await prisma.sequenceTracker.upsert({
    where: { prefix: "INV" },
    update: { currentValue: invoiceCount },
    create: { id: "INV", prefix: "INV", currentValue: invoiceCount }
  });

  console.log("Seed completed successfully!");
  console.log(`- Admin: 1 (admin@example.com / AdminPassword123!)`);
  console.log(`- Staff: 2 (staff1@example.com, staff2@example.com / StaffPassword123!)`);
  console.log(`- Customers: ${customerRows.length}`);
  console.log(`- Products: ${products.length} (with Odoo variant +560)`);
  console.log(`- Plans: ${plans.length}`);
  console.log(`- Taxes: ${taxesData.length}`);
  console.log(`- Discounts: ${discounts.length}`);
  console.log(`- Subscriptions: ${subscriptionRows.length}`);
  console.log(`- Invoices: ${invoiceRows.length}`);
  console.log(`- Payments: ${paymentRows.length}`);
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
