import { Router } from "express";
import { taxesController } from "./taxes.controller";
import { authenticate } from "../../middleware/auth";
import { requireRoles } from "../../middleware/rbac";
import { validateBody, validateQuery, validateParams } from "../../middleware/validate";
import {
  createTaxSchema,
  updateTaxSchema,
  listTaxesQuerySchema,
  taxIdParamSchema
} from "./taxes.schema";
import { Role } from "@prisma/client";

const router = Router();

router.use(authenticate);

// Read accessible to ADMIN and STAFF
router.get(
  "/",
  requireRoles(Role.ADMIN, Role.STAFF),
  validateQuery(listTaxesQuerySchema),
  taxesController.list
);
router.get(
  "/:id",
  requireRoles(Role.ADMIN, Role.STAFF),
  validateParams(taxIdParamSchema),
  taxesController.getById
);

// Write is ADMIN only
router.post(
  "/",
  requireRoles(Role.ADMIN),
  validateBody(createTaxSchema),
  taxesController.create
);
router.put(
  "/:id",
  requireRoles(Role.ADMIN),
  validateParams(taxIdParamSchema),
  validateBody(updateTaxSchema),
  taxesController.update
);
router.delete(
  "/:id",
  requireRoles(Role.ADMIN),
  validateParams(taxIdParamSchema),
  taxesController.delete
);

export default router;
