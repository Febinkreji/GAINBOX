import { Router } from 'express'
import { requireAuth } from '../../middlewares/auth.middleware.js'
import { requireRole, requirePermission, requireOwnership } from '../../middlewares/authorization.middleware.js'
import { validate } from '../../middlewares/validate.middleware.js'
import { merchantController } from './merchant.controller.js'
import {
  createMerchantSchema,
  updateMerchantSchema,
  merchantIdParamSchema,
  listMerchantsQuerySchema,
} from './merchant.validation.js'

const router = Router()

router.use(requireAuth())

// Listing every merchant and onboarding a new one are platform-wide
// actions, not scoped to a merchant a user already belongs to — gated by
// role, not by requireOwnership (there's no existing merchant to check
// ownership against for either of these).
router.get('/', requireRole('platform-admin'), validate(listMerchantsQuerySchema, 'query'), merchantController.list)
router.get(
  '/:id',
  validate(merchantIdParamSchema, 'params'),
  requirePermission('merchant.read'),
  requireOwnership('merchant', (req) => req.params.id),
  merchantController.getById,
)
router.post('/', requireRole('platform-admin'), validate(createMerchantSchema), merchantController.create)
router.patch(
  '/:id',
  validate(merchantIdParamSchema, 'params'),
  requirePermission('merchant.write'),
  requireOwnership('merchant', (req) => req.params.id),
  validate(updateMerchantSchema),
  merchantController.update,
)
router.delete(
  '/:id',
  validate(merchantIdParamSchema, 'params'),
  requirePermission('merchant.write'),
  requireOwnership('merchant', (req) => req.params.id),
  merchantController.remove,
)

export default router
