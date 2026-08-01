import { z } from 'zod'

export const branchSyncIdParamSchema = z.object({
  branchId: z.string().uuid(),
})

const SYNC_STATUSES = ['pending', 'running', 'completed', 'failed', 'skipped']

/**
 * Backs GET /integrations/surfboard/branches/history — every filter is
 * optional. `branchId` is what lets one endpoint serve both the
 * platform-wide activity view and the per-branch one Merchant Details
 * actually uses (see branchSync.service.js's getAllHistory) — same shape
 * as merchantSync.validation.js's syncHistoryQuerySchema.
 */
export const branchSyncHistoryQuerySchema = z.object({
  branchId: z.string().uuid().optional(),
  status: z.enum(SYNC_STATUSES).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
})
