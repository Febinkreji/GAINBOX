import { getPool } from '../../database/connection.js'
import { notImplemented } from '../../utils/notImplemented.js'

/**
 * @typedef {object} User
 * @property {string} id
 * @property {string} firebaseUid
 * @property {string} email
 * @property {string|null} displayName
 * @property {string} status - "active" | "invited" | "disabled"
 * @property {string} createdAt
 * @property {string} updatedAt
 *
 * Represents any authenticated identity — merchant owner, merchant staff, or
 * (in the future) a customer on the Customer App. Which merchant(s) a user
 * belongs to, and with what role, lives in the merchant_staff join — see
 * modules/role. `firebaseUid` is an external identity mapping, not the
 * business identifier — see modules/identity/identitySync.service.js.
 */

const SELECT_COLUMNS = `
  id, firebase_uid, email, display_name, status, created_at, updated_at
`

function mapRow(row) {
  if (!row) return null

  return {
    id: row.id,
    firebaseUid: row.firebase_uid,
    email: row.email,
    displayName: row.display_name,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export class UserRepository {
  async findById(id, client = getPool()) {
    const result = await client.query(
      `SELECT ${SELECT_COLUMNS} FROM users WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    )

    return mapRow(result.rows[0])
  }

  async findByFirebaseUid(firebaseUid, client = getPool()) {
    const result = await client.query(
      `SELECT ${SELECT_COLUMNS} FROM users WHERE firebase_uid = $1 AND deleted_at IS NULL`,
      [firebaseUid],
    )

    return mapRow(result.rows[0])
  }

  /**
   * Merchant Onboarding's "does this owner already have an account"
   * check — email is CITEXT (case-insensitive), matching how Identity
   * Sync's own uniqueness guarantee already works.
   */
  async findByEmail(email, client = getPool()) {
    const result = await client.query(
      `SELECT ${SELECT_COLUMNS} FROM users WHERE email = $1 AND deleted_at IS NULL`,
      [email],
    )

    return mapRow(result.rows[0])
  }

  /**
   * Development Bootstrap support (see
   * src/bootstrap/platformAdminBootstrap.js) — finds a placeholder user row
   * created for a known email before that person has ever signed in
   * (firebase_uid IS NULL, see migration 0026). Identity Sync calls this
   * only after findByFirebaseUid has already missed, to decide whether to
   * link this sign-in to an existing unclaimed row instead of creating a
   * new one — see identitySync.service.js's "claim" branch.
   */
  async findUnclaimedByEmail(email, client = getPool()) {
    const result = await client.query(
      `SELECT ${SELECT_COLUMNS} FROM users WHERE email = $1 AND firebase_uid IS NULL AND deleted_at IS NULL`,
      [email],
    )

    return mapRow(result.rows[0])
  }

  async create(data, client = getPool()) {
    const result = await client.query(
      `INSERT INTO users (firebase_uid, email, display_name)
       VALUES ($1, $2, $3)
       RETURNING ${SELECT_COLUMNS}`,
      [data.firebaseUid, data.email, data.displayName ?? null],
    )

    return mapRow(result.rows[0])
  }

  async update(id, data, client = getPool()) {
    const fieldMap = {
      email: 'email',
      displayName: 'display_name',
      status: 'status',
      // Every existing caller updates email/displayName/status only —
      // firebaseUid is added solely for identitySync.service.js's bootstrap
      // "claim" path (linking a real Firebase UID to a placeholder row
      // that was created with none). No other code path should ever pass
      // this key.
      firebaseUid: 'firebase_uid',
    }

    const assignments = []
    const values = []
    let index = 1

    for (const [key, column] of Object.entries(fieldMap)) {
      if (data[key] !== undefined) {
        assignments.push(`${column} = $${index}`)
        values.push(data[key])
        index += 1
      }
    }

    values.push(id)

    const result = await client.query(
      `UPDATE users
       SET ${assignments.join(', ')}
       WHERE id = $${index} AND deleted_at IS NULL
       RETURNING ${SELECT_COLUMNS}`,
      values,
    )

    return mapRow(result.rows[0])
  }

  // Listing/removing arbitrary users is an admin-facing capability this
  // task doesn't cover (it borders on Platform Admin, explicitly out of
  // scope) — left as an explicit not-implemented, same as before, rather
  // than silently degrading to a generic "not a function" error.
  async findAll(_filters, _pagination) {
    notImplemented('UserRepository.findAll')
  }

  async delete(_id) {
    notImplemented('UserRepository.delete')
  }
}

export const userRepository = new UserRepository()
