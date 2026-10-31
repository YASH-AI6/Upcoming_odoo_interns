import { prisma } from "../../config/prisma";
import { BadRequestError, NotFoundError } from "../../utils/errors";
import {
  CreateTemplateInput,
  UpdateTemplateInput,
  ListTemplatesQuery
} from "./templates.schema";
import { buildPagination } from "../../utils/pagination";
import { Prisma } from "@prisma/client";
import { logAudit } from "../../utils/audit";

export class TemplatesService {
  async create(input: CreateTemplateInput, userId?: string) {
    const plan = await prisma.plan.findUnique({ where: { id: input.planId } });
    if (!plan) {
      throw new NotFoundError("Plan not found");
    }

    // Verify all products and variants
    for (const line of input.lines) {
      const product = await prisma.product.findUnique({ where: { id: line.productId } });
      if (!product) {
        throw new NotFoundError(`Product with id ${line.productId} not found`);
      }
      if (line.variantId) {
        const variant = await prisma.productVariant.findFirst({
          where: { id: line.variantId, productId: line.productId }
        });
        if (!variant) {
          throw new BadRequestError(`Variant ${line.variantId} does not belong to product ${line.productId}`);
        }
      }
    }

    const template = await prisma.$transaction(async (tx) => {
      return tx.quotationTemplate.create({
        data: {
          name: input.name,
          validityDays: input.validityDays,
          planId: input.planId,
          lines: {
            create: input.lines.map((l) => ({
              productId: l.productId,
              variantId: l.variantId,
              quantity: l.quantity
            }))
          }
        },
        include: {
          plan: true,
          lines: {
            include: {
              product: true,
              variant: true
            }
          }
        }
      });
    });

    await logAudit({
      userId,
      action: "CREATE_QUOTATION_TEMPLATE",
      entity: "QuotationTemplate",
      entityId: template.id,
      after: template
    });

    return template;
  }

  async list(query: ListTemplatesQuery) {
    const { page, limit, search, planId } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.QuotationTemplateWhereInput = {
      ...(planId ? { planId } : {}),
      ...(search ? { name: { contains: search, mode: "insensitive" } } : {})
    };

    const [total, items] = await Promise.all([
      prisma.quotationTemplate.count({ where }),
      prisma.quotationTemplate.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          plan: true,
          lines: {
            include: {
              product: true,
              variant: true
            }
          }
        }
      })
    ]);

    return {
      items,
      pagination: buildPagination(total, page, limit)
    };
  }

  async getById(id: string) {
    const template = await prisma.quotationTemplate.findUnique({
      where: { id },
      include: {
        plan: true,
        lines: {
          include: {
            product: true,
            variant: true
          }
        }
      }
    });

    if (!template) {
      throw new NotFoundError("Quotation template not found");
    }

    return template;
  }

  async update(id: string, input: UpdateTemplateInput, userId?: string) {
    const existing = await prisma.quotationTemplate.findUnique({
      where: { id },
      include: { lines: true }
    });
    if (!existing) {
      throw new NotFoundError("Quotation template not found");
    }

    if (input.planId) {
      const plan = await prisma.plan.findUnique({ where: { id: input.planId } });
      if (!plan) throw new NotFoundError("Plan not found");
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (input.lines) {
        await tx.quotationTemplateLine.deleteMany({ where: { quotationTemplateId: id } });
        for (const line of input.lines) {
          const product = await tx.product.findUnique({ where: { id: line.productId } });
          if (!product) throw new NotFoundError(`Product ${line.productId} not found`);
          if (line.variantId) {
            const variant = await tx.productVariant.findFirst({
              where: { id: line.variantId, productId: line.productId }
            });
            if (!variant) throw new BadRequestError(`Invalid variant ${line.variantId}`);
          }
        }
      }

      return tx.quotationTemplate.update({
        where: { id },
        data: {
          name: input.name,
          validityDays: input.validityDays,
          planId: input.planId,
          lines: input.lines
            ? {
                create: input.lines.map((l) => ({
                  productId: l.productId,
                  variantId: l.variantId,
                  quantity: l.quantity
                }))
              }
            : undefined
        },
        include: {
          plan: true,
          lines: {
            include: {
              product: true,
              variant: true
            }
          }
        }
      });
    });

    await logAudit({
      userId,
      action: "UPDATE_QUOTATION_TEMPLATE",
      entity: "QuotationTemplate",
      entityId: id,
      before: existing,
      after: updated
    });

    return updated;
  }

  async delete(id: string, userId?: string) {
    const existing = await prisma.quotationTemplate.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError("Quotation template not found");
    }

    await prisma.quotationTemplate.delete({ where: { id } });

    await logAudit({
      userId,
      action: "DELETE_QUOTATION_TEMPLATE",
      entity: "QuotationTemplate",
      entityId: id,
      before: existing
    });

    return { success: true, message: "Template deleted successfully" };
  }
}

export const templatesService = new TemplatesService();
