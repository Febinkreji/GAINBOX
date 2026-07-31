import { getPool } from '../../database/connection.js'

/**
 * @typedef {object} Merchant
 * @property {string} id
 * @property {string} businessName
 * @property {string|null} legalName
 * @property {string} businessType
 * @property {string} status - "pending" | "active" | "suspended"
 * @property {string|null} contactEmail
 * @property {string|null} contactPhone
 * @property {string|null} address
 * @property {string|null} timezone
 * @property {string} currency - ISO 4217 code
 * @property {string|null} country
 * @property {string|null} corporateId - business registration number, required by Surfboard's Create Merchant API
 * @property {string|null} createdBy
 * @property {string|null} updatedBy
 * @property {string} createdAt
 * @property {string} updatedAt
 *
 * No `surfboardMerchantId` column by design — see provider_links
 * (migration 0016) and merchant.providers.js. legalName/address/timezone/
 * currency/country were added for Merchant Onboarding (migration 0024).
 * corporateId was added for Surfboard Merchant Creation (migration 0029) —
 * no format validation here, since the required format varies by country
 * and Surfboard itself validates it on their side.
 */

const SORT_COLUMNS = {
  businessName: 'business_name',
  createdAt: 'created_at',
  status: 'status',
}

// Shared between findAll/count so the two queries can never drift apart on
// what counts as a "match". All three filters are optional: the
// `$n::type IS NULL OR ...` shape lets one static, fully parameterized
// query handle every combination without building the WHERE clause as a
// string (which is how filter/search inputs would ever reach raw SQL).
const LIST_WHERE_CLAUSE = `
  deleted_at IS NULL
  AND ($1::varchar IS NULL OR status = $1)
  AND ($2::varchar IS NULL OR business_type = $2)
  AND ($3::text IS NULL OR business_name ILIKE '%' || $3 || '%' OR contact_email ILIKE '%' || $3 || '%')
`

const SELECT_COLUMNS = `
  id, business_name, legal_name, business_type, status, contact_email, contact_phone,
  address, timezone, currency, country, corporate_id, created_by, updated_by, created_at, updated_at
`

function mapRow(row) {
  if (!row) return null

  return {
    id: row.id,
    businessName: row.business_name,
    legalName: row.legal_name,
    businessType: row.business_type,
    status: row.status,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    address: row.address,
    timezone: row.timezone,
    currency: row.currency,
    country: row.country,
    corporateId: row.corporate_id,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export class MerchantRepository {
  async findById(id, client = getPool()) {
    const result = await client.query(
      `SELECT ${SELECT_COLUMNS} FROM merchants WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    )

    return mapRow(result.rows[0])
  }

  async findAll(filters, pagination, client = getPool()) {
    const sortColumn = SORT_COLUMNS[filters.sortBy] ?? SORT_COLUMNS.createdAt
    const sortOrder = filters.sortOrder === 'asc' ? 'ASC' : 'DESC'

    const result = await client.query(
      `SELECT ${SELECT_COLUMNS}
       FROM merchants
       WHERE ${LIST_WHERE_CLAUSE}
       ORDER BY ${sortColumn} ${sortOrder}
       LIMIT $4 OFFSET $5`,
      [filters.status ?? null, filters.businessType ?? null, filters.search ?? null, pagination.pageSize, pagination.offset],
    )

    return result.rows.map(mapRow)
  }

  async count(filters, client = getPool()) {
    const result = await client.query(
      `SELECT COUNT(*)::int AS total FROM merchants WHERE ${LIST_WHERE_CLAUSE}`,
      [filters.status ?? null, filters.businessType ?? null, filters.search ?? null],
    )

    return result.rows[0].total
  }

  async create(data, client = getPool()) {
    const result = await client.query(
      `INSERT INTO merchants (business_name, legal_name, business_type, contact_email, contact_phone, address, timezone, currency, country, corporate_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, 'INR'), $9, $10, $11)
       RETURNING ${SELECT_COLUMNS}`,
      [
        data.businessName,
        data.legalName ?? null,
        data.businessType,
        data.contactEmail ?? null,
        data.contactPhone ?? null,
        data.address ?? null,
        data.timezone ?? null,
        data.currency ?? null,
        data.country ?? null,
        data.corporateId ?? null,
        data.createdBy ?? null,
      ],
    )

    return mapRow(result.rows[0])
  }

  async update(id, data, client = getPool()) {
    const fieldMap = {
      businessName: 'business_name',
      legalName: 'legal_name',
      businessType: 'business_type',
      status: 'status',
      contactEmail: 'contact_email',
      contactPhone: 'contact_phone',
      address: 'address',
      timezone: 'timezone',
      currency: 'currency',
      country: 'country',
      corporateId: 'corporate_id',
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
      `UPDATE merchants
       SET ${assignments.join(', ')}
       WHERE id = $${index} AND deleted_at IS NULL
       RETURNING ${SELECT_COLUMNS}`,
      values,
    )

    return mapRow(result.rows[0])
  }

  async softDelete(id, client = getPool()) {
    const result = await client.query(
      `UPDATE merchants SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL RETURNING id`,
      [id],
    )

    return result.rows[0] ?? null
  }
}

export const merchantRepository = new MerchantRepository()
