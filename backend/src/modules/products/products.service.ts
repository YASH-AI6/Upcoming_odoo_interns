import { prisma } from "../../config/prisma";
import { NotFoundError } from "../../utils/errors";
import {
  CreateProductInput,
  UpdateProductInput,
  CreateVariantInput,
  ListProductsQuery
} from "./products.schema";
import { buildPagination } from "../../utils/pagination";
import { Prisma } from "@prisma/client";
import { logAudit } from "../../utils/audit";

export class ProductsService {
  async create(input: CreateProductInput, userId?: string) {
    const { variants, taxIds, ...productData } = input;

    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          ...productData,
          salesPrice: new Prisma.Decimal(productData.salesPrice),
          costPrice: new Prisma.Decimal(productData.costPrice),
          variants: variants?.length
            ? {
                create: variants.map((v) => ({
                  attribute: v.attribute,
                  value: v.value,
                  extraPrice: new Prisma.Decimal(v.extraPrice)
                }))
              }
            : undefined,
          taxes: taxIds?.length
            ? {
                create: taxIds.map((tId) => ({
                  tax: { connect: { id: tId } }
                }))
              }
            : undefined
        },
        include: {
          variants: true,
          taxes: { include: { tax: true } }
        }
      });

      return created;
    });

    await logAudit({
      userId,
      action: "CREATE_PRODUCT",
      entity: "Product",
      entityId: product.id,
      after: product
    });

    return product;
  }

  async list(query: ListProductsQuery) {
    const { page, limit, search, type } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      ...(type ? { type } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { notes: { contains: search, mode: "insensitive" } }
            ]
          }
        : {})
    };

    const [total, items] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          variants: true,
          taxes: { include: { tax: true } }
        }
      })
    ]);

    return {
      items,
      pagination: buildPagination(total, page, limit)
    };
  }

  async getById(id: string) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        variants: true,
        taxes: { include: { tax: true } }
      }
    });

    if (!product) {
      throw new NotFoundError("Product not found");
    }

    return product;
  }

  async update(id: string, input: UpdateProductInput, userId?: string) {
    const existing = await prisma.product.findUnique({
      where: { id },
      include: { variants: true, taxes: true }
    });
    if (!existing) {
      throw new NotFoundError("Product not found");
    }

    const { variants, taxIds, ...productData } = input;

    const updated = await prisma.$transaction(async (tx) => {
      if (taxIds) {
        await tx.productTax.deleteMany({ where: { productId: id } });
        if (taxIds.length > 0) {
          await tx.productTax.createMany({
            data: taxIds.map((taxId) => ({ productId: id, taxId }))
          });
        }
      }

      const res = await tx.product.update({
        where: { id },
        data: {
          ...productData,
          salesPrice:
            productData.salesPrice !== undefined
              ? new Prisma.Decimal(productData.salesPrice)
              : undefined,
          costPrice:
            productData.costPrice !== undefined
              ? new Prisma.Decimal(productData.costPrice)
              : undefined
        },
        include: {
          variants: true,
          taxes: { include: { tax: true } }
        }
      });

      return res;
    });

    await logAudit({
      userId,
      action: "UPDATE_PRODUCT",
      entity: "Product",
      entityId: id,
      before: existing,
      after: updated
    });

    return updated;
  }

  async delete(id: string, userId?: string) {
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError("Product not found");
    }

    await prisma.product.delete({ where: { id } });

    await logAudit({
      userId,
      action: "DELETE_PRODUCT",
      entity: "Product",
      entityId: id,
      before: existing
    });

    return { success: true, message: "Product deleted successfully" };
  }

  async addVariant(productId: string, input: CreateVariantInput) {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      throw new NotFoundError("Product not found");
    }

    return prisma.productVariant.create({
      data: {
        productId,
        attribute: input.attribute,
        value: input.value,
        extraPrice: new Prisma.Decimal(input.extraPrice)
      }
    });
  }

  async deleteVariant(productId: string, variantId: string) {
    const variant = await prisma.productVariant.findFirst({
      where: { id: variantId, productId }
    });
    if (!variant) {
      throw new NotFoundError("Variant not found for this product");
    }

    await prisma.productVariant.delete({ where: { id: variantId } });
    return { success: true, message: "Variant removed" };
  }
}

export const productsService = new ProductsService();
