import { Router } from "express";
import { invoicesController } from "./invoices.controller";
import { authenticate } from "../../middleware/auth";
import { requireRoles } from "../../middleware/rbac";
import { validateBody, validateQuery, validateParams } from "../../middleware/validate";
import {
  createInvoiceSchema,
  listInvoicesQuerySchema,
  invoiceIdParamSchema
} from "./invoices.schema";
import { Role } from "@prisma/client";

const router = Router();

router.use(authenticate);

// View list, details, and download PDF (accessible to ADMIN, STAFF, and CUSTOMER with service-level scoping)
router.get("/", validateQuery(listInvoicesQuerySchema), invoicesController.list);
router.get("/:id", validateParams(invoiceIdParamSchema), invoicesController.getById);
router.get("/:id/pdf", validateParams(invoiceIdParamSchema), invoicesController.downloadPdf);

// Management actions
router.post(
  "/",
  requireRoles(Role.ADMIN, Role.STAFF),
  validateBody(createInvoiceSchema),
  invoicesController.create
);

router.post(
  "/:id/confirm",
  requireRoles(Role.ADMIN, Role.STAFF),
  validateParams(invoiceIdParamSchema),
  invoicesController.confirm
);

router.post(
  "/:id/cancel",
  requireRoles(Role.ADMIN, Role.STAFF),
  validateParams(invoiceIdParamSchema),
  invoicesController.cancel
);

router.post(
  "/:id/send",
  requireRoles(Role.ADMIN, Role.STAFF),
  validateParams(invoiceIdParamSchema),
  invoicesController.send
);

// Payment endpoints under /invoices/:id/payments
import { paymentsController } from "../payments/payments.controller";
import { recordPaymentSchema } from "../payments/payments.schema";

router.post(
  "/:id/payments",
  validateParams(invoiceIdParamSchema),
  validateBody(recordPaymentSchema),
  paymentsController.recordPayment
);

router.get(
  "/:id/payments",
  validateParams(invoiceIdParamSchema),
  paymentsController.listByInvoice
);

export default router;
