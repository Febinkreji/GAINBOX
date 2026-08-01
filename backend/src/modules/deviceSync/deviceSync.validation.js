import { z } from 'zod'

export const deviceSyncIdParamSchema = z.object({
  deviceId: z.string().uuid(),
})

const SYNC_STATUSES = ['pending', 'running', 'completed', 'failed', 'skipped']

/**
 * Backs GET /integrations/surfboard/devices/history — same shape as
 * branchSync.validation.js's / merchantSync.validation.js's history schema.
 */
export const deviceSyncHistoryQuerySchema = z.object({
  deviceId: z.string().uuid().optional(),
  status: z.enum(SYNC_STATUSES).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
})
