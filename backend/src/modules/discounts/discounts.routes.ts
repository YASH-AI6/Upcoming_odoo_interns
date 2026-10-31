import { Router } from "express";
import { discountsController } from "./discounts.controller";
import { authenticate } from "../../middleware/auth";
import { requireRoles } from "../../middleware/rbac";
import { validateBody, validateQuery, validateParams } from "../../middleware/validate";
import {
  createDiscountSchema,
  updateDiscountSchema,
  listDiscountsQuerySchema,
  discountIdParamSchema
} from "./discounts.schema";
import { Role } from "@prisma/client";

const router = Router();

router.use(authenticate);

// Read is accessible to ADMIN and STAFF
router.get(
  "/",
  requireRoles(Role.ADMIN, Role.STAFF),
  validateQuery(listDiscountsQuerySchema),
  discountsController.list
);
router.get(
  "/:id",
  requireRoles(Role.ADMIN, Role.STAFF),
  validateParams(discountIdParamSchema),
  discountsController.getById
);

// Modifications are ADMIN only
router.post(
  "/",
  requireRoles(Role.ADMIN),
  validateBody(createDiscountSchema),
  discountsController.create
);
router.put(
  "/:id",
  requireRoles(Role.ADMIN),
  validateParams(discountIdParamSchema),
  validateBody(updateDiscountSchema),
  discountsController.update
);
router.delete(
  "/:id",
  requireRoles(Role.ADMIN),
  validateParams(discountIdParamSchema),
  discountsController.delete
);

export default router;
