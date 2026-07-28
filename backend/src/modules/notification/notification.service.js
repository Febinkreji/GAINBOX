import { notificationRepository } from './notification.repository.js'

export const notificationService = {
  async listForUser(_userId) {
    return notificationRepository.findAll()
  },

  async create(data) {
    return notificationRepository.create(data)
  },

  async markAsRead(id) {
    return notificationRepository.update(id, { readAt: new Date().toISOString() })
  },
}
