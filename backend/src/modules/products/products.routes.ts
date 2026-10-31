import { Router } from "express";
import { productsController } from "./products.controller";
import { authenticate } from "../../middleware/auth";
import { requireRoles } from "../../middleware/rbac";
import { validateBody, validateQuery, validateParams } from "../../middleware/validate";
import {
  createProductSchema,
  updateProductSchema,
  createVariantSchema,
  listProductsQuerySchema,
  productIdParamSchema,
  variantIdParamSchema
} from "./products.schema";
import { Role } from "@prisma/client";

const router = Router();

router.use(authenticate);

// Read is accessible to ADMIN and STAFF
router.get(
  "/",
  requireRoles(Role.ADMIN, Role.STAFF),
  validateQuery(listProductsQuerySchema),
  productsController.list
);
router.get(
  "/:id",
  requireRoles(Role.ADMIN, Role.STAFF),
  validateParams(productIdParamSchema),
  productsController.getById
);

// Write is ADMIN only
router.post(
  "/",
  requireRoles(Role.ADMIN),
  validateBody(createProductSchema),
  productsController.create
);
router.put(
  "/:id",
  requireRoles(Role.ADMIN),
  validateParams(productIdParamSchema),
  validateBody(updateProductSchema),
  productsController.update
);
router.delete(
  "/:id",
  requireRoles(Role.ADMIN),
  validateParams(productIdParamSchema),
  productsController.delete
);

router.post(
  "/:id/variants",
  requireRoles(Role.ADMIN),
  validateParams(productIdParamSchema),
  validateBody(createVariantSchema),
  productsController.addVariant
);

router.delete(
  "/:productId/variants/:variantId",
  requireRoles(Role.ADMIN),
  validateParams(variantIdParamSchema),
  productsController.deleteVariant
);

export default router;
