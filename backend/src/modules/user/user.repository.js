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
