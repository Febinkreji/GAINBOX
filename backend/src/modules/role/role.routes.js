import { Router } from 'express'
import { requireAuth } from '../../middlewares/auth.middleware.js'
import { validate } from '../../middlewares/validate.middleware.js'
import { roleController } from './role.controller.js'
import { createRoleSchema, assignPermissionSchema } from './role.validation.js'

const router = Router()

router.use(requireAuth())

router.get('/', roleController.listRoles)
router.get('/:id', roleController.getRoleById)
router.post('/', validate(createRoleSchema), roleController.createRole)
router.get('/permissions/all', roleController.listPermissions)
router.post('/:id/permissions', validate(assignPermissionSchema), roleController.assignPermission)

export default router
