import { getPool } from '../../database/connection.js'

/**
 * @typedef {object} UserRoleGrant
 * @property {string} userId
 * @property {string} roleId
 *
 * Global (not merchant-scoped) role grants — see migration 0021. Used for
 * roles like Platform Admin that apply platform-wide, not to any single
 * merchant. Merchant-scoped roles live in merchant_staff instead (see
 * ../merchantStaff/merchantStaff.repository.js). Read-only here: granting a
 * platform role is an operator action, not an API surface this phase
 * exposes.
 */

export class UserRoleRepository {
  async findRoleIdsForUser(userId, client = getPool()) {
    const result = await client.query('SELECT role_id FROM user_roles WHERE user_id = $1', [userId])

    return result.rows.map((row) => row.role_id)
  }

  async findRoleNamesForUser(userId, client = getPool()) {
    const result = await client.query(
      `SELECT r.name
       FROM user_roles ur
       JOIN roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
       WHERE ur.user_id = $1`,
      [userId],
    )

    return result.rows.map((row) => row.name)
  }
}

export const userRoleRepository = new UserRoleRepository()
