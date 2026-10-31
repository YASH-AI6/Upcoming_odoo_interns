import { Router } from "express";
import { authController } from "./auth.controller";
import { validateBody } from "../../middleware/validate";
import { authenticate } from "../../middleware/auth";
import { authLimiter } from "../../middleware/rateLimiter";
import {
  signupSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema
} from "./auth.schema";

const router = Router();

router.post("/signup", authLimiter, validateBody(signupSchema), authController.signup);
router.post("/login", authLimiter, validateBody(loginSchema), authController.login);
router.post(
  "/forgot-password",
  authLimiter,
  validateBody(forgotPasswordSchema),
  authController.forgotPassword
);
router.post(
  "/reset-password",
  authLimiter,
  validateBody(resetPasswordSchema),
  authController.resetPassword
);
router.get("/me", authenticate, authController.me);

export default router;
