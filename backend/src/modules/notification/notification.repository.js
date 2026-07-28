import { BaseRepository } from '../../database/BaseRepository.js'

/**
 * @typedef {object} Notification
 * @property {string} id
 * @property {string} userId
 * @property {string} type - e.g. "device-offline" | "payment-settled" | "branch-onboarded"
 * @property {string} message
 * @property {string|null} readAt
 *
 * Delivery (email/SMS/push) is its own future provider abstraction, same
 * pattern as Payment/Surfboard — this repository only owns the record of
 * "a notification exists", not how it's delivered.
 */
export class NotificationRepository extends BaseRepository {
  constructor() {
    super('notifications')
  }
}

export const notificationRepository = new NotificationRepository()
