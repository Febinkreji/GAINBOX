import { asyncHandler } from '../../utils/asyncHandler.js'
import { ApiResponse } from '../../utils/ApiResponse.js'
import { recommendationService } from './recommendation.service.js'

export const recommendationController = {
  list: asyncHandler(async (req, res) => {
    const { items, meta } = await recommendationService.list(req.query)
    ApiResponse.send(res, { data: items, meta })
  }),

  getById: asyncHandler(async (req, res) => {
    const recommendation = await recommendationService.getById(req.params.id)
    ApiResponse.send(res, { data: recommendation })
  }),

  create: asyncHandler(async (req, res) => {
    const recommendation = await recommendationService.create(req.body, req.user?.id)
    ApiResponse.send(res, { statusCode: 201, data: recommendation, message: 'Recommendation created' })
  }),

  update: asyncHandler(async (req, res) => {
    const recommendation = await recommendationService.update(req.params.id, req.body, req.user?.id)
    ApiResponse.send(res, { data: recommendation, message: 'Recommendation updated' })
  }),

  remove: asyncHandler(async (req, res) => {
    await recommendationService.remove(req.params.id, req.user?.id)
    ApiResponse.send(res, { message: 'Recommendation deleted' })
  }),
}
