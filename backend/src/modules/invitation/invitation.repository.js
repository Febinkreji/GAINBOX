import { getPool } from '../../database/connection.js'

/**
 * @typedef {object} MerchantInvitation
 * @property {string} id
 * @property {string} merchantId
 * @property {string} businessName
 * @property {string} merchantStatus - "pending" | "active" | "suspended" — the merchant's own lifecycle status (see merchant module), not the invitation's
 * @property {string} email
 * @property {string|null} displayName
 * @property {string} roleId
 * @property {string} role - role name, e.g. "merchant-owner"
 * @property {string} status - "pending" | "accepted" | "expired" | "revoked"
 * @property {string} expiresAt
 * @property {string|null} acceptedAt
 * @property {string|null} createdBy
 * @property {string} createdAt
 * @property {string} updatedAt
 *
 * `token`/`tokenHash` are deliberately NOT part of this shape — the
 * plaintext token is never stored (see invitationToken.js), and the hash
 * is never returned to any caller once written (findByTokenHash below is
 * the only method that reads it, and only to compare, not to expose it).
 */

const SORT_COLUMNS = {
  createdAt: 'mi.created_at',
  expiresAt: 'mi.expires_at',
  status: 'mi.status',
  email: 'mi.email',
}

const LIST_WHERE_CLAUSE = `
  ($1::uuid IS NULL OR mi.merchant_id = $1)
  AND ($2::varchar IS NULL OR mi.status = $2)
  AND ($3::text IS NULL OR mi.email ILIKE '%' || $3 || '%' OR mi.display_name ILIKE '%' || $3 || '%')
  AND ($4::varchar IS NULL OR r.name = $4)
`

const SELECT_COLUMNS = `
  mi.id, mi.merchant_id, m.business_name, m.status AS merchant_status, mi.email, mi.display_name, mi.role_id,
  r.name AS role_name, mi.status, mi.expires_at, mi.accepted_at, mi.created_by, mi.created_at, mi.updated_at
`

const FROM_JOIN = `
  FROM merchant_invitations mi
  JOIN merchants m ON m.id = mi.merchant_id
  JOIN roles r ON r.id = mi.role_id
`

function mapRow(row) {
  if (!row) return null

  return {
    id: row.id,
    merchantId: row.merchant_id,
    businessName: row.business_name,
    merchantStatus: row.merchant_status,
    email: row.email,
    displayName: row.display_name,
    roleId: row.role_id,
    role: row.role_name,
    status: row.status,
    expiresAt: row.expires_at,
    acceptedAt: row.accepted_at,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export class InvitationRepository {
  async findById(id, client = getPool()) {
    const result = await client.query(`SELECT ${SELECT_COLUMNS} ${FROM_JOIN} WHERE mi.id = $1`, [id])

    return mapRow(result.rows[0])
  }

  /**
   * Feature 5's lookup path — compares against `token_hash`, never the
   * plaintext (which this repository never even receives; see
   * invitation.service.js, which hashes before calling this).
   */
  async findByTokenHash(tokenHash, client = getPool()) {
    const result = await client.query(`SELECT ${SELECT_COLUMNS} ${FROM_JOIN} WHERE mi.token_hash = $1`, [tokenHash])

    return mapRow(result.rows[0])
  }

  async findAll(filters, pagination, client = getPool()) {
    const sortColumn = SORT_COLUMNS[filters.sortBy] ?? SORT_COLUMNS.createdAt
    const sortOrder = filters.sortOrder === 'asc' ? 'ASC' : 'DESC'

    const result = await client.query(
      `SELECT ${SELECT_COLUMNS}
       ${FROM_JOIN}
       WHERE ${LIST_WHERE_CLAUSE}
       ORDER BY ${sortColumn} ${sortOrder}
       LIMIT $5 OFFSET $6`,
      [
        filters.merchantId ?? null,
        filters.status ?? null,
        filters.search ?? null,
        filters.role ?? null,
        pagination.pageSize,
        pagination.offset,
      ],
    )

    return result.rows.map(mapRow)
  }

  async count(filters, client = getPool()) {
    const result = await client.query(
      `SELECT COUNT(*)::int AS total ${FROM_JOIN} WHERE ${LIST_WHERE_CLAUSE}`,
      [filters.merchantId ?? null, filters.status ?? null, filters.search ?? null, filters.role ?? null],
    )

    return result.rows[0].total
  }

  async create(data, client = getPool()) {
    const result = await client.query(
      `INSERT INTO merchant_invitations (merchant_id, email, display_name, role_id, token_hash, expires_at, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [data.merchantId, data.email, data.displayName ?? null, data.roleId, data.tokenHash, data.expiresAt, data.createdBy ?? null],
    )

    return this.findById(result.rows[0].id, client)
  }

  async update(id, data, client = getPool()) {
    const fieldMap = {
      status: 'status',
      tokenHash: 'token_hash',
      expiresAt: 'expires_at',
      acceptedAt: 'accepted_at',
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

    await client.query(`UPDATE merchant_invitations SET ${assignments.join(', ')} WHERE id = $${index}`, values)

    return this.findById(id, client)
  }
}

export const invitationRepository = new InvitationRepository()
