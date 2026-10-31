import { prisma } from "../config/prisma";
import { Prisma } from "@prisma/client";

export interface CreateAuditLogParams {
  userId?: string | null;
  action: string;
  entity: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const logAudit = async (params: CreateAuditLogParams): Promise<void> => {
  try {
    const validUserId =
      params.userId && UUID_REGEX.test(params.userId) ? params.userId : null;

    await prisma.auditLog.create({
      data: {
        userId: validUserId,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        before: params.before ? (params.before as Prisma.InputJsonValue) : Prisma.JsonNull,
        after: params.after ? (params.after as Prisma.InputJsonValue) : Prisma.JsonNull
      }
    });
  } catch (error) {
    // Audit logging should not crash the primary transaction, but log errors
    console.error("Audit log error:", error);
  }
};
