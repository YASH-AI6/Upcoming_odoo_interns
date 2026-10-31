import { prisma } from "../../config/prisma";
import { addBillingPeriod } from "../../utils/dateUtils";
import { getNextSequenceNumber } from "../../utils/sequence";
import {
  Discount,
  DiscountScope,
  DiscountType,
  InvoiceStatus,
  Prisma,
  SubscriptionStatus
} from "@prisma/client";

export interface BillingRunOptions {
  dryRun?: boolean;
  batchSize?: number;
  subscriptionId?: string;
}

export interface GeneratedInvoiceSummary {
  subscriptionId: string;
  subscriptionNumber: string;
  invoiceNumber?: string;
  customerName: string;
  billingPeriodStart: Date;
  billingPeriodEnd: Date;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  appliedDiscounts: Array<{ name: string; amount: number }>;
}

export interface BillingErrorSummary {
  subscriptionId: string;
  subscriptionNumber: string;
  error: string;
}

export interface BillingRunResult {
  asOfDate: string;
  dryRun: boolean;
  processedSubscriptionsCount: number;
  generatedInvoicesCount: number;
  totalBilledAmount: number;
  autoClosedCount: number;
  invoices: GeneratedInvoiceSummary[];
  errors: BillingErrorSummary[];
}

export class BillingService {
  async runBilling(
    asOfDate: Date = new Date(),
    options: BillingRunOptions = {}
  ): Promise<BillingRunResult> {
    const dryRun = options.dryRun ?? false;
    const batchSize = options.batchSize ?? 50;

    const invoicesSummary: GeneratedInvoiceSummary[] = [];
    const errors: BillingErrorSummary[] = [];
    let autoClosedCount = 0;
    let totalBilledAmount = 0;

    // 1. Auto-close expired subscriptions with plan.autoClose === true
    const expiredAutoCloseSubs = await prisma.subscription.findMany({
      where: {
        status: SubscriptionStatus.ACTIVE,
        expiryDate: { lte: asOfDate },
        plan: { autoClose: true },
        ...(options.subscriptionId ? { id: options.subscriptionId } : {})
      },
      select: { id: true }
    });

    if (expiredAutoCloseSubs.length > 0) {
      autoClosedCount = expiredAutoCloseSubs.length;
      if (!dryRun) {
        await prisma.subscription.updateMany({
          where: { id: { in: expiredAutoCloseSubs.map((s) => s.id) } },
          data: { status: SubscriptionStatus.CLOSED }
        });
      }
    }

    // 2. Load all active discounts for checking
    const allDiscounts = await prisma.discount.findMany({
      where: {
        AND: [
          { OR: [{ startDate: null }, { startDate: { lte: asOfDate } }] },
          { OR: [{ endDate: null }, { endDate: { gte: asOfDate } }] }
        ]
      }
    });

    // In-memory tracker for discount usage during dry run or run
    const discountUsageTracker = new Map<string, number>();
    for (const d of allDiscounts) {
      discountUsageTracker.set(d.id, d.usedCount);
    }

    // 3. Find ACTIVE subscriptions ready for billing
    const activeSubscriptions = await prisma.subscription.findMany({
      where: {
        status: SubscriptionStatus.ACTIVE,
        nextBillingDate: { lte: asOfDate },
        ...(options.subscriptionId ? { id: options.subscriptionId } : {})
      },
      include: {
        customer: true,
        plan: true,
        lines: {
          include: {
            product: {
              include: { taxes: { include: { tax: true } } }
            },
            variant: true
          }
        }
      },
      orderBy: { nextBillingDate: "asc" }
    });

    // 4. Process in batches
    for (let i = 0; i < activeSubscriptions.length; i += batchSize) {
      const batch = activeSubscriptions.slice(i, i + batchSize);

      for (const subscription of batch) {
        try {
          let currentPeriodStart = new Date(subscription.nextBillingDate);
          let latestPeriodEnd = currentPeriodStart;

          // Catch up multiple missed periods in order
          while (currentPeriodStart <= asOfDate) {
            const currentPeriodEnd = addBillingPeriod(
              currentPeriodStart,
              subscription.plan.billingPeriod
            );

            // Check database idempotency: check if invoice already created for this period
            const existingInvoice = await prisma.invoice.findFirst({
              where: {
                subscriptionId: subscription.id,
                billingPeriodStart: currentPeriodStart
              }
            });

            if (existingInvoice) {
              currentPeriodStart = currentPeriodEnd;
              latestPeriodEnd = currentPeriodEnd;
              continue;
            }

            // Calculate invoice lines
            let subtotal = 0;
            let discountTotal = 0;
            let taxTotal = 0;
            const appliedDiscountsForInvoice: Array<{
              discountId: string;
              name: string;
              amount: number;
            }> = [];

            const invoiceLinesData: Array<Prisma.InvoiceLineCreateWithoutInvoiceInput> = [];

            for (const subLine of subscription.lines) {
              const lineBase = Number(subLine.unitPrice) * subLine.quantity;
              let lineDiscount = 0;

              // Check eligible product discounts
              for (const discount of allDiscounts) {
                if (discount.scope !== DiscountScope.PRODUCT) continue;

                const currentUsed = discountUsageTracker.get(discount.id) ?? discount.usedCount;
                if (discount.usageLimit !== null && currentUsed >= discount.usageLimit) {
                  continue;
                }

                if (
                  discount.targetProductIds.length > 0 &&
                  !discount.targetProductIds.includes(subLine.productId)
                ) {
                  continue;
                }

                if (lineBase < Number(discount.minPurchase)) continue;
                if (subLine.quantity < discount.minQuantity) continue;

                let calculatedDiscount = 0;
                if (discount.type === DiscountType.PERCENTAGE) {
                  calculatedDiscount = (lineBase * Number(discount.value)) / 100;
                } else {
                  calculatedDiscount = Number(discount.value);
                }

                calculatedDiscount = Math.min(lineBase - lineDiscount, Math.max(0, calculatedDiscount));

                if (calculatedDiscount > 0) {
                  lineDiscount += calculatedDiscount;
                  discountUsageTracker.set(discount.id, currentUsed + 1);
                  appliedDiscountsForInvoice.push({
                    discountId: discount.id,
                    name: discount.name,
                    amount: calculatedDiscount
                  });
                }
              }

              const taxableBase = Math.max(0, lineBase - lineDiscount);
              const lineTax = (taxableBase * Number(subLine.taxRate)) / 100;
              const lineAmount = taxableBase + lineTax;

              subtotal += lineBase;
              discountTotal += lineDiscount;
              taxTotal += lineTax;

              invoiceLinesData.push({
                product: { connect: { id: subLine.productId } },
                variant: subLine.variantId ? { connect: { id: subLine.variantId } } : undefined,
                quantity: subLine.quantity,
                unitPrice: subLine.unitPrice,
                taxRate: subLine.taxRate,
                discountAmount: new Prisma.Decimal(lineDiscount),
                amount: new Prisma.Decimal(lineAmount)
              });
            }

            // Check eligible subscription-level discounts
            for (const discount of allDiscounts) {
              if (discount.scope !== DiscountScope.SUBSCRIPTION) continue;

              const currentUsed = discountUsageTracker.get(discount.id) ?? discount.usedCount;
              if (discount.usageLimit !== null && currentUsed >= discount.usageLimit) {
                continue;
              }

              if (
                discount.targetSubscriptionIds.length > 0 &&
                !discount.targetSubscriptionIds.includes(subscription.id)
              ) {
                continue;
              }

              if (subtotal < Number(discount.minPurchase)) continue;

              let calculatedDiscount = 0;
              if (discount.type === DiscountType.PERCENTAGE) {
                calculatedDiscount = (subtotal * Number(discount.value)) / 100;
              } else {
                calculatedDiscount = Number(discount.value);
              }

              calculatedDiscount = Math.min(
                subtotal - discountTotal,
                Math.max(0, calculatedDiscount)
              );

              if (calculatedDiscount > 0) {
                discountTotal += calculatedDiscount;
                discountUsageTracker.set(discount.id, currentUsed + 1);
                appliedDiscountsForInvoice.push({
                  discountId: discount.id,
                  name: discount.name,
                  amount: calculatedDiscount
                });
              }
            }

            const total = Math.max(0, subtotal - discountTotal + taxTotal);
            totalBilledAmount += total;

            const dueDate = new Date(
              currentPeriodStart.getTime() +
                subscription.paymentTerms * 24 * 60 * 60 * 1000
            );

            if (!dryRun) {
              try {
                await prisma.$transaction(async (tx) => {
                  const invoiceNumber = await getNextSequenceNumber(tx, "INV");

                  const createdInvoice = await tx.invoice.create({
                    data: {
                      number: invoiceNumber,
                      subscriptionId: subscription.id,
                      customerId: subscription.customerId,
                      billingPeriodStart: currentPeriodStart,
                      billingPeriodEnd: currentPeriodEnd,
                      issueDate: asOfDate,
                      dueDate,
                      status: InvoiceStatus.CONFIRMED,
                      subtotal: new Prisma.Decimal(subtotal),
                      discountTotal: new Prisma.Decimal(discountTotal),
                      taxTotal: new Prisma.Decimal(taxTotal),
                      total: new Prisma.Decimal(total),
                      amountPaid: new Prisma.Decimal(0),
                      lines: {
                        create: invoiceLinesData
                      }
                    }
                  });

                  // Record discount usages and increment usedCount
                  for (const ad of appliedDiscountsForInvoice) {
                    await tx.discountUsage.create({
                      data: {
                        discountId: ad.discountId,
                        invoiceId: createdInvoice.id,
                        subscriptionId: subscription.id,
                        customerId: subscription.customerId,
                        amount: new Prisma.Decimal(ad.amount)
                      }
                    });

                    await tx.discount.update({
                      where: { id: ad.discountId },
                      data: { usedCount: { increment: 1 } }
                    });
                  }

                  // Advance subscription nextBillingDate
                  await tx.subscription.update({
                    where: { id: subscription.id },
                    data: {
                      nextBillingDate: currentPeriodEnd
                    }
                  });

                  invoicesSummary.push({
                    subscriptionId: subscription.id,
                    subscriptionNumber: subscription.number,
                    invoiceNumber,
                    customerName: subscription.customer.name,
                    billingPeriodStart: currentPeriodStart,
                    billingPeriodEnd: currentPeriodEnd,
                    subtotal,
                    discountTotal,
                    taxTotal,
                    total,
                    appliedDiscounts: appliedDiscountsForInvoice
                  });
                });
              } catch (txErr: any) {
                // If unique constraint violated on (subscriptionId, billingPeriodStart), invoice already billed
                if (
                  txErr instanceof Prisma.PrismaClientKnownRequestError &&
                  txErr.code === "P2002"
                ) {
                  // Idempotency: advance nextBillingDate if needed and proceed
                  await prisma.subscription.update({
                    where: { id: subscription.id },
                    data: { nextBillingDate: currentPeriodEnd }
                  });
                } else {
                  throw txErr;
                }
              }
            } else {
              invoicesSummary.push({
                subscriptionId: subscription.id,
                subscriptionNumber: subscription.number,
                customerName: subscription.customer.name,
                billingPeriodStart: currentPeriodStart,
                billingPeriodEnd: currentPeriodEnd,
                subtotal,
                discountTotal,
                taxTotal,
                total,
                appliedDiscounts: appliedDiscountsForInvoice
              });
            }

            currentPeriodStart = currentPeriodEnd;
            latestPeriodEnd = currentPeriodEnd;
          }
        } catch (err: any) {
          errors.push({
            subscriptionId: subscription.id,
            subscriptionNumber: subscription.number,
            error: err.message || "Unknown error during billing"
          });
        }
      }
    }

    return {
      asOfDate: asOfDate.toISOString(),
      dryRun,
      processedSubscriptionsCount: activeSubscriptions.length,
      generatedInvoicesCount: invoicesSummary.length,
      totalBilledAmount: Math.round(totalBilledAmount * 100) / 100,
      autoClosedCount,
      invoices: invoicesSummary,
      errors
    };
  }
}

export const billingService = new BillingService();
