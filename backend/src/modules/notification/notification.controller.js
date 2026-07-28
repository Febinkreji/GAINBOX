import { asyncHandler } from '../../utils/asyncHandler.js'
import { ApiResponse } from '../../utils/ApiResponse.js'
import { notificationService } from './notification.service.js'

export const notificationController = {
  list: asyncHandler(async (req, res) => {
    const notifications = await notificationService.listForUser(req.user.id)
    ApiResponse.send(res, { data: notifications })
  }),

  create: asyncHandler(async (req, res) => {
    const notification = await notificationService.create(req.body)
    ApiResponse.send(res, { statusCode: 201, data: notification, message: 'Notification created' })
  }),

  markAsRead: asyncHandler(async (req, res) => {
    const notification = await notificationService.markAsRead(req.params.id)
    ApiResponse.send(res, { data: notification, message: 'Notification marked as read' })
  }),
}
