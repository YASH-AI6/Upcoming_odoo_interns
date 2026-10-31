import { Router } from "express";
import { dashboardController } from "./dashboard.controller";
import { authenticate } from "../../middleware/auth";
import { requireRoles } from "../../middleware/rbac";
import { validateQuery } from "../../middleware/validate";
import { dashboardSummaryQuerySchema } from "./dashboard.schema";
import { Role } from "@prisma/client";

const router = Router();

router.use(authenticate);
router.use(requireRoles(Role.ADMIN, Role.STAFF));

router.get("/summary", validateQuery(dashboardSummaryQuerySchema), dashboardController.getSummary);

export default router;
