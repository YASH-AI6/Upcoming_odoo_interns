import { Router } from "express";
import { customersController } from "./customers.controller";
import { authenticate } from "../../middleware/auth";
import { requireRoles } from "../../middleware/rbac";
import { validateBody, validateQuery, validateParams } from "../../middleware/validate";
import {
  createCustomerSchema,
  updateCustomerSchema,
  listCustomersQuerySchema,
  customerIdParamSchema
} from "./customers.schema";
import { Role } from "@prisma/client";

const router = Router();

router.use(authenticate);
router.use(requireRoles(Role.ADMIN, Role.STAFF));

router.post("/", validateBody(createCustomerSchema), customersController.create);
router.get("/", validateQuery(listCustomersQuerySchema), customersController.list);
router.get("/:id", validateParams(customerIdParamSchema), customersController.getById);
router.put(
  "/:id",
  validateParams(customerIdParamSchema),
  validateBody(updateCustomerSchema),
  customersController.update
);
router.delete("/:id", validateParams(customerIdParamSchema), customersController.delete);

export default router;
