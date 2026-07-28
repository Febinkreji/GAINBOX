import { asyncHandler } from '../../utils/asyncHandler.js'
import { ApiResponse } from '../../utils/ApiResponse.js'
import { paymentService } from './payment.service.js'

export const paymentController = {
  list: asyncHandler(async (req, res) => {
    const payments = await paymentService.list(req.query)
    ApiResponse.send(res, { data: payments })
  }),

  getById: asyncHandler(async (req, res) => {
    const payment = await paymentService.getById(req.params.id)
    ApiResponse.send(res, { data: payment })
  }),

  create: asyncHandler(async (req, res) => {
    const payment = await paymentService.create(req.body)
    ApiResponse.send(res, { statusCode: 201, data: payment, message: 'Payment created' })
  }),

  refund: asyncHandler(async (req, res) => {
    const payment = await paymentService.refund(req.params.id, req.body)
    ApiResponse.send(res, { data: payment, message: 'Payment refunded' })
  }),

  capture: asyncHandler(async (req, res) => {
    const payment = await paymentService.capture(req.params.id)
    ApiResponse.send(res, { data: payment, message: 'Payment captured' })
  }),

  cancel: asyncHandler(async (req, res) => {
    const payment = await paymentService.cancel(req.params.id)
    ApiResponse.send(res, { data: payment, message: 'Payment cancelled' })
  }),

  getReceipt: asyncHandler(async (req, res) => {
    const receipt = await paymentService.getReceipt(req.params.id)
    ApiResponse.send(res, { data: receipt })
  }),
}
