import { z } from "zod";
import { PASSWORD_REGEX } from "../../utils/password";
import { paginationQuerySchema } from "../../utils/pagination";
import { Role } from "@prisma/client";

export const createStaffSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z
    .string()
    .min(9, "Password must be more than 8 characters")
    .regex(
      PASSWORD_REGEX,
      "Password must contain at least one uppercase letter, one lowercase letter, and one special character"
    )
});

export const listUsersQuerySchema = paginationQuerySchema.extend({
  role: z.nativeEnum(Role).optional()
});

export const userIdParamSchema = z.object({
  id: z.string().uuid()
});

export type CreateStaffInput = z.infer<typeof createStaffSchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
