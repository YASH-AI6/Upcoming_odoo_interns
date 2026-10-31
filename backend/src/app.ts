import express, { Express } from "express";
import cors from "cors";
import helmet from "helmet";
import { errorHandler } from "./middleware/errorHandler";

import authRoutes from "./modules/auth/auth.routes";
import usersRoutes from "./modules/users/users.routes";
import customersRoutes from "./modules/customers/customers.routes";
import productsRoutes from "./modules/products/products.routes";
import plansRoutes from "./modules/plans/plans.routes";
import templatesRoutes from "./modules/templates/templates.routes";
import subscriptionsRoutes from "./modules/subscriptions/subscriptions.routes";
import taxesRoutes from "./modules/taxes/taxes.routes";
import discountsRoutes from "./modules/discounts/discounts.routes";
import invoicesRoutes from "./modules/invoices/invoices.routes";
import paymentsRoutes from "./modules/payments/payments.routes";
import billingRoutes from "./modules/billing/billing.routes";
import dashboardRoutes from "./modules/dashboard/dashboard.routes";
import portalRoutes from "./modules/portal/portal.routes";

export const createApp = (): Express => {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));

  // Health check
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  const apiRouter = express.Router();

  apiRouter.get("/health", (_req, res) => {
    res.json({ status: "ok", version: "1.0.0", timestamp: new Date().toISOString() });
  });

  apiRouter.use("/auth", authRoutes);
  apiRouter.use("/users", usersRoutes);
  apiRouter.use("/customers", customersRoutes);
  apiRouter.use("/products", productsRoutes);
  apiRouter.use("/plans", plansRoutes);
  apiRouter.use("/templates", templatesRoutes);
  apiRouter.use("/subscriptions", subscriptionsRoutes);
  apiRouter.use("/taxes", taxesRoutes);
  apiRouter.use("/discounts", discountsRoutes);
  apiRouter.use("/invoices", invoicesRoutes);
  apiRouter.use("/payments", paymentsRoutes);
  apiRouter.use("/billing", billingRoutes);
  apiRouter.use("/dashboard", dashboardRoutes);
  apiRouter.use("/portal", portalRoutes);

  app.use("/api/v1", apiRouter);

  // Central error handling
  app.use(errorHandler);

  return app;
};

export const app = createApp();
