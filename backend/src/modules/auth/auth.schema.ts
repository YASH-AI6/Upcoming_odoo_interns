import { z } from "zod";
import { PASSWORD_REGEX } from "../../utils/password";

export const signupSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z
    .string()
    .min(9, "Password must be more than 8 characters")
    .regex(
      PASSWORD_REGEX,
      "Password must contain at least one uppercase letter, one lowercase letter, and one special character"
    ),
  name: z.string().min(1).trim(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional()
});

export const loginSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(1)
});

export const forgotPasswordSchema = z.object({
  email: z.string().email().toLowerCase().trim()
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z
    .string()
    .min(9, "Password must be more than 8 characters")
    .regex(
      PASSWORD_REGEX,
      "Password must contain at least one uppercase letter, one lowercase letter, and one special character"
    )
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
