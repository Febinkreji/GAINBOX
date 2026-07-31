import { getPool } from '../../database/connection.js'

/**
 * @typedef {object} Payment
 * @property {string} id
 * @property {string} branchId
 * @property {string|null} deviceId
 * @property {string|null} subscriptionId
 * @property {number} amount
 * @property {string} currency - ISO 4217 alpha code, e.g. "INR"
 * @property {string} purpose - "membership" | "meal-plan" | "consultation" | "other"
 * @property {string} status - "pending" | "paid" | "refunded" | "cancelled" | "failed"
 * @property {string} createdAt
 * @property {string} updatedAt
 *
 * No `deletedAt` — migration 0013 deliberately gives payments no
 * `deleted_at` column: financial records are immutable for audit/
 * compliance, and lifecycle is expressed entirely through `status`.
 */

const SORT_COLUMNS = {
  createdAt: 'created_at',
  amount: 'amount',
  status: 'status',
}

// Same shape as merchant/branch/device repositories' LIST_WHERE_CLAUSE: one
// static, fully parameterized WHERE clause shared by findAll/count. No
// `deleted_at IS NULL` guard — payments have no such column. $5 is the
// tenant-scoping filter Authorization supplies, same subquery-via-branches
// approach as device.repository.js (payments have no merchant_id column of
// their own, only branch_id).
const LIST_WHERE_CLAUSE = `
  ($1::uuid IS NULL OR branch_id = $1)
  AND ($2::uuid IS NULL OR device_id = $2)
  AND ($3::varchar IS NULL OR status = $3)
  AND ($4::varchar IS NULL OR purpose = $4)
  AND ($5::uuid[] IS NULL OR branch_id IN (SELECT id FROM branches WHERE merchant_id = ANY($5::uuid[])))
`

const SELECT_COLUMNS = `
  id, branch_id, device_id, subscription_id, amount, currency, purpose, status,
  created_at, updated_at
`

function mapRow(row) {
  if (!row) return null

  return {
    id: row.id,
    branchId: row.branch_id,
    deviceId: row.device_id,
    subscriptionId: row.subscription_id,
    amount: Number(row.amount),
    currency: row.currency,
    purpose: row.purpose,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export class PaymentRepository {
  async findById(id, client = getPool()) {
    const result = await client.query(`SELECT ${SELECT_COLUMNS} FROM payments WHERE id = $1`, [id])

    return mapRow(result.rows[0])
  }

  async findAll(filters = {}, pagination = {}, client = getPool()) {
    const sortColumn = SORT_COLUMNS[filters.sortBy] ?? SORT_COLUMNS.createdAt
    const sortOrder = filters.sortOrder === 'asc' ? 'ASC' : 'DESC'
    const pageSize = pagination.pageSize ?? 20
    const offset = pagination.offset ?? 0

    const result = await client.query(
      `SELECT ${SELECT_COLUMNS}
       FROM payments
       WHERE ${LIST_WHERE_CLAUSE}
       ORDER BY ${sortColumn} ${sortOrder}
       LIMIT $6 OFFSET $7`,
      [
        filters.branchId ?? null,
        filters.deviceId ?? null,
        filters.status ?? null,
        filters.purpose ?? null,
        filters.merchantIds ?? null,
        pageSize,
        offset,
      ],
    )

    return result.rows.map(mapRow)
  }

  async count(filters = {}, client = getPool()) {
    const result = await client.query(`SELECT COUNT(*)::int AS total FROM payments WHERE ${LIST_WHERE_CLAUSE}`, [
      filters.branchId ?? null,
      filters.deviceId ?? null,
      filters.status ?? null,
      filters.purpose ?? null,
      filters.merchantIds ?? null,
    ])

    return result.rows[0].total
  }

  async create(data, client = getPool()) {
    const result = await client.query(
      `INSERT INTO payments (branch_id, device_id, subscription_id, amount, currency, purpose)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING ${SELECT_COLUMNS}`,
      [
        data.branchId,
        data.deviceId ?? null,
        data.subscriptionId ?? null,
        data.amount,
        data.currency ?? 'INR',
        data.purpose,
      ],
    )

    return mapRow(result.rows[0])
  }

  async update(id, data, client = getPool()) {
    const fieldMap = {
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
      `UPDATE payments
       SET ${assignments.join(', ')}
       WHERE id = $${index}
       RETURNING ${SELECT_COLUMNS}`,
      values,
    )

    return mapRow(result.rows[0])
  }

  /**
   * Hard delete — payments have no `deleted_at` column, and migration
   * 0013's own comment states financial records are immutable for audit/
   * compliance, with lifecycle expressed entirely through `status`. No
   * route in payment.routes.js calls this today. Implemented for interface
   * parity with the other repositories' `delete`/`softDelete`, not because
   * removing a payment row is an intended operation — flagging the
   * conflict rather than silently picking a side.
   */
  async delete(id, client = getPool()) {
    const result = await client.query(`DELETE FROM payments WHERE id = $1 RETURNING id`, [id])

    return result.rows[0] ?? null
  }
}

export const paymentRepository = new PaymentRepository()
