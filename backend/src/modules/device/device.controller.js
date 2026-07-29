import { asyncHandler } from '../../utils/asyncHandler.js'
import { ApiResponse } from '../../utils/ApiResponse.js'
import { deviceService } from './device.service.js'

export const deviceController = {
  list: asyncHandler(async (req, res) => {
    const { items, meta } = await deviceService.list(req.query, req.accessibleMerchantIds)
    ApiResponse.send(res, { data: items, meta })
  }),

  getById: asyncHandler(async (req, res) => {
    const device = await deviceService.getById(req.params.id)
    ApiResponse.send(res, { data: device })
  }),

  create: asyncHandler(async (req, res) => {
    const device = await deviceService.create(req.body, req.user?.id)
    ApiResponse.send(res, { statusCode: 201, data: device, message: 'Device created' })
  }),

  update: asyncHandler(async (req, res) => {
    const device = await deviceService.update(req.params.id, req.body, req.user?.id)
    ApiResponse.send(res, { data: device, message: 'Device updated' })
  }),

  remove: asyncHandler(async (req, res) => {
    await deviceService.remove(req.params.id, req.user?.id)
    ApiResponse.send(res, { message: 'Device deleted' })
  }),
}
