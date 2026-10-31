import { prisma } from "../../config/prisma";
import { BadRequestError, NotFoundError } from "../../utils/errors";
import {
  CreateDiscountInput,
  UpdateDiscountInput,
  ListDiscountsQuery
} from "./discounts.schema";
import { buildPagination } from "../../utils/pagination";
import { Discount, DiscountScope, DiscountType, Prisma } from "@prisma/client";
import { logAudit } from "../../utils/audit";

export class DiscountsService {
  isDiscountEligible(
    discount: Discount,
    params: {
      date?: Date;
      purchaseAmount: number;
      quantity: number;
      scope: DiscountScope;
      targetId: string;
    }
  ): boolean {
    const checkDate = params.date || new Date();

    if (discount.startDate && checkDate < discount.startDate) {
      return false;
    }

    if (discount.endDate && checkDate > discount.endDate) {
      return false;
    }

    if (discount.usageLimit !== null && discount.usedCount >= discount.usageLimit) {
      return false;
    }

    if (params.purchaseAmount < Number(discount.minPurchase)) {
      return false;
    }

    if (params.quantity < discount.minQuantity) {
      return false;
    }

    if (discount.scope !== params.scope) {
      return false;
    }

    if (discount.scope === DiscountScope.PRODUCT) {
      if (
        discount.targetProductIds.length > 0 &&
        !discount.targetProductIds.includes(params.targetId)
      ) {
        return false;
      }
    } else if (discount.scope === DiscountScope.SUBSCRIPTION) {
      if (
        discount.targetSubscriptionIds.length > 0 &&
        !discount.targetSubscriptionIds.includes(params.targetId)
      ) {
        return false;
      }
    }

    return true;
  }

  calculateDiscountAmount(discount: Discount, baseAmount: number): number {
    if (discount.type === DiscountType.PERCENTAGE) {
      const discountVal = (baseAmount * Number(discount.value)) / 100;
      return Math.min(baseAmount, Math.max(0, discountVal));
    } else {
      return Math.min(baseAmount, Math.max(0, Number(discount.value)));
    }
  }

  async create(input: CreateDiscountInput, userId?: string) {
    if (input.startDate && input.endDate && input.startDate > input.endDate) {
      throw new BadRequestError("startDate cannot be after endDate");
    }

    const discount = await prisma.discount.create({
      data: {
        ...input,
        value: new Prisma.Decimal(input.value),
        minPurchase: new Prisma.Decimal(input.minPurchase)
      }
    });

    await logAudit({
      userId,
      action: "CREATE_DISCOUNT",
      entity: "Discount",
      entityId: discount.id,
      after: discount
    });

    return discount;
  }

  async list(query: ListDiscountsQuery) {
    const { page, limit, search, scope, type, activeOnly } = query;
    const skip = (page - 1) * limit;
    const now = new Date();

    const where: Prisma.DiscountWhereInput = {
      ...(scope ? { scope } : {}),
      ...(type ? { type } : {}),
      ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
      ...(activeOnly
        ? {
            AND: [
              { OR: [{ startDate: null }, { startDate: { lte: now } }] },
              { OR: [{ endDate: null }, { endDate: { gte: now } }] }
            ]
          }
        : {})
    };

    const [total, items] = await Promise.all([
      prisma.discount.count({ where }),
      prisma.discount.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          _count: { select: { usages: true } }
        }
      })
    ]);

    return {
      items,
      pagination: buildPagination(total, page, limit)
    };
  }

  async getById(id: string) {
    const discount = await prisma.discount.findUnique({
      where: { id },
      include: {
        usages: {
          take: 10,
          orderBy: { usedAt: "desc" }
        }
      }
    });

    if (!discount) {
      throw new NotFoundError("Discount rule not found");
    }

    return discount;
  }

  async update(id: string, input: UpdateDiscountInput, userId?: string) {
    const existing = await prisma.discount.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError("Discount rule not found");
    }

    const startDate = input.startDate ?? existing.startDate;
    const endDate = input.endDate ?? existing.endDate;
    if (startDate && endDate && startDate > endDate) {
      throw new BadRequestError("startDate cannot be after endDate");
    }

    const updated = await prisma.discount.update({
      where: { id },
      data: {
        ...input,
        value: input.value !== undefined ? new Prisma.Decimal(input.value) : undefined,
        minPurchase:
          input.minPurchase !== undefined ? new Prisma.Decimal(input.minPurchase) : undefined
      }
    });

    await logAudit({
      userId,
      action: "UPDATE_DISCOUNT",
      entity: "Discount",
      entityId: id,
      before: existing,
      after: updated
    });

    return updated;
  }

  async delete(id: string, userId?: string) {
    const existing = await prisma.discount.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError("Discount rule not found");
    }

    await prisma.discount.delete({ where: { id } });

    await logAudit({
      userId,
      action: "DELETE_DISCOUNT",
      entity: "Discount",
      entityId: id,
      before: existing
    });

    return { success: true, message: "Discount rule deleted successfully" };
  }
}

export const discountsService = new DiscountsService();
