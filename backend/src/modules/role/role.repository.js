import { BaseRepository } from '../../database/BaseRepository.js'

/**
 * @typedef {object} Role
 * @property {string} id
 * @property {string} name - e.g. "merchant-owner" | "merchant-staff" | "platform-admin" | "customer"
 *
 * Deliberately its own domain, decoupled from User, so merchant-specific
 * custom roles can be introduced later without touching the User entity.
 */
export class RoleRepository extends BaseRepository {
  constructor() {
    super('roles')
  }
}

export const roleRepository = new RoleRepository()
