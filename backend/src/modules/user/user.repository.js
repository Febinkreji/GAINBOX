import { BaseRepository } from '../../database/BaseRepository.js'

/**
 * @typedef {object} User
 * @property {string} id
 * @property {string} firebaseUid
 * @property {string} email
 * @property {string} displayName
 * @property {string} status - "active" | "invited" | "disabled"
 *
 * Represents any authenticated identity — merchant owner, merchant staff, or
 * (in the future) a customer on the Customer App. Which merchant(s) a user
 * belongs to, and with what role, lives in the merchant_staff join —
 * see modules/role.
 */
export class UserRepository extends BaseRepository {
  constructor() {
    super('users')
  }
}

export const userRepository = new UserRepository()
