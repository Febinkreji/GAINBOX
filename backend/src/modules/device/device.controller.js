import { asyncHandler } from '../../utils/asyncHandler.js'
import { ApiResponse } from '../../utils/ApiResponse.js'
import { deviceService } from './device.service.js'

export const deviceController = {
  list: asyncHandler(async (req, res) => {
    const devices = await deviceService.listByBranch(req.query.branchId)
    ApiResponse.send(res, { data: devices })
  }),

  getById: asyncHandler(async (req, res) => {
    const device = await deviceService.getById(req.params.id)
    ApiResponse.send(res, { data: device })
  }),

  register: asyncHandler(async (req, res) => {
    const device = await deviceService.register(req.body)
    ApiResponse.send(res, { statusCode: 201, data: device, message: 'Device registered' })
  }),

  update: asyncHandler(async (req, res) => {
    const device = await deviceService.update(req.params.id, req.body)
    ApiResponse.send(res, { data: device, message: 'Device updated' })
  }),

  deactivate: asyncHandler(async (req, res) => {
    await deviceService.deactivate(req.params.id)
    ApiResponse.send(res, { message: 'Device deactivated' })
  }),

  configureBranding: asyncHandler(async (req, res) => {
    const device = await deviceService.configureBranding(req.params.id, req.body)
    ApiResponse.send(res, { data: device, message: 'Device branding updated' })
  }),

  configureTips: asyncHandler(async (req, res) => {
    const device = await deviceService.configureTips(req.params.id, req.body)
    ApiResponse.send(res, { data: device, message: 'Device tip configuration updated' })
  }),
}
