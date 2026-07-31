import { z } from 'zod'

// merchant.validation.js's merchantIdParamSchema validates `id` alone —
// these nested routes (/merchants/:id/staff/:staffId etc.) need both
// params validated together in one req.params object.
export const merchantStaffIdParamSchema = z.object({
  id: z.string().uuid(),
  staffId: z.string().uuid(),
})

export const merchantInvitationIdParamSchema = z.object({
  id: z.string().uuid(),
  invitationId: z.string().uuid(),
})

// The new merchant-context routes (/merchant/staff/:staffId,
// /merchant/invitations/:invitationId/*) have no merchantId param at all —
// it's derived from the authenticated user by requireMerchantContext(),
// never present in the URL — so these validate only the one id each route
// actually receives.
export const staffIdParamSchema = z.object({
  staffId: z.string().uuid(),
})

export const invitationIdOnlyParamSchema = z.object({
  invitationId: z.string().uuid(),
})
