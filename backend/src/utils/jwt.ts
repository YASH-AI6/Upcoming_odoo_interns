import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { Role } from "@prisma/client";

export interface AuthTokenPayload {
  userId: string;
  email: string;
  role: Role;
  customerId?: string | null;
}

export const signToken = (payload: AuthTokenPayload): string => {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as any
  });
};

export const verifyToken = (token: string): AuthTokenPayload => {
  return jwt.verify(token, env.JWT_SECRET) as AuthTokenPayload;
};
