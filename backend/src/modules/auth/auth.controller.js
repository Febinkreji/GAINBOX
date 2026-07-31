import { asyncHandler } from '../../utils/asyncHandler.js'
import { ApiResponse } from '../../utils/ApiResponse.js'
import { authService } from './auth.service.js'
import { merchantStaffRepository } from '../merchantStaff/merchantStaff.repository.js'
import { authorizationService } from '../authorization/authorization.service.js'

export const authController = {
  createSession: asyncHandler(async (req, res) => {
    const session = await authService.createSession(req.body.token)
    ApiResponse.send(res, { statusCode: 201, data: session, message: 'Session created' })
  }),

  // requireAuth() already verified the token and populated req.user — this
  // endpoint reflects that identity back, plus the caller's own merchant
  // assignments and role names, reusing merchantStaffRepository/
  // authorizationService exactly as Platform Control Center's User Details
  // already does. The Merchant Portal has no other way to discover "which
  // merchant am I staffed at, and with what role" — there is deliberately
  // no separate endpoint for this; it's an addition to the existing
  // "who am I" response, not a new one.
  getCurrentUser: asyncHandler(async (req, res) => {
    const [assignments, roles] = await Promise.all([
      merchantStaffRepository.findAssignmentsForUser(req.user.id),
      authorizationService.getAssignedRoleNames(req.user.id),
    ])

    ApiResponse.send(res, {
      data: {
        ...req.user,
        merchantAssignments: assignments.filter((assignment) => assignment.status === 'active'),
        roles,
      },
    })
  }),
}
