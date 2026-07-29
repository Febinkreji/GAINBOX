import { getPool } from '../../database/connection.js'

/**
 * @typedef {object} Subscription
 * @property {string} id
 * @property {string} membershipPlanId
 * @property {string} customerId - references a User (customer role)
 * @property {string} status - "active" | "cancelled" | "expired"
 * @property {string} startedAt
 * @property {string|null} cancelledAt
 * @property {string} createdAt
 * @property {string} updatedAt
 *
 * No soft delete (no `deleted_at` column, by design — see migration 0012):
 * `status` already distinguishes "no longer applies" from active, and a
 * cancelled subscription must stay fully visible for billing history.
 */

const SORT_COLUMNS = {
  createdAt: 'created_at',
  startedAt: 'started_at',
  status: 'status',
}

const LIST_WHERE_CLAUSE = `
  ($1::uuid IS NULL OR membership_plan_id = $1)
  AND ($2::uuid IS NULL OR customer_id = $2)
  AND ($3::varchar IS NULL OR status = $3)
`

const SELECT_COLUMNS = `
  id, membership_plan_id, customer_id, status, started_at, cancelled_at,
  created_at, updated_at
`

function mapRow(row) {
  if (!row) return null

  return {
    id: row.id,
    membershipPlanId: row.membership_plan_id,
    customerId: row.customer_id,
    status: row.status,
    startedAt: row.started_at,
    cancelledAt: row.cancelled_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export class SubscriptionRepository {
  async findById(id, client = getPool()) {
    const result = await client.query(`SELECT ${SELECT_COLUMNS} FROM subscriptions WHERE id = $1`, [id])

    return mapRow(result.rows[0])
  }

  async findAll(filters, pagination, client = getPool()) {
    const sortColumn = SORT_COLUMNS[filters.sortBy] ?? SORT_COLUMNS.createdAt
    const sortOrder = filters.sortOrder === 'asc' ? 'ASC' : 'DESC'

    const result = await client.query(
      `SELECT ${SELECT_COLUMNS}
       FROM subscriptions
       WHERE ${LIST_WHERE_CLAUSE}
       ORDER BY ${sortColumn} ${sortOrder}
       LIMIT $4 OFFSET $5`,
      [
        filters.membershipPlanId ?? null,
        filters.customerId ?? null,
        filters.status ?? null,
        pagination.pageSize,
        pagination.offset,
      ],
    )

    return result.rows.map(mapRow)
  }

  async count(filters, client = getPool()) {
    const result = await client.query(
      `SELECT COUNT(*)::int AS total FROM subscriptions WHERE ${LIST_WHERE_CLAUSE}`,
      [filters.membershipPlanId ?? null, filters.customerId ?? null, filters.status ?? null],
    )

    return result.rows[0].total
  }

  async create(data, client = getPool()) {
    const result = await client.query(
      `INSERT INTO subscriptions (membership_plan_id, customer_id)
       VALUES ($1, $2)
       RETURNING ${SELECT_COLUMNS}`,
      [data.membershipPlanId, data.customerId],
    )

    return mapRow(result.rows[0])
  }

  // Only cancels a currently-active subscription — the WHERE clause is the
  // guard against double-cancellation; the service layer checks status
  // first anyway so it can throw a precise ConflictError, but the query
  // itself never silently "re-cancels" a row.
  async cancel(id, client = getPool()) {
    const result = await client.query(
      `UPDATE subscriptions
       SET status = 'cancelled', cancelled_at = now()
       WHERE id = $1 AND status = 'active'
       RETURNING ${SELECT_COLUMNS}`,
      [id],
    )

    return mapRow(result.rows[0])
  }
}

export const subscriptionRepository = new SubscriptionRepository()
