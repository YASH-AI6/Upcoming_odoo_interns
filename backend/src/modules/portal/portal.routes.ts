import { Router } from "express";
import { portalController } from "./portal.controller";
import { authenticate } from "../../middleware/auth";
import { validateQuery } from "../../middleware/validate";
import { listSubscriptionsQuerySchema } from "../subscriptions/subscriptions.schema";
import { listInvoicesQuerySchema } from "../invoices/invoices.schema";
import { listPaymentsQuerySchema } from "../payments/payments.schema";

const router = Router();

router.use(authenticate);

router.get(
  "/subscriptions",
  validateQuery(listSubscriptionsQuerySchema),
  portalController.getSubscriptions
);

router.get(
  "/invoices",
  validateQuery(listInvoicesQuerySchema),
  portalController.getInvoices
);

router.get(
  "/payments",
  validateQuery(listPaymentsQuerySchema),
  portalController.getPayments
);

export default router;
