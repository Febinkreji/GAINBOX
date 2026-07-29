import { asyncHandler } from '../../utils/asyncHandler.js'
import { ApiResponse } from '../../utils/ApiResponse.js'
import { incidentService } from './incident.service.js'

export const incidentController = {
  list: asyncHandler(async (req, res) => {
    const { items, meta } = await incidentService.list(req.query)
    ApiResponse.send(res, { data: items, meta })
  }),

  getById: asyncHandler(async (req, res) => {
    const incident = await incidentService.getById(req.params.id)
    ApiResponse.send(res, { data: incident })
  }),

  create: asyncHandler(async (req, res) => {
    const incident = await incidentService.create(req.body, req.user?.id)
    ApiResponse.send(res, { statusCode: 201, data: incident, message: 'Incident created' })
  }),

  update: asyncHandler(async (req, res) => {
    const incident = await incidentService.update(req.params.id, req.body, req.user?.id)
    ApiResponse.send(res, { data: incident, message: 'Incident updated' })
  }),

  remove: asyncHandler(async (req, res) => {
    await incidentService.remove(req.params.id, req.user?.id)
    ApiResponse.send(res, { message: 'Incident deleted' })
  }),
}
