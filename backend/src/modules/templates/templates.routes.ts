import { Router } from "express";
import { templatesController } from "./templates.controller";
import { authenticate } from "../../middleware/auth";
import { requireRoles } from "../../middleware/rbac";
import { validateBody, validateQuery, validateParams } from "../../middleware/validate";
import {
  createTemplateSchema,
  updateTemplateSchema,
  listTemplatesQuerySchema,
  templateIdParamSchema
} from "./templates.schema";
import { Role } from "@prisma/client";

const router = Router();

router.use(authenticate);
router.use(requireRoles(Role.ADMIN, Role.STAFF));

router.post("/", validateBody(createTemplateSchema), templatesController.create);
router.get("/", validateQuery(listTemplatesQuerySchema), templatesController.list);
router.get("/:id", validateParams(templateIdParamSchema), templatesController.getById);
router.put(
  "/:id",
  validateParams(templateIdParamSchema),
  validateBody(updateTemplateSchema),
  templatesController.update
);
router.delete("/:id", validateParams(templateIdParamSchema), templatesController.delete);

export default router;
