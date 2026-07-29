import { asyncHandler } from '../../utils/asyncHandler.js'
import { ApiResponse } from '../../utils/ApiResponse.js'
import { runbookService } from './runbook.service.js'

export const runbookController = {
  list: asyncHandler(async (req, res) => {
    const { items, meta } = await runbookService.list(req.query)
    ApiResponse.send(res, { data: items, meta })
  }),

  getById: asyncHandler(async (req, res) => {
    const runbook = await runbookService.getById(req.params.id)
    ApiResponse.send(res, { data: runbook })
  }),

  create: asyncHandler(async (req, res) => {
    const runbook = await runbookService.create(req.body, req.user?.id)
    ApiResponse.send(res, { statusCode: 201, data: runbook, message: 'Runbook created' })
  }),

  update: asyncHandler(async (req, res) => {
    const runbook = await runbookService.update(req.params.id, req.body, req.user?.id)
    ApiResponse.send(res, { data: runbook, message: 'Runbook updated' })
  }),

  remove: asyncHandler(async (req, res) => {
    await runbookService.remove(req.params.id, req.user?.id)
    ApiResponse.send(res, { message: 'Runbook deleted' })
  }),
}
