import { asyncHandler } from '../../utils/asyncHandler.js'
import { ApiResponse } from '../../utils/ApiResponse.js'
import { invitationService } from './invitation.service.js'

export const invitationController = {
  list: asyncHandler(async (req, res) => {
    const { items, meta } = await invitationService.list(req.query)
    ApiResponse.send(res, { data: items, meta })
  }),

  getById: asyncHandler(async (req, res) => {
    const invitation = await invitationService.getById(req.params.id)
    ApiResponse.send(res, { data: invitation })
  }),

  create: asyncHandler(async (req, res) => {
    const invitation = await invitationService.create(req.body, req.user?.id)
    ApiResponse.send(res, { statusCode: 201, data: invitation, message: 'Invitation created' })
  }),

  resend: asyncHandler(async (req, res) => {
    const invitation = await invitationService.resend(req.params.id, req.user?.id)
    ApiResponse.send(res, { data: invitation, message: 'Invitation resent' })
  }),

  revoke: asyncHandler(async (req, res) => {
    const invitation = await invitationService.revoke(req.params.id, req.user?.id)
    ApiResponse.send(res, { data: invitation, message: 'Invitation revoked' })
  }),

  // Wired under /auth/invitations/accept (see auth.routes.js), not
  // /platform — accepting is an authenticated-user action, not a
  // platform-admin one. Lives here because invitation.service.js owns the
  // accept business logic; auth.routes.js only routes to it.
  accept: asyncHandler(async (req, res) => {
    const result = await invitationService.accept(req.body.token, req.user)
    ApiResponse.send(res, { data: result, message: 'Invitation accepted' })
  }),

  // Wired under /auth/invitations/preview, same reasoning as accept above
  // — read-only, so the acceptance UI can show merchant name/invited
  // email/status before the user commits.
  preview: asyncHandler(async (req, res) => {
    const result = await invitationService.previewByToken(req.query.token, req.user)
    ApiResponse.send(res, { data: result })
  }),
}
