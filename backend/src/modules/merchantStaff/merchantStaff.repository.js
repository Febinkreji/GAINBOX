import { getPool } from '../../database/connection.js'

/**
 * @typedef {object} MerchantStaffAssignment
 * @property {string} id
 * @property {string} merchantId
 * @property {string} userId
 * @property {string} roleId
 *
 * Read-only from Authorization's side — see migration 0008. Inviting,
 * removing, or re-hiring staff (the write side of this table) is a future
 * Merchant Portal feature, not part of this phase; only the queries
 * Authorization needs to make access decisions live here.
 */

export class MerchantStaffRepository {
  async findActiveAssignment(userId, merchantId, client = getPool()) {
    const result = await client.query(
      `SELECT id, merchant_id, user_id, role_id
       FROM merchant_staff
       WHERE user_id = $1 AND merchant_id = $2 AND status = 'active' AND deleted_at IS NULL`,
      [userId, merchantId],
    )

    return result.rows[0] ?? null
  }

  /** Returns null-free list of merchant ids this user is actively staffed at — the input to tenant-scoped list filtering. */
  async findActiveMerchantIdsForUser(userId, client = getPool()) {
    const result = await client.query(
      `SELECT DISTINCT merchant_id
       FROM merchant_staff
       WHERE user_id = $1 AND status = 'active' AND deleted_at IS NULL`,
      [userId],
    )

    return result.rows.map((row) => row.merchant_id)
  }

  async findActiveRoleIdsForUser(userId, client = getPool()) {
    const result = await client.query(
      `SELECT DISTINCT role_id
       FROM merchant_staff
       WHERE user_id = $1 AND status = 'active' AND deleted_at IS NULL`,
      [userId],
    )

    return result.rows.map((row) => row.role_id)
  }

  async findActiveRoleNamesForUser(userId, client = getPool()) {
    const result = await client.query(
      `SELECT DISTINCT r.name
       FROM merchant_staff ms
       JOIN roles r ON r.id = ms.role_id AND r.deleted_at IS NULL
       WHERE ms.user_id = $1 AND ms.status = 'active' AND ms.deleted_at IS NULL`,
      [userId],
    )

    return result.rows.map((row) => row.name)
  }

  /**
   * Full staff roster for one merchant, with the display fields Platform
   * Control Center's Merchant Details view needs — a join Authorization's
   * own queries never required. Includes 'removed' as well as 'active'
   * assignments (not just active): an ops view benefits from the same
   * "removed, then re-hired" history merchant_staff was designed to keep,
   * not just current state.
   */
  async findRosterForMerchant(merchantId, client = getPool()) {
    const result = await client.query(
      `SELECT ms.id, ms.user_id, u.display_name, u.email, r.name AS role_name, ms.status, ms.created_at
       FROM merchant_staff ms
       JOIN users u ON u.id = ms.user_id AND u.deleted_at IS NULL
       JOIN roles r ON r.id = ms.role_id AND r.deleted_at IS NULL
       WHERE ms.merchant_id = $1 AND ms.deleted_at IS NULL
       ORDER BY ms.created_at ASC`,
      [merchantId],
    )

    return result.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      displayName: row.display_name,
      email: row.email,
      roleName: row.role_name,
      status: row.status,
      createdAt: row.created_at,
    }))
  }

  /**
   * Every merchant this user has ever been staffed at, with the merchant
   * and role names — Platform Control Center's User Details view. Same
   * "include removed, not just active" choice as findRosterForMerchant.
   */
  async findAssignmentsForUser(userId, client = getPool()) {
    const result = await client.query(
      `SELECT ms.merchant_id, m.business_name, r.name AS role_name, ms.status, ms.created_at
       FROM merchant_staff ms
       JOIN merchants m ON m.id = ms.merchant_id AND m.deleted_at IS NULL
       JOIN roles r ON r.id = ms.role_id AND r.deleted_at IS NULL
       WHERE ms.user_id = $1 AND ms.deleted_at IS NULL
       ORDER BY ms.created_at ASC`,
      [userId],
    )

    return result.rows.map((row) => ({
      merchantId: row.merchant_id,
      businessName: row.business_name,
      roleName: row.role_name,
      status: row.status,
      createdAt: row.created_at,
    }))
  }
}

export const merchantStaffRepository = new MerchantStaffRepository()
