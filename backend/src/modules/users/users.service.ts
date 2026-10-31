import { prisma } from "../../config/prisma";
import { hashPassword } from "../../utils/password";
import { ConflictError, NotFoundError } from "../../utils/errors";
import { CreateStaffInput, ListUsersQuery } from "./users.schema";
import { buildPagination } from "../../utils/pagination";
import { Prisma, Role } from "@prisma/client";
import { logAudit } from "../../utils/audit";

export class UsersService {
  async createStaff(input: CreateStaffInput, adminUserId: string) {
    const existing = await prisma.user.findUnique({
      where: { email: input.email }
    });
    if (existing) {
      throw new ConflictError("Email already in use");
    }

    const hashedPassword = await hashPassword(input.password);
    const user = await prisma.user.create({
      data: {
        email: input.email,
        password: hashedPassword,
        role: Role.STAFF
      },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true
      }
    });

    await logAudit({
      userId: adminUserId,
      action: "CREATE_STAFF",
      entity: "User",
      entityId: user.id,
      after: user
    });

    return user;
  }

  async listUsers(query: ListUsersQuery) {
    const { page, limit, search, role } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {
      ...(role ? { role } : {}),
      ...(search
        ? {
            email: {
              contains: search,
              mode: "insensitive"
            }
          }
        : {})
    };

    const [total, items] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          role: true,
          customerId: true,
          createdAt: true,
          customer: {
            select: { id: true, name: true }
          }
        }
      })
    ]);

    return {
      items,
      pagination: buildPagination(total, page, limit)
    };
  }

  async getUserById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        role: true,
        customerId: true,
        createdAt: true,
        customer: true
      }
    });

    if (!user) {
      throw new NotFoundError("User not found");
    }

    return user;
  }
}

export const usersService = new UsersService();
