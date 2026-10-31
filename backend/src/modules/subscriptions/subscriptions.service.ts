import { prisma } from "../../config/prisma";
import { BadRequestError, ForbiddenError, NotFoundError } from "../../utils/errors";
import {
  CreateSubscriptionInput,
  UpdateSubscriptionInput,
  ListSubscriptionsQuery
} from "./subscriptions.schema";
import { buildPagination } from "../../utils/pagination";
import { getNextSequenceNumber } from "../../utils/sequence";
import { addBillingPeriod } from "../../utils/dateUtils";
import { plansService } from "../plans/plans.service";
import { Prisma, Role, SubscriptionStatus } from "@prisma/client";
import { logAudit } from "../../utils/audit";

const VALID_TRANSITIONS: Record<SubscriptionStatus, SubscriptionStatus[]> = {
  [SubscriptionStatus.DRAFT]: [SubscriptionStatus.QUOTATION, SubscriptionStatus.CONFIRMED],
  [SubscriptionStatus.QUOTATION]: [SubscriptionStatus.CONFIRMED, SubscriptionStatus.CLOSED],
  [SubscriptionStatus.CONFIRMED]: [SubscriptionStatus.ACTIVE, SubscriptionStatus.CLOSED],
  [SubscriptionStatus.ACTIVE]: [SubscriptionStatus.PAUSED, SubscriptionStatus.CLOSED],
  [SubscriptionStatus.PAUSED]: [SubscriptionStatus.ACTIVE, SubscriptionStatus.CLOSED],
  [SubscriptionStatus.CLOSED]: [SubscriptionStatus.ACTIVE]
};

export class SubscriptionsService {
  validateTransition(
    currentStatus: SubscriptionStatus,
    targetStatus: SubscriptionStatus,
    plan: { pausable: boolean; closable: boolean; renewable: boolean }
  ): void {
    const allowed = VALID_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(targetStatus)) {
      throw new BadRequestError(
        `Illegal subscription status transition from '${currentStatus}' to '${targetStatus}'. Allowed: ${allowed.join(", ") || "none"}`
      );
    }

    if (targetStatus === SubscriptionStatus.PAUSED && !plan.pausable) {
      throw new BadRequestError("Plan configuration does not allow pausing subscriptions");
    }

    if (targetStatus === SubscriptionStatus.CLOSED && !plan.closable) {
      throw new BadRequestError("Plan configuration does not allow early subscription closure");
    }

