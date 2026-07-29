import { getPool } from '../../database/connection.js'

/**
 * @typedef {object} MembershipPlan
 * @property {string} id
 * @property {string} merchantId
 * @property {string} name - e.g. "Weight Loss Package", "Muscle Gain Package"
 * @property {string|null} description
 * @property {string} price - NUMERIC comes back from `pg` as a string by
 *   design: money must never pass through a JS float, so this repository
 *   never parses it to a Number.
 * @property {string} currency - ISO 4217 code
 * @property {string} billingCycle - "one-time" | "monthly" | "quarterly" | "yearly"
 * @property {string} status - "active" | "archived"
 * @property {string|null} createdBy
 * @property {string|null} updatedBy
 * @property {string} createdAt
 * @property {string} updatedAt
 *
 * Pure GainBox domain concept — Surfboard has no notion of a membership
 * plan, so there is no provider placeholder for this module.
 */

const SORT_COLUMNS = {
  name: 'name',
  price: 'price',
  createdAt: 'created_at',
  status: 'status',
}

// $4 is the tenant-scoping filter Authorization supplies (see
// authorizationService.getAccessibleMerchantIds) — null for an
// unrestricted platform-admin query, an array otherwise.
const LIST_WHERE_CLAUSE = `
  deleted_at IS NULL
  AND ($1::uuid IS NULL OR merchant_id = $1)
  AND ($2::varchar IS NULL OR status = $2)
  AND ($3::text IS NULL OR name ILIKE '%' || $3 || '%')
  AND ($4::uuid[] IS NULL OR merchant_id = ANY($4::uuid[]))
`

const SELECT_COLUMNS = `
  id, merchant_id, name, description, price, currency, billing_cycle,
  status, created_by, updated_by, created_at, updated_at
`

function mapRow(row) {
  if (!row) return null

  return {
    id: row.id,
    merchantId: row.merchant_id,
    name: row.name,
    description: row.description,
    price: row.price,
    currency: row.currency,
    billingCycle: row.billing_cycle,
    status: row.status,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export class MembershipPlanRepository {
  async findById(id, client = getPool()) {
    const result = await client.query(
      `SELECT ${SELECT_COLUMNS} FROM membership_plans WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    )

    return mapRow(result.rows[0])
  }

  async findAll(filters, pagination, client = getPool()) {
    const sortColumn = SORT_COLUMNS[filters.sortBy] ?? SORT_COLUMNS.createdAt
    const sortOrder = filters.sortOrder === 'asc' ? 'ASC' : 'DESC'

    const result = await client.query(
      `SELECT ${SELECT_COLUMNS}
       FROM membership_plans
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
      `SELECT COUNT(*)::int AS total FROM membership_plans WHERE ${LIST_WHERE_CLAUSE}`,
      [filters.merchantId ?? null, filters.status ?? null, filters.search ?? null, filters.merchantIds ?? null],
    )

    return result.rows[0].total
  }

  async create(data, client = getPool()) {
    const result = await client.query(
      `INSERT INTO membership_plans (merchant_id, name, description, price, currency, billing_cycle, created_by)
       VALUES ($1, $2, $3, $4, COALESCE($5, 'INR'), $6, $7)
       RETURNING ${SELECT_COLUMNS}`,
      [
        data.merchantId,
        data.name,
        data.description ?? null,
        data.price,
        data.currency ?? null,
        data.billingCycle,
        data.createdBy ?? null,
      ],
    )

    return mapRow(result.rows[0])
  }

  async update(id, data, client = getPool()) {
    const fieldMap = {
      name: 'name',
      description: 'description',
      price: 'price',
      currency: 'currency',
      billingCycle: 'billing_cycle',
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
      `UPDATE membership_plans
       SET ${assignments.join(', ')}
       WHERE id = $${index} AND deleted_at IS NULL
       RETURNING ${SELECT_COLUMNS}`,
      values,
    )

    return mapRow(result.rows[0])
  }

  async softDelete(id, client = getPool()) {
    const result = await client.query(
      `UPDATE membership_plans SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL RETURNING id`,
      [id],
    )

    return result.rows[0] ?? null
  }
}

export const membershipPlanRepository = new MembershipPlanRepository()
