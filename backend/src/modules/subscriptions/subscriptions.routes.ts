import { Router } from "express";
import { subscriptionsController } from "./subscriptions.controller";
import { authenticate } from "../../middleware/auth";
import { requireRoles } from "../../middleware/rbac";
import { validateBody, validateQuery, validateParams } from "../../middleware/validate";
import {
  createSubscriptionSchema,
  updateSubscriptionSchema,
  listSubscriptionsQuerySchema,
  subscriptionIdParamSchema
} from "./subscriptions.schema";
import { Role } from "@prisma/client";

const router = Router();

router.use(authenticate);

// List and get by ID are accessible by ADMIN, STAFF, and CUSTOMER (scoped in service)
router.get("/", validateQuery(listSubscriptionsQuerySchema), subscriptionsController.list);
router.get("/:id", validateParams(subscriptionIdParamSchema), subscriptionsController.getById);

// Staff and Admin actions
router.post(
  "/",
  requireRoles(Role.ADMIN, Role.STAFF),
  validateBody(createSubscriptionSchema),
  subscriptionsController.create
);

router.put(
  "/:id",
  requireRoles(Role.ADMIN, Role.STAFF),
  validateParams(subscriptionIdParamSchema),
  validateBody(updateSubscriptionSchema),
  subscriptionsController.update
);

router.post(
  "/:id/confirm",
  requireRoles(Role.ADMIN, Role.STAFF),
  validateParams(subscriptionIdParamSchema),
  subscriptionsController.confirm
);

router.post(
  "/:id/activate",
  requireRoles(Role.ADMIN, Role.STAFF),
  validateParams(subscriptionIdParamSchema),
  subscriptionsController.activate
);

router.post(
  "/:id/pause",
  requireRoles(Role.ADMIN, Role.STAFF),
  validateParams(subscriptionIdParamSchema),
  subscriptionsController.pause
);

router.post(
  "/:id/resume",
  requireRoles(Role.ADMIN, Role.STAFF),
  validateParams(subscriptionIdParamSchema),
  subscriptionsController.resume
);

router.post(
  "/:id/close",
  requireRoles(Role.ADMIN, Role.STAFF),
  validateParams(subscriptionIdParamSchema),
  subscriptionsController.close
);

router.post(
  "/:id/renew",
  requireRoles(Role.ADMIN, Role.STAFF),
  validateParams(subscriptionIdParamSchema),
  subscriptionsController.renew
);

export default router;
