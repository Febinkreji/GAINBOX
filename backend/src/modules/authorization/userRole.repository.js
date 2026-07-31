import { getPool } from '../../database/connection.js'

/**
 * @typedef {object} UserRoleGrant
 * @property {string} userId
 * @property {string} roleId
 *
 * Global (not merchant-scoped) role grants — see migration 0021. Used for
 * roles like Platform Admin that apply platform-wide, not to any single
 * merchant. Merchant-scoped roles live in merchant_staff instead (see
 * ../merchantStaff/merchantStaff.repository.js). Mostly read-only: granting
 * a platform role is an operator action, not an API surface this phase
 * exposes — grantRole() below is the one deliberate exception, used only
 * by the Development Bootstrap module (src/bootstrap/platformAdminBootstrap.js)
 * at startup, never by an HTTP route.
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

  /**
   * Idempotent by construction (ON CONFLICT DO NOTHING against the
   * (user_id, role_id) primary key, see migration 0021) — mirrors
   * role.repository.js's grantPermission exactly. Granting the same role
   * twice is not an error; it's what makes the bootstrap procedure safe to
   * run on every server restart.
   */
  async grantRole(userId, roleId, client = getPool()) {
    await client.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [
      userId,
      roleId,
    ])

    return { userId, roleId }
  }
}

export const userRoleRepository = new UserRoleRepository()
