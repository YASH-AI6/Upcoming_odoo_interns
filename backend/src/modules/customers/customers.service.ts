import { prisma } from "../../config/prisma";
import { ConflictError, NotFoundError } from "../../utils/errors";
import {
  CreateCustomerInput,
  UpdateCustomerInput,
  ListCustomersQuery
} from "./customers.schema";
import { buildPagination } from "../../utils/pagination";
import { Prisma } from "@prisma/client";
import { logAudit } from "../../utils/audit";

export class CustomersService {
  async create(input: CreateCustomerInput, userId?: string) {
    const existing = await prisma.customer.findUnique({
      where: { email: input.email }
    });
    if (existing) {
      throw new ConflictError("Customer with this email already exists");
    }

    const customer = await prisma.customer.create({
      data: input
    });

    await logAudit({
      userId,
      action: "CREATE_CUSTOMER",
      entity: "Customer",
      entityId: customer.id,
      after: customer
    });

    return customer;
  }

  async list(query: ListCustomersQuery) {
    const { page, limit, search, city, country } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.CustomerWhereInput = {
      ...(city ? { city: { contains: city, mode: "insensitive" } } : {}),
      ...(country ? { country: { contains: country, mode: "insensitive" } } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
              { phone: { contains: search, mode: "insensitive" } }
            ]
          }
        : {})
    };

    const [total, items] = await Promise.all([
      prisma.customer.count({ where }),
      prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: { subscriptions: true, invoices: true }
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
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        subscriptions: {
          take: 5,
          orderBy: { createdAt: "desc" },
          select: { id: true, number: true, status: true, nextBillingDate: true }
        },
        invoices: {
          take: 5,
          orderBy: { createdAt: "desc" },
          select: { id: true, number: true, status: true, total: true, dueDate: true }
        }
      }
    });

    if (!customer) {
      throw new NotFoundError("Customer not found");
    }

    return customer;
  }

  async update(id: string, input: UpdateCustomerInput, userId?: string) {
    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError("Customer not found");
    }

    if (input.email && input.email !== existing.email) {
      const emailTaken = await prisma.customer.findUnique({
        where: { email: input.email }
      });
      if (emailTaken) {
        throw new ConflictError("Email already in use by another customer");
      }
    }

    const updated = await prisma.customer.update({
      where: { id },
      data: input
    });

    await logAudit({
      userId,
      action: "UPDATE_CUSTOMER",
      entity: "Customer",
      entityId: id,
      before: existing,
      after: updated
    });

    return updated;
  }

  async delete(id: string, userId?: string) {
    const existing = await prisma.customer.findUnique({
      where: { id },
      include: {
        _count: { select: { subscriptions: true, invoices: true } }
      }
    });

    if (!existing) {
      throw new NotFoundError("Customer not found");
    }

    if (existing._count.subscriptions > 0 || existing._count.invoices > 0) {
      throw new ConflictError("Cannot delete customer with existing subscriptions or invoices");
    }

    await prisma.customer.delete({ where: { id } });

    await logAudit({
      userId,
      action: "DELETE_CUSTOMER",
      entity: "Customer",
      entityId: id,
      before: existing
    });

    return { success: true, message: "Customer deleted successfully" };
  }
}

export const customersService = new CustomersService();
