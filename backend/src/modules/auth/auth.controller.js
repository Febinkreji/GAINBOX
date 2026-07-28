import { asyncHandler } from '../../utils/asyncHandler.js'
import { ApiResponse } from '../../utils/ApiResponse.js'
import { authService } from './auth.service.js'

export const authController = {
  createSession: asyncHandler(async (req, res) => {
    const session = await authService.createSession(req.body.token)
    ApiResponse.send(res, { statusCode: 201, data: session, message: 'Session created' })
  }),

  getCurrentUser: asyncHandler(async (req, res) => {
    const user = await authService.getCurrentUser(req.user.id)
    ApiResponse.send(res, { data: user })
  }),
}
