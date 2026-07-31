import { asyncHandler } from '../../utils/asyncHandler.js'
import { ApiResponse } from '../../utils/ApiResponse.js'
import { webhookService } from './webhook.service.js'

export const webhookController = {
  receiveSurfboardWebhook: asyncHandler(async (req, res) => {
    await webhookService.logSurfboardReceipt(req.body, req.headers)
    await webhookService.handleSurfboardWebhook(req.body)
    ApiResponse.send(res, { statusCode: 200, message: 'Webhook received' })
  }),
}
