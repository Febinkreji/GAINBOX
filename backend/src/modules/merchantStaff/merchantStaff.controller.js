import { asyncHandler } from '../../utils/asyncHandler.js'
import { ApiResponse } from '../../utils/ApiResponse.js'
import { merchantStaffService } from './merchantStaff.service.js'
import { invitationService } from '../invitation/invitation.service.js'
import { NotFoundError } from '../../errors/index.js'

/**
 * The Merchant Portal's staff-management surface — mounted twice:
 *  - legacy /merchants/:id/staff, /merchants/:id/invitations (merchant.routes.js),
 *    merchantId from an ownership-checked URL param.
 *  - new /merchant/staff, /merchant/invitations (merchantContext.routes.js),
 *    merchantId derived from the authenticated user via
 *    requireMerchantContext() (see authorization.middleware.js) — never
 *    supplied by the caller at all.
 * Every function below resolves whichever source is present, so both route
 * families share this exact same controller — no business logic is
 * duplicated between them, only re-mounted under a different path.
 */

function resolveMerchantId(req) {
  return req.merchantId ?? req.params.id
}

async function assertInvitationBelongsToMerchant(invitationId, merchantId) {
  const invitation = await invitationService.getById(invitationId)

  if (invitation.merchantId !== merchantId) {
    // 404, not 403 — a merchant owner shouldn't learn that an invitation
    // id belonging to a merchant they don't own even exists.
    throw new NotFoundError('Invitation not found')
  }

  return invitation
}

export const merchantStaffController = {
  listStaff: asyncHandler(async (req, res) => {
    const roster = await merchantStaffService.listForMerchant(resolveMerchantId(req))
    ApiResponse.send(res, { data: roster })
  }),

  removeStaff: asyncHandler(async (req, res) => {
    const merchantId = resolveMerchantId(req)
    const existing = await merchantStaffService.listForMerchant(merchantId)

    if (!existing.some((entry) => entry.id === req.params.staffId)) {
      throw new NotFoundError('Staff assignment not found')
    }

    const removed = await merchantStaffService.remove(req.params.staffId, req.user?.id)
    ApiResponse.send(res, { data: removed, message: 'Staff member removed' })
  }),

  listInvitations: asyncHandler(async (req, res) => {
    const { items, meta } = await invitationService.list({ ...req.query, merchantId: resolveMerchantId(req) })
    ApiResponse.send(res, { data: items, meta })
  }),

  createInvitation: asyncHandler(async (req, res) => {
    // merchantId always comes from an ownership-checked or user-derived
    // source, never the request body — otherwise a caller could target a
    // merchant they don't belong to by simply setting a different
    // merchantId in the payload.
    const invitation = await invitationService.create(
      { ...req.body, merchantId: resolveMerchantId(req) },
      req.user?.id,
    )
    ApiResponse.send(res, { statusCode: 201, data: invitation, message: 'Invitation created' })
  }),

  resendInvitation: asyncHandler(async (req, res) => {
    await assertInvitationBelongsToMerchant(req.params.invitationId, resolveMerchantId(req))
    const invitation = await invitationService.resend(req.params.invitationId, req.user?.id)
    ApiResponse.send(res, { data: invitation, message: 'Invitation resent' })
  }),

  revokeInvitation: asyncHandler(async (req, res) => {
    await assertInvitationBelongsToMerchant(req.params.invitationId, resolveMerchantId(req))
    const invitation = await invitationService.revoke(req.params.invitationId, req.user?.id)
    ApiResponse.send(res, { data: invitation, message: 'Invitation revoked' })
  }),
}
