import { Router } from "express";
import { paymentsController } from "./payments.controller";
import { authenticate } from "../../middleware/auth";
import { requireRoles } from "../../middleware/rbac";
import { validateBody, validateQuery, validateParams } from "../../middleware/validate";
import {
  recordPaymentSchema,
  listPaymentsQuerySchema,
  paymentIdParamSchema,
  invoicePaymentParamSchema
} from "./payments.schema";
import { Role } from "@prisma/client";

const router = Router();

router.use(authenticate);

// List payments
router.get("/", validateQuery(listPaymentsQuerySchema), paymentsController.list);
router.get("/:id", validateParams(paymentIdParamSchema), paymentsController.getById);

// Record payment on invoice: ADMIN and STAFF (and customer paying their invoice)
router.post(
  "/invoices/:id/payments",
  validateParams(invoicePaymentParamSchema),
  validateBody(recordPaymentSchema),
  paymentsController.recordPayment
);

router.get(
  "/invoices/:id/payments",
  validateParams(invoicePaymentParamSchema),
  paymentsController.listByInvoice
);

export default router;