    if (currentStatus === SubscriptionStatus.CLOSED && targetStatus === SubscriptionStatus.ACTIVE && !plan.renewable) {
      throw new BadRequestError("Plan configuration does not allow renewing closed subscriptions");
    }
  }

  async create(input: CreateSubscriptionInput, user: { userId?: string; role?: Role; customerId?: string | null }) {
    let customerId = input.customerId;
    if (user.role === Role.CUSTOMER) {
      if (!user.customerId) {
        throw new ForbiddenError("No customer record associated with this account");
      }
      customerId = user.customerId;
    }

    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      throw new NotFoundError("Customer not found");
    }

    let planId = input.planId;
    let initialStatus = input.status;
    let expiryDate = input.expiryDate;
    let preparedLines: Array<{
      productId: string;
      variantId?: string | null;
      quantity: number;
      unitPrice: number;
      taxRate: number;
      amount: number;
    }> = [];

    const startDate = input.startDate || new Date();

    if (input.templateId) {
      const template = await prisma.quotationTemplate.findUnique({
        where: { id: input.templateId },
        include: {
          plan: true,
          lines: {
            include: {
              product: { include: { taxes: { include: { tax: true } } } },
              variant: true
            }
          }
        }
      });

      if (!template) {
        throw new NotFoundError("Quotation template not found");
      }

      planId = template.planId;
      initialStatus = SubscriptionStatus.QUOTATION;
      const validityMs = template.validityDays * 24 * 60 * 60 * 1000;
      expiryDate = new Date(startDate.getTime() + validityMs);

      preparedLines = template.lines.map((tl) => {
        const basePrice = Number(tl.product.salesPrice);
        const extraPrice = tl.variant ? Number(tl.variant.extraPrice) : 0;
        const unitPrice = basePrice + extraPrice;
        const taxRate = tl.product.taxes.length > 0 ? Number(tl.product.taxes[0].tax.rate) : 0;
        const amount = unitPrice * tl.quantity;

        return {
          productId: tl.productId,
          variantId: tl.variantId,
          quantity: tl.quantity,
          unitPrice,
          taxRate,
          amount
        };
      });
    }

    if (!planId) {
      throw new BadRequestError("Plan ID is required when no quotation template is provided");
    }

    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) {
      throw new NotFoundError("Plan not found");
    }

    // If manual lines provided, process them
    if (input.lines && input.lines.length > 0) {
      preparedLines = [];
      for (const line of input.lines) {
        const product = await prisma.product.findUnique({
          where: { id: line.productId },
          include: { taxes: { include: { tax: true } } }
        });
        if (!product) {
          throw new NotFoundError(`Product ${line.productId} not found`);
        }

        let extraPrice = 0;
        if (line.variantId) {
          const variant = await prisma.productVariant.findFirst({
            where: { id: line.variantId, productId: line.productId }
          });
          if (!variant) {
            throw new BadRequestError(`Variant ${line.variantId} does not belong to product ${line.productId}`);
          }
          extraPrice = Number(variant.extraPrice);
        }

        const unitPrice =
          line.unitPrice !== undefined ? line.unitPrice : Number(product.salesPrice) + extraPrice;
        const taxRate =
          line.taxRate !== undefined
            ? line.taxRate
            : product.taxes.length > 0
            ? Number(product.taxes[0].tax.rate)
            : 0;
        const amount = unitPrice * line.quantity;

        preparedLines.push({
          productId: line.productId,
          variantId: line.variantId,
          quantity: line.quantity,
          unitPrice,
          taxRate,
          amount
        });
      }
    }

    if (preparedLines.length === 0) {
      throw new BadRequestError("Subscription must have at least one product line");
    }

    // Validate plan availability and minQuantity
    const totalQty = preparedLines.reduce((acc, l) => acc + l.quantity, 0);
    plansService.validatePlanAvailability(plan, startDate, totalQty);

    const nextBillingDate =
      initialStatus === SubscriptionStatus.ACTIVE
        ? addBillingPeriod(startDate, plan.billingPeriod)
        : startDate;

    const subscription = await prisma.$transaction(async (tx) => {
      const number = await getNextSequenceNumber(tx, "SUB");

      return tx.subscription.create({
        data: {
          number,
          customerId,
          planId: plan.id,
          startDate,
          expiryDate,
          paymentTerms: input.paymentTerms,
          nextBillingDate,
          status: initialStatus,
          lines: {
            create: preparedLines.map((l) => ({
              productId: l.productId,
              variantId: l.variantId,
              quantity: l.quantity,
              unitPrice: new Prisma.Decimal(l.unitPrice),
              taxRate: new Prisma.Decimal(l.taxRate),
              amount: new Prisma.Decimal(l.amount)
            }))
          }
        },
        include: {
          customer: true,
          plan: true,
          lines: {
            include: { product: true, variant: true }
          }
        }
      });
    });

    await logAudit({
      userId: user.userId,
      action: "CREATE_SUBSCRIPTION",
      entity: "Subscription",
      entityId: subscription.id,
      after: subscription
    });

    return subscription;
  }

  async list(
    query: ListSubscriptionsQuery,
    user: { userId?: string; role?: Role; customerId?: string | null }
  ) {
    const { page, limit, search, status, planId } = query;
    const skip = (page - 1) * limit;

    let customerIdFilter = query.customerId;
    if (user.role === Role.CUSTOMER) {
      if (!user.customerId) {
        return { items: [], pagination: buildPagination(0, page, limit) };
      }
      customerIdFilter = user.customerId;
    }

    const where: Prisma.SubscriptionWhereInput = {
      ...(status ? { status } : {}),
      ...(planId ? { planId } : {}),
      ...(customerIdFilter ? { customerId: customerIdFilter } : {}),
      ...(search
        ? {
            OR: [
              { number: { contains: search, mode: "insensitive" } },
              { customer: { name: { contains: search, mode: "insensitive" } } },
              { customer: { email: { contains: search, mode: "insensitive" } } }
            ]
          }
        : {})
    };

    const [total, items] = await Promise.all([
      prisma.subscription.count({ where }),
      prisma.subscription.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          customer: { select: { id: true, name: true, email: true } },
          plan: { select: { id: true, name: true, billingPeriod: true, price: true } },
          _count: { select: { invoices: true, lines: true } }
        }
      })
    ]);

    return {
      items,
      pagination: buildPagination(total, page, limit)
    };
  }

  async getById(
    id: string,
    user: { userId?: string; role?: Role; customerId?: string | null }
  ) {
    const subscription = await prisma.subscription.findUnique({
      where: { id },
      include: {
        customer: true,
        plan: true,
        lines: {
          include: {
            product: true,
            variant: true
          }
        },
        invoices: {
          take: 10,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            number: true,
            status: true,
            total: true,
            amountPaid: true,
            issueDate: true,
            dueDate: true
          }
        }
      }
    });

    if (!subscription) {
      throw new NotFoundError("Subscription not found");
    }

    if (user.role === Role.CUSTOMER && subscription.customerId !== user.customerId) {
      throw new ForbiddenError("Access denied to this subscription");
    }

    return subscription;
  }

  async update(
    id: string,
    input: UpdateSubscriptionInput,
    user: { userId?: string; role?: Role }
  ) {
    const existing = await prisma.subscription.findUnique({
      where: { id },
      include: { plan: true, lines: true }
    });

    if (!existing) {
      throw new NotFoundError("Subscription not found");
    }

    if (existing.status === SubscriptionStatus.CLOSED) {
      throw new BadRequestError("Cannot edit a closed subscription");
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (input.lines) {
        await tx.subscriptionLine.deleteMany({ where: { subscriptionId: id } });

        for (const line of input.lines) {
          const product = await tx.product.findUnique({
            where: { id: line.productId },
            include: { taxes: { include: { tax: true } } }
          });
          if (!product) throw new NotFoundError(`Product ${line.productId} not found`);

          let extraPrice = 0;
          if (line.variantId) {
            const variant = await tx.productVariant.findFirst({
              where: { id: line.variantId, productId: line.productId }
            });
            if (!variant) throw new BadRequestError(`Invalid variant ${line.variantId}`);
            extraPrice = Number(variant.extraPrice);
          }

          const unitPrice =
            line.unitPrice !== undefined ? line.unitPrice : Number(product.salesPrice) + extraPrice;
          const taxRate =
            line.taxRate !== undefined
              ? line.taxRate
              : product.taxes.length > 0
              ? Number(product.taxes[0].tax.rate)
              : 0;
          const amount = unitPrice * line.quantity;

          await tx.subscriptionLine.create({
            data: {
              subscriptionId: id,
              productId: line.productId,
              variantId: line.variantId,
              quantity: line.quantity,
              unitPrice: new Prisma.Decimal(unitPrice),
              taxRate: new Prisma.Decimal(taxRate),
              amount: new Prisma.Decimal(amount)
            }
          });
        }
      }

      return tx.subscription.update({
        where: { id },
        data: {
          paymentTerms: input.paymentTerms,
          expiryDate: input.expiryDate !== undefined ? input.expiryDate : undefined
        },
        include: {
          customer: true,
          plan: true,
          lines: { include: { product: true, variant: true } }
        }
      });
    });

    await logAudit({
      userId: user.userId,
      action: "UPDATE_SUBSCRIPTION",
      entity: "Subscription",
      entityId: id,
      before: existing,
      after: updated
    });

    return updated;
  }

  async transitionStatus(
    id: string,
    targetStatus: SubscriptionStatus,
    userId?: string
  ) {
    const subscription = await prisma.subscription.findUnique({
      where: { id },
      include: { plan: true }
    });

    if (!subscription) {
      throw new NotFoundError("Subscription not found");
    }

    this.validateTransition(subscription.status, targetStatus, subscription.plan);

    const updateData: Prisma.SubscriptionUpdateInput = {
      status: targetStatus
    };

    // If activating for the first time, ensure nextBillingDate is set
    if (targetStatus === SubscriptionStatus.ACTIVE && subscription.status !== SubscriptionStatus.PAUSED) {
      updateData.nextBillingDate = new Date();
    }

    const updated = await prisma.subscription.update({
      where: { id },
      data: updateData,
      include: { customer: true, plan: true, lines: true }
    });

    await logAudit({
      userId,
      action: `TRANSITION_${targetStatus}`,
      entity: "Subscription",
      entityId: id,
      before: { status: subscription.status },
      after: { status: targetStatus }
    });

    return updated;
  }

  async renew(id: string, userId?: string) {
    const subscription = await prisma.subscription.findUnique({
      where: { id },
      include: { plan: true }
    });

    if (!subscription) {
      throw new NotFoundError("Subscription not found");
    }

    if (!subscription.plan.renewable) {
      throw new BadRequestError("This plan is not renewable");
    }

    const now = new Date();
    const newStartDate = now;
    const newNextBilling = now;
    let newExpiryDate = subscription.expiryDate;

    if (subscription.expiryDate) {
      newExpiryDate = addBillingPeriod(now, subscription.plan.billingPeriod);
    }

    const updated = await prisma.subscription.update({
      where: { id },
      data: {
        status: SubscriptionStatus.ACTIVE,
        startDate: newStartDate,
        nextBillingDate: newNextBilling,
        expiryDate: newExpiryDate
      },
      include: { customer: true, plan: true, lines: true }
    });

    await logAudit({
      userId,
      action: "RENEW_SUBSCRIPTION",
      entity: "Subscription",
      entityId: id,
      after: updated
    });

    return updated;
  }
}

export const subscriptionsService = new SubscriptionsService();
