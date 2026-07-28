import { asyncHandler } from '../../utils/asyncHandler.js'
import { ApiResponse } from '../../utils/ApiResponse.js'
import { merchantService } from './merchant.service.js'

export const merchantController = {
  list: asyncHandler(async (req, res) => {
    const { items, meta } = await merchantService.list(req.query)
    ApiResponse.send(res, { data: items, meta })
  }),

  getById: asyncHandler(async (req, res) => {
    const merchant = await merchantService.getById(req.params.id)
    ApiResponse.send(res, { data: merchant })
  }),

  create: asyncHandler(async (req, res) => {
    const merchant = await merchantService.create(req.body, req.user?.id)
    ApiResponse.send(res, { statusCode: 201, data: merchant, message: 'Merchant created' })
  }),

  update: asyncHandler(async (req, res) => {
    const merchant = await merchantService.update(req.params.id, req.body, req.user?.id)
    ApiResponse.send(res, { data: merchant, message: 'Merchant updated' })
  }),

  remove: asyncHandler(async (req, res) => {
    await merchantService.remove(req.params.id, req.user?.id)
    ApiResponse.send(res, { message: 'Merchant deleted' })
  }),
}
