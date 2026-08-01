import { getPool } from '../../database/connection.js'

/**
 * @typedef {object} Branch
 * @property {string} id
 * @property {string} merchantId
 * @property {string} name
 * @property {string|null} address
 * @property {string} city
 * @property {string|null} state
 * @property {string|null} country
 * @property {string|null} postalCode
 * @property {string|null} phoneCode - international dialing code, required by Surfboard's Create Store API
 * @property {string|null} phoneNumber - required by Surfboard's Create Store API
 * @property {string} status - "active" | "inactive"
 * @property {string|null} createdBy
 * @property {string|null} updatedBy
 * @property {string} createdAt
 * @property {string} updatedAt
 *
 * Surfboard calls this concept a "Store" — the rename happens at the
 * integration boundary (surfboardStoreAdapter), not here. phoneCode/
 * phoneNumber were added for Surfboard Store Capabilities (migration 0030)
 * — no format validation here, Surfboard validates on its own side, same
 * pattern as merchants.corporate_id.
 */

const SORT_COLUMNS = {
  name: 'name',
  createdAt: 'created_at',
  status: 'status',
}

// Same shape as merchant.repository.js's LIST_WHERE_CLAUSE: one static,
// fully parameterized WHERE clause shared by findAll/count so the two
// queries can never disagree on what counts as a "match". $4 is the
// tenant-scoping filter Authorization supplies (see
// authorizationService.getAccessibleMerchantIds) — null for an
// unrestricted platform-admin query, an array otherwise. Distinct from $1
// (`merchantId`), which is the caller's own optional "narrow to this one
// merchant" query filter — both apply together.
const LIST_WHERE_CLAUSE = `
  deleted_at IS NULL
  AND ($1::uuid IS NULL OR merchant_id = $1)
  AND ($2::varchar IS NULL OR status = $2)
  AND ($3::text IS NULL OR name ILIKE '%' || $3 || '%' OR city ILIKE '%' || $3 || '%')
  AND ($4::uuid[] IS NULL OR merchant_id = ANY($4::uuid[]))
`

const SELECT_COLUMNS = `
  id, merchant_id, name, address, city, state, country, postal_code,
  phone_code, phone_number, status, created_by, updated_by, created_at, updated_at
`

function mapRow(row) {
  if (!row) return null

  return {
    id: row.id,
    merchantId: row.merchant_id,
    name: row.name,
    address: row.address,
    city: row.city,
    state: row.state,
    country: row.country,
    postalCode: row.postal_code,
    phoneCode: row.phone_code,
    phoneNumber: row.phone_number,
    status: row.status,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export class BranchRepository {
  async findById(id, client = getPool()) {
    const result = await client.query(
      `SELECT ${SELECT_COLUMNS} FROM branches WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    )

    return mapRow(result.rows[0])
  }

  async findAll(filters, pagination, client = getPool()) {
    const sortColumn = SORT_COLUMNS[filters.sortBy] ?? SORT_COLUMNS.createdAt
    const sortOrder = filters.sortOrder === 'asc' ? 'ASC' : 'DESC'

    const result = await client.query(
      `SELECT ${SELECT_COLUMNS}
       FROM branches
       WHERE ${LIST_WHERE_CLAUSE}
       ORDER BY ${sortColumn} ${sortOrder}
       LIMIT $5 OFFSET $6`,
      [
        filters.merchantId ?? null,
        filters.status ?? null,
        filters.search ?? null,
        filters.merchantIds ?? null,
        pagination.pageSize,
        pagination.offset,
      ],
    )

    return result.rows.map(mapRow)
  }

  async count(filters, client = getPool()) {
    const result = await client.query(
      `SELECT COUNT(*)::int AS total FROM branches WHERE ${LIST_WHERE_CLAUSE}`,
      [filters.merchantId ?? null, filters.status ?? null, filters.search ?? null, filters.merchantIds ?? null],
    )

    return result.rows[0].total
  }

  async create(data, client = getPool()) {
    const result = await client.query(
      `INSERT INTO branches (merchant_id, name, address, city, state, country, postal_code, phone_code, phone_number, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING ${SELECT_COLUMNS}`,
      [
        data.merchantId,
        data.name,
        data.address ?? null,
        data.city,
        data.state ?? null,
        data.country ?? null,
        data.postalCode ?? null,
        data.phoneCode ?? null,
        data.phoneNumber ?? null,
        data.createdBy ?? null,
      ],
    )

    return mapRow(result.rows[0])
  }

  async update(id, data, client = getPool()) {
    const fieldMap = {
      name: 'name',
      address: 'address',
      city: 'city',
      state: 'state',
      country: 'country',
      postalCode: 'postal_code',
      phoneCode: 'phone_code',
      phoneNumber: 'phone_number',
      status: 'status',
      updatedBy: 'updated_by',
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
      `UPDATE branches
       SET ${assignments.join(', ')}
       WHERE id = $${index} AND deleted_at IS NULL
       RETURNING ${SELECT_COLUMNS}`,
      values,
    )

    return mapRow(result.rows[0])
  }

  async softDelete(id, client = getPool()) {
    const result = await client.query(
      `UPDATE branches SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL RETURNING id`,
      [id],
    )

    return result.rows[0] ?? null
  }
}

export const branchRepository = new BranchRepository()
