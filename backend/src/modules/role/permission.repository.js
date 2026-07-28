import { BaseRepository } from '../../database/BaseRepository.js'

/**
 * @typedef {object} Permission
 * @property {string} id
 * @property {string} name - e.g. "branch:create" | "payment:refund"
 *
 * Many-to-many with Role via a role_permissions join.
 */
export class PermissionRepository extends BaseRepository {
  constructor() {
    super('permissions')
  }
}

export const permissionRepository = new PermissionRepository()
