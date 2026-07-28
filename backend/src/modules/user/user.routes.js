import { Router } from 'express'
import { requireAuth } from '../../middlewares/auth.middleware.js'
import { validate } from '../../middlewares/validate.middleware.js'
import { userController } from './user.controller.js'
import { createUserSchema, updateUserSchema } from './user.validation.js'

const router = Router()

router.use(requireAuth())

router.get('/', userController.list)
router.get('/:id', userController.getById)
router.post('/', validate(createUserSchema), userController.create)
router.patch('/:id', validate(updateUserSchema), userController.update)
router.delete('/:id', userController.remove)

export default router
