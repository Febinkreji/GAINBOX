import { Router } from 'express'
import { requireAuth } from '../../middlewares/auth.middleware.js'
import { requireRole } from '../../middlewares/authorization.middleware.js'
import { validate } from '../../middlewares/validate.middleware.js'
import { roleController } from './role.controller.js'
import { createRoleSchema, assignPermissionSchema } from './role.validation.js'

const router = Router()

router.use(requireAuth())

router.get('/', roleController.listRoles)
router.get('/:id', roleController.getRoleById)
router.post('/', validate(createRoleSchema), roleController.createRole)
router.get('/permissions/all', roleController.listPermissions)
// Writes to role_permissions — the RBAC source of truth (see
// authorization.service.js) — so this is platform-admin-only. Granting
// permissions is exactly the kind of write an unauthorized caller could use
// for role escalation (granting their own role a permission they lack).
router.post(
  '/:id/permissions',
  requireRole('platform-admin'),
  validate(assignPermissionSchema),
  roleController.assignPermission,
)

export default router
