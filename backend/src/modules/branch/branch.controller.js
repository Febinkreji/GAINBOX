import { asyncHandler } from '../../utils/asyncHandler.js'
import { ApiResponse } from '../../utils/ApiResponse.js'
import { branchService } from './branch.service.js'

export const branchController = {
  list: asyncHandler(async (req, res) => {
    const { items, meta } = await branchService.list(req.query, req.accessibleMerchantIds)
    ApiResponse.send(res, { data: items, meta })
  }),

  getById: asyncHandler(async (req, res) => {
    const branch = await branchService.getById(req.params.id)
    ApiResponse.send(res, { data: branch })
  }),

  create: asyncHandler(async (req, res) => {
    const branch = await branchService.create(req.body, req.user?.id)
    ApiResponse.send(res, { statusCode: 201, data: branch, message: 'Branch created' })
  }),

  update: asyncHandler(async (req, res) => {
    const branch = await branchService.update(req.params.id, req.body, req.user?.id)
    ApiResponse.send(res, { data: branch, message: 'Branch updated' })
  }),

  remove: asyncHandler(async (req, res) => {
    await branchService.remove(req.params.id, req.user?.id)
    ApiResponse.send(res, { message: 'Branch deleted' })
  }),
}
