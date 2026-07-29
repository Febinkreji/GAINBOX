import { asyncHandler } from '../../utils/asyncHandler.js'
import { ApiResponse } from '../../utils/ApiResponse.js'
import { auditService } from './audit.service.js'

/**
 * The read side of Audit Explorer (Phase 3) — record() stays internal,
 * called only by domain services; nothing here writes.
 */
export const auditController = {
  list: asyncHandler(async (req, res) => {
    const { items, meta } = await auditService.list(req.query)
    ApiResponse.send(res, { data: items, meta })
  }),

  getById: asyncHandler(async (req, res) => {
    const entry = await auditService.getById(req.params.id)
    ApiResponse.send(res, { data: entry })
  }),
}
