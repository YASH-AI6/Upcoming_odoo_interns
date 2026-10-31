import { Router } from "express";
import { billingController } from "./billing.controller";
import { authenticate } from "../../middleware/auth";
import { requireRoles } from "../../middleware/rbac";
import { validateBody } from "../../middleware/validate";
import { billingDateSchema } from "./billing.schema";
import { Role } from "@prisma/client";

const router = Router();

router.use(authenticate);
router.use(requireRoles(Role.ADMIN));

router.post("/preview", validateBody(billingDateSchema), billingController.preview);
router.post("/run", validateBody(billingDateSchema), billingController.run);

export default router;
