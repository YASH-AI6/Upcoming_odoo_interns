import crypto from "crypto";
import { prisma } from "../../config/prisma";
import { hashPassword, comparePassword } from "../../utils/password";
import { signToken } from "../../utils/jwt";
import { sendPasswordResetEmail } from "../../utils/email";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  UnauthorizedError
} from "../../utils/errors";
import {
  SignupInput,
  LoginInput,
  ForgotPasswordInput,
  ResetPasswordInput
} from "./auth.schema";
import { Role } from "@prisma/client";

export class AuthService {
  async signup(input: SignupInput) {
    const existing = await prisma.user.findUnique({
      where: { email: input.email }
    });
    if (existing) {
      throw new ConflictError("Email already in use");
    }

    const existingCustomer = await prisma.customer.findUnique({
      where: { email: input.email }
    });
    if (existingCustomer) {
      throw new ConflictError("Customer with this email already exists");
    }

    const hashedPassword = await hashPassword(input.password);

    const result = await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.create({
        data: {
          name: input.name,
          email: input.email,
          phone: input.phone,
          address: input.address,
          city: input.city,
          state: input.state,
          postalCode: input.postalCode,
          country: input.country
        }
      });

      const user = await tx.user.create({
        data: {
          email: input.email,
          password: hashedPassword,
          role: Role.CUSTOMER,
          customerId: customer.id
        },
        select: {
          id: true,
          email: true,
          role: true,
          customerId: true,
          createdAt: true
        }
      });

      return { user, customer };
    });

    const token = signToken({
      userId: result.user.id,
      email: result.user.email,
      role: result.user.role,
      customerId: result.user.customerId
    });

    return { token, user: result.user, customer: result.customer };
  }

  async login(input: LoginInput) {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
      include: {
        customer: true
      }
    });

    if (!user) {
      throw new UnauthorizedError("Invalid email or password");
    }

    const isValid = await comparePassword(input.password, user.password);
    if (!isValid) {
      throw new UnauthorizedError("Invalid email or password");
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      customerId: user.customerId
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        customerId: user.customerId,
        createdAt: user.createdAt
      },
      customer: user.customer
    };
  }

  async forgotPassword(input: ForgotPasswordInput) {
    const user = await prisma.user.findUnique({
      where: { email: input.email }
    });

    // Do not reveal whether an email exists
    if (!user) {
      return {
        message: "If your email is registered, you will receive a password reset link shortly."
      };
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    await prisma.passwordResetToken.create({
      data: {
        token: hashedToken,
        userId: user.id,
        expiresAt
      }
    });

    try {
      await sendPasswordResetEmail(user.email, rawToken);
    } catch (err) {
      console.error("Failed to dispatch password reset email:", err);
    }

    return {
      message: "If your email is registered, you will receive a password reset link shortly."
    };
  }

  async resetPassword(input: ResetPasswordInput) {
    const hashedToken = crypto.createHash("sha256").update(input.token).digest("hex");

    const resetTokenRecord = await prisma.passwordResetToken.findFirst({
      where: {
        token: hashedToken,
        used: false,
        expiresAt: {
          gt: new Date()
        }
      }
    });

    if (!resetTokenRecord) {
      throw new BadRequestError("Invalid or expired password reset token");
    }

    const hashedPassword = await hashPassword(input.password);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetTokenRecord.userId },
        data: { password: hashedPassword }
      }),
      prisma.passwordResetToken.update({
        where: { id: resetTokenRecord.id },
        data: { used: true }
      })
    ]);

    return {
      message: "Password has been successfully updated. You may now log in."
    };
  }

  async getCurrentUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
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

export const authService = new AuthService();
