import { Router } from "express";
import { usersController } from "./users.controller";
import { authenticate } from "../../middleware/auth";
import { requireRoles } from "../../middleware/rbac";
import { validateBody, validateQuery, validateParams } from "../../middleware/validate";
import {
  createStaffSchema,
  listUsersQuerySchema,
  userIdParamSchema
} from "./users.schema";
import { Role } from "@prisma/client";

const router = Router();

router.use(authenticate);

router.post(
  "/staff",
  requireRoles(Role.ADMIN),
  validateBody(createStaffSchema),
  usersController.createStaff
);

router.get(
  "/",
  requireRoles(Role.ADMIN),
  validateQuery(listUsersQuerySchema),
  usersController.list
);

router.get(
  "/:id",
  requireRoles(Role.ADMIN),
  validateParams(userIdParamSchema),
  usersController.getById
);

export default router;
