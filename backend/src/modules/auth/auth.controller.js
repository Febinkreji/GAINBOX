import { asyncHandler } from '../../utils/asyncHandler.js'
import { ApiResponse } from '../../utils/ApiResponse.js'
import { authService } from './auth.service.js'

export const authController = {
  createSession: asyncHandler(async (req, res) => {
    const session = await authService.createSession(req.body.token)
    ApiResponse.send(res, { statusCode: 201, data: session, message: 'Session created' })
  }),

  // requireAuth() already verified the token and populated req.user — this
  // endpoint just reflects that identity back. No database lookup: that
  // would be a "fetch the full profile" feature, which belongs to the User
  // module once it has a real repository.
  getCurrentUser: asyncHandler(async (req, res) => {
    ApiResponse.send(res, { data: req.user })
  }),
}
