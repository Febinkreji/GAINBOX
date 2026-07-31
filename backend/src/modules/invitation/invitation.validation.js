import { z } from 'zod'

const STATUSES = ['pending', 'accepted', 'expired', 'revoked']
// Only merchant-scoped roles are invitable — platform-admin is a global
// grant (see modules/authorization/userRole.repository.js) with no
// merchant to invite someone *into*, and customer isn't part of this
// merchant_staff-based RBAC model.
const INVITABLE_ROLES = ['merchant-owner', 'merchant-staff', 'viewer']

export const SORTABLE_FIELDS = ['createdAt', 'expiresAt', 'status', 'email']

export const createInvitationSchema = z.object({
  merchantId: z.string().uuid(),
  email: z.string().trim().toLowerCase().email(),
  displayName: z.string().trim().min(1).max(255).optional(),
  role: z.enum(INVITABLE_ROLES),
})

// Merchant Portal's nested POST /merchants/:id/invitations (see
// merchantStaff.controller.js) — merchantId is deliberately absent here:
// it comes from the ownership-checked URL param, never the body.
export const createMerchantScopedInvitationSchema = createInvitationSchema.omit({ merchantId: true })

export const invitationIdParamSchema = z.object({
  id: z.string().uuid(),
})

export const listInvitationsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().trim().min(1).max(255).optional(),
  merchantId: z.string().uuid().optional(),
  status: z.enum(STATUSES).optional(),
  role: z.enum(INVITABLE_ROLES).optional(),
  sortBy: z.enum(SORTABLE_FIELDS).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
})

// Feature 5 — the token is a 32-byte value hex-encoded (see
// invitationToken.js), i.e. exactly 64 hex characters.
export const acceptInvitationSchema = z.object({
  token: z.string().trim().regex(/^[0-9a-f]{64}$/i, 'Malformed invitation token'),
})

// Same token shape as acceptInvitationSchema, but read from a query string
// (GET /auth/invitations/preview?token=...) rather than a JSON body — the
// shareable invitation link puts the token in the URL, see constants/routes.js's
// invitationAcceptanceLink() on the frontend.
export const previewInvitationQuerySchema = z.object({
  token: z.string().trim().regex(/^[0-9a-f]{64}$/i, 'Malformed invitation token'),
})
