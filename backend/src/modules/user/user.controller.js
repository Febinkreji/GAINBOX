import { asyncHandler } from '../../utils/asyncHandler.js'
import { ApiResponse } from '../../utils/ApiResponse.js'
import { parsePagination } from '../../utils/pagination.js'
import { userService } from './user.service.js'

export const userController = {
  list: asyncHandler(async (req, res) => {
    const pagination = parsePagination(req.query)
    const users = await userService.list(pagination)
    ApiResponse.send(res, { data: users })
  }),

  getById: asyncHandler(async (req, res) => {
    const user = await userService.getById(req.params.id)
    ApiResponse.send(res, { data: user })
  }),

  create: asyncHandler(async (req, res) => {
    const user = await userService.create(req.body)
    ApiResponse.send(res, { statusCode: 201, data: user, message: 'User created' })
  }),

  update: asyncHandler(async (req, res) => {
    const user = await userService.update(req.params.id, req.body)
    ApiResponse.send(res, { data: user, message: 'User updated' })
  }),

  remove: asyncHandler(async (req, res) => {
    await userService.remove(req.params.id)
    ApiResponse.send(res, { message: 'User deleted' })
  }),
}
