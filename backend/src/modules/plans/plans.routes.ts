import { Router } from "express";
import { plansController } from "./plans.controller";
import { authenticate } from "../../middleware/auth";
import { requireRoles } from "../../middleware/rbac";
import { validateBody, validateQuery, validateParams } from "../../middleware/validate";
import {
  createPlanSchema,
  updatePlanSchema,
  listPlansQuerySchema,
  planIdParamSchema
} from "./plans.schema";
import { Role } from "@prisma/client";

const router = Router();

router.use(authenticate);

// List/read plans accessible to all authenticated users
router.get("/", validateQuery(listPlansQuerySchema), plansController.list);
router.get("/:id", validateParams(planIdParamSchema), plansController.getById);

// Plan modifications are ADMIN only
router.post(
  "/",
  requireRoles(Role.ADMIN),
  validateBody(createPlanSchema),
  plansController.create
);
router.put(
  "/:id",
  requireRoles(Role.ADMIN),
  validateParams(planIdParamSchema),
  validateBody(updatePlanSchema),
  plansController.update
);
router.delete(
  "/:id",
  requireRoles(Role.ADMIN),
  validateParams(planIdParamSchema),
  plansController.delete
);

export default router;
