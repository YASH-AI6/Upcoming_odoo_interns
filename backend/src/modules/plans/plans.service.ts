import { prisma } from "../../config/prisma";
import { BadRequestError, NotFoundError } from "../../utils/errors";
import {
  CreatePlanInput,
  UpdatePlanInput,
  ListPlansQuery
} from "./plans.schema";
import { buildPagination } from "../../utils/pagination";
import { Plan, Prisma } from "@prisma/client";
import { logAudit } from "../../utils/audit";

export class PlansService {
  validatePlanAvailability(plan: Plan, asOfDate: Date = new Date(), quantity?: number): void {
    if (plan.availableFrom && asOfDate < plan.availableFrom) {
      throw new BadRequestError(
        `Plan '${plan.name}' is not yet available (available from ${plan.availableFrom.toISOString()})`
      );
    }

    if (plan.availableTo && asOfDate > plan.availableTo) {
      throw new BadRequestError(
        `Plan '${plan.name}' has expired (available until ${plan.availableTo.toISOString()})`
      );
    }

    if (quantity !== undefined && quantity < plan.minQuantity) {
      throw new BadRequestError(
        `Quantity (${quantity}) is below the plan minimum required quantity (${plan.minQuantity})`
      );
    }
  }

  async create(input: CreatePlanInput, userId?: string) {
    if (input.availableFrom && input.availableTo && input.availableFrom > input.availableTo) {
      throw new BadRequestError("availableFrom cannot be later than availableTo");
    }

    const plan = await prisma.plan.create({
      data: {
        ...input,
        price: new Prisma.Decimal(input.price)
      }
    });

    await logAudit({
      userId,
      action: "CREATE_PLAN",
      entity: "Plan",
      entityId: plan.id,
      after: plan
    });

    return plan;
  }

  async list(query: ListPlansQuery) {
    const { page, limit, search, billingPeriod, activeOnly } = query;
    const skip = (page - 1) * limit;
    const now = new Date();

    const where: Prisma.PlanWhereInput = {
      ...(billingPeriod ? { billingPeriod } : {}),
      ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
      ...(activeOnly
        ? {
            AND: [
              { OR: [{ availableFrom: null }, { availableFrom: { lte: now } }] },
              { OR: [{ availableTo: null }, { availableTo: { gte: now } }] }
            ]
          }
        : {})
    };

    const [total, items] = await Promise.all([
      prisma.plan.count({ where }),
      prisma.plan.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          _count: { select: { subscriptions: true } }
        }
      })
    ]);

    return {
      items,
      pagination: buildPagination(total, page, limit)
    };
  }

  async getById(id: string) {
    const plan = await prisma.plan.findUnique({
      where: { id },
      include: {
        _count: { select: { subscriptions: true } }
      }
    });

    if (!plan) {
      throw new NotFoundError("Plan not found");
    }

    return plan;
  }

  async update(id: string, input: UpdatePlanInput, userId?: string) {
    const existing = await prisma.plan.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError("Plan not found");
    }

    const availableFrom = input.availableFrom ?? existing.availableFrom;
    const availableTo = input.availableTo ?? existing.availableTo;
    if (availableFrom && availableTo && availableFrom > availableTo) {
      throw new BadRequestError("availableFrom cannot be later than availableTo");
    }

    const updated = await prisma.plan.update({
      where: { id },
      data: {
        ...input,
        price: input.price !== undefined ? new Prisma.Decimal(input.price) : undefined
      }
    });

    await logAudit({
      userId,
      action: "UPDATE_PLAN",
      entity: "Plan",
      entityId: id,
      before: existing,
      after: updated
    });

    return updated;
  }

  async delete(id: string, userId?: string) {
    const existing = await prisma.plan.findUnique({
      where: { id },
      include: { _count: { select: { subscriptions: true } } }
    });

    if (!existing) {
      throw new NotFoundError("Plan not found");
    }

    if (existing._count.subscriptions > 0) {
      throw new BadRequestError("Cannot delete plan associated with active or past subscriptions");
    }

    await prisma.plan.delete({ where: { id } });

    await logAudit({
      userId,
      action: "DELETE_PLAN",
      entity: "Plan",
      entityId: id,
      before: existing
    });

    return { success: true, message: "Plan deleted successfully" };
  }
}

export const plansService = new PlansService();
