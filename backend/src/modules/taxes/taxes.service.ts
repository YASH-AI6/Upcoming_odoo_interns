import { prisma } from "../../config/prisma";
import { NotFoundError } from "../../utils/errors";
import { CreateTaxInput, UpdateTaxInput, ListTaxesQuery } from "./taxes.schema";
import { buildPagination } from "../../utils/pagination";
import { Prisma } from "@prisma/client";
import { logAudit } from "../../utils/audit";

export class TaxesService {
  async create(input: CreateTaxInput, userId?: string) {
    const { productIds, ...taxData } = input;

    const tax = await prisma.tax.create({
      data: {
        name: taxData.name,
        rate: new Prisma.Decimal(taxData.rate),
        products: productIds?.length
          ? {
              create: productIds.map((pId) => ({
                product: { connect: { id: pId } }
              }))
            }
          : undefined
      },
      include: {
        products: { include: { product: true } }
      }
    });

    await logAudit({
      userId,
      action: "CREATE_TAX",
      entity: "Tax",
      entityId: tax.id,
      after: tax
    });

    return tax;
  }

  async list(query: ListTaxesQuery) {
    const { page, limit, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.TaxWhereInput = search
      ? { name: { contains: search, mode: "insensitive" } }
      : {};

    const [total, items] = await Promise.all([
      prisma.tax.count({ where }),
      prisma.tax.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          products: { include: { product: true } }
        }
      })
    ]);

    return {
      items,
      pagination: buildPagination(total, page, limit)
    };
  }

  async getById(id: string) {
    const tax = await prisma.tax.findUnique({
      where: { id },
      include: {
        products: { include: { product: true } }
      }
    });

    if (!tax) {
      throw new NotFoundError("Tax rule not found");
    }

    return tax;
  }

  async update(id: string, input: UpdateTaxInput, userId?: string) {
    const existing = await prisma.tax.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError("Tax rule not found");
    }

    const { productIds, ...taxData } = input;

    const updated = await prisma.$transaction(async (tx) => {
      if (productIds !== undefined) {
        await tx.productTax.deleteMany({ where: { taxId: id } });
        if (productIds.length > 0) {
          await tx.productTax.createMany({
            data: productIds.map((pId) => ({ productId: pId, taxId: id }))
          });
        }
      }

      return tx.tax.update({
        where: { id },
        data: {
          name: taxData.name,
          rate: taxData.rate !== undefined ? new Prisma.Decimal(taxData.rate) : undefined
        },
        include: {
          products: { include: { product: true } }
        }
      });
    });

    await logAudit({
      userId,
      action: "UPDATE_TAX",
      entity: "Tax",
      entityId: id,
      before: existing,
      after: updated
    });

    return updated;
  }

  async delete(id: string, userId?: string) {
    const existing = await prisma.tax.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError("Tax rule not found");
    }

    await prisma.tax.delete({ where: { id } });

    await logAudit({
      userId,
      action: "DELETE_TAX",
      entity: "Tax",
      entityId: id,
      before: existing
    });

    return { success: true, message: "Tax rule deleted successfully" };
  }
}

export const taxesService = new TaxesService();
