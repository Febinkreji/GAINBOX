import { z } from 'zod'

export const merchantSyncIdParamSchema = z.object({
  merchantId: z.string().uuid(),
})

const SYNC_STATUSES = ['pending', 'running', 'completed', 'failed', 'skipped']

/**
 * Backs GET /integrations/surfboard/merchants/history — every filter is
 * optional. `merchantId` is what lets one endpoint serve both the
 * platform-wide activity view and the per-merchant one Merchant Details
 * actually uses (see merchantSync.service.js's getAllHistory).
 */
export const syncHistoryQuerySchema = z.object({
  merchantId: z.string().uuid().optional(),
  status: z.enum(SYNC_STATUSES).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
})
