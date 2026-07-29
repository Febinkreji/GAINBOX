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
}

export const merchantStaffRepository = new MerchantStaffRepository()
