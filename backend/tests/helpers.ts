import { prisma } from "../src/config/prisma";
import { signToken } from "../src/utils/jwt";
import { Role } from "@prisma/client";

export const getAuthToken = (role: Role, customerId?: string | null): string => {
  return signToken({
    userId: `test-user-${role.toLowerCase()}`,
    email: `test-${role.toLowerCase()}@example.com`,
    role,
    customerId
  });
};

export const clearTestData = async () => {
  // Can be called to reset or setup specific entities
};
