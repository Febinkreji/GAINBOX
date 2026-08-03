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
  payment_method, created_at, updated_at
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
    paymentMethod: row.payment_method,
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
      // Phase 11 — Integrated Demo Data: createdAt is optional and
      // COALESCEs to the exact same `now()` default every existing caller
      // already gets — only demoDataService.generateForMerchant() ever
      // passes it, to spread demo payments across real past months instead
      // of one timestamp spike.
      `INSERT INTO payments (branch_id, device_id, subscription_id, amount, currency, purpose, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, now()))
       RETURNING ${SELECT_COLUMNS}`,
      [
        data.branchId,
        data.deviceId ?? null,
        data.subscriptionId ?? null,
        data.amount,
        data.currency ?? 'INR',
        data.purpose,
        data.createdAt ?? null,
      ],
    )

    return mapRow(result.rows[0])
  }

  async update(id, data, client = getPool()) {
    const fieldMap = {
      status: 'status',
      // Phase 9 — Membership Checkout & Sales. Column already existed
      // (migration 0013) and create() already accepted it; only update()
      // was missing it — used to retroactively link a payment to the
      // subscription it funded, once that subscription exists.
      subscriptionId: 'subscription_id',
      // Phase 10 — Platform Admin. Real Surfboard data (payment.service.js's
      // getStatus() already resolves this on every poll) — now persisted
      // instead of discarded, see migration 0034.
      paymentMethod: 'payment_method',
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
   * Atomic idempotency guard for createSubscription() (membership.service.js):
   * two concurrent requests reacting to the same payment turning 'paid'
   * (HostedCheckoutModal's poll in the original tab vs. CheckoutCallback in
   * the new tab "Open Checkout" opens) must not both win the link. The
   * `WHERE subscription_id IS NULL` makes this a single atomic check-and-set
   * — only the first caller's UPDATE actually matches a row and returns one;
   * the loser gets `null` back and knows to discard its own subscription
   * instead of leaving two live ones for one payment.
   */
  async linkSubscriptionIfUnset(id, subscriptionId, client = getPool()) {
    const result = await client.query(
      `UPDATE payments
       SET subscription_id = $2
       WHERE id = $1 AND subscription_id IS NULL
       RETURNING ${SELECT_COLUMNS}`,
      [id, subscriptionId],
    )

    return mapRow(result.rows[0])
  }

  // Phase 11 — Integrated Demo Data. One multi-row INSERT instead of N
  // round-trips — demoDataService.generateForMerchant() creates 300 of
  // these per merchant. Sets status/paymentMethod/createdAt directly in the
  // same statement (skipping the create()-then-update() two-step every
  // other caller uses) since every value is already known up front for
  // generated demo history. `rows` — array of { branchId, deviceId?,
  // subscriptionId?, amount, currency?, purpose, status?, paymentMethod?, createdAt? }.
  async createMany(rows, client = getPool()) {
    if (rows.length === 0) return []

    const values = []
    const placeholders = rows.map((row, index) => {
      const base = index * 9
      values.push(
        row.branchId,
        row.deviceId ?? null,
        row.subscriptionId ?? null,
        row.amount,
        row.currency ?? 'INR',
        row.purpose,
        row.status ?? 'pending',
        row.paymentMethod ?? null,
        row.createdAt ?? null,
      )
      return (
        `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, ` +
        `$${base + 6}, $${base + 7}, $${base + 8}, COALESCE($${base + 9}, now()))`
      )
    })

    const result = await client.query(
      `INSERT INTO payments (branch_id, device_id, subscription_id, amount, currency, purpose, status, payment_method, created_at)
       VALUES ${placeholders.join(', ')}
       RETURNING ${SELECT_COLUMNS}`,
      values,
    )

    return result.rows.map(mapRow)
  }

  // Phase 11 — Integrated Demo Data. Restoring a hard-deleted demo payment
  // (no deleted_at exists on this table — see this file's own header
  // comment) re-INSERTs the exact row from its stored
  // demo_data_records.snapshot, explicit id included. Only
  // demoDataService.restoreForMerchant() calls this.
  async insertFromSnapshot(snapshot, client = getPool()) {
    const result = await client.query(
      `INSERT INTO payments (id, branch_id, device_id, subscription_id, amount, currency, purpose, status, payment_method, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING ${SELECT_COLUMNS}`,
      [
        snapshot.id,
        snapshot.branchId,
        snapshot.deviceId,
        snapshot.subscriptionId,
        snapshot.amount,
        snapshot.currency,
        snapshot.purpose,
        snapshot.status,
        snapshot.paymentMethod,
        snapshot.createdAt,
        snapshot.updatedAt,
      ],
    )

    return mapRow(result.rows[0])
  }

  /**
   * Phase 10 — Platform Admin. Global Payments Dashboard's headline stats —
   * one round trip, `FILTER` clauses instead of separate queries per
   * status, same "one aggregate query" shape as platform.repository.js's
   * getDashboardSummary(). `merchantIds=null` (platform-admin, unrestricted)
   * matches the same convention every other tenant-scoped query in this
   * codebase already uses.
   */
  async getSummary(filters = {}, client = getPool()) {
    const result = await client.query(
      `SELECT
         COUNT(*)::int AS total_count,
         COUNT(*) FILTER (WHERE status = 'paid')::int AS paid_count,
         COUNT(*) FILTER (WHERE status = 'failed')::int AS failed_count,
         COUNT(*) FILTER (WHERE status = 'refunded')::int AS refunded_count,
         COUNT(*) FILTER (WHERE status = 'pending')::int AS pending_count,
         COUNT(*) FILTER (WHERE status = 'cancelled')::int AS cancelled_count,
         COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0) AS revenue,
         COALESCE(SUM(amount) FILTER (WHERE status = 'refunded'), 0) AS refunded_amount,
         COALESCE(AVG(amount) FILTER (WHERE status = 'paid'), 0) AS avg_ticket_size
       FROM payments p
       WHERE ($1::uuid[] IS NULL OR p.branch_id IN (SELECT id FROM branches WHERE merchant_id = ANY($1::uuid[])))
         AND ($2::timestamptz IS NULL OR p.created_at >= $2)
         AND ($3::timestamptz IS NULL OR p.created_at <= $3)`,
      [filters.merchantIds ?? null, filters.dateFrom ?? null, filters.dateTo ?? null],
    )

    const row = result.rows[0]

    return {
      totalCount: row.total_count,
      paidCount: row.paid_count,
      failedCount: row.failed_count,
      refundedCount: row.refunded_count,
      pendingCount: row.pending_count,
      cancelledCount: row.cancelled_count,
      revenue: Number(row.revenue),
      refundedAmount: Number(row.refunded_amount),
      successRate: row.total_count > 0 ? row.paid_count / row.total_count : 0,
      averageTicketSize: Number(row.avg_ticket_size),
    }
  }

  /**
   * Real GROUP BY over branches->merchants — first such aggregate query in
   * this codebase (every other "top N" list here is scalar subqueries per
   * row, e.g. platform.repository.js's findMerchantOverview()). Ranked by
   * real revenue (paid payments only), not raw payment count.
   */
  async getTopMerchants(limit, filters = {}, client = getPool()) {
    const result = await client.query(
      `SELECT m.id AS merchant_id, m.business_name,
              COUNT(*)::int AS payment_count,
              COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'paid'), 0) AS revenue
       FROM payments p
       JOIN branches b ON b.id = p.branch_id
       JOIN merchants m ON m.id = b.merchant_id
       WHERE ($1::uuid[] IS NULL OR m.id = ANY($1::uuid[]))
       GROUP BY m.id, m.business_name
       ORDER BY revenue DESC
       LIMIT $2`,
      [filters.merchantIds ?? null, limit],
    )

    return result.rows.map((row) => ({
      merchantId: row.merchant_id,
      businessName: row.business_name,
      paymentCount: row.payment_count,
      revenue: Number(row.revenue),
    }))
  }

  /**
   * Real data only — `payment_method` is NULL for every payment created
   * before migration 0034 (Surfboard never persisted it until now); those
   * group under 'unknown' rather than being silently dropped or guessed at.
   */
  async getMethodBreakdown(filters = {}, client = getPool()) {
    const result = await client.query(
      `SELECT COALESCE(payment_method, 'unknown') AS payment_method, COUNT(*)::int AS count
       FROM payments p
       WHERE ($1::uuid[] IS NULL OR p.branch_id IN (SELECT id FROM branches WHERE merchant_id = ANY($1::uuid[])))
         AND status = 'paid'
       GROUP BY COALESCE(payment_method, 'unknown')
       ORDER BY count DESC`,
      [filters.merchantIds ?? null],
    )

    return result.rows.map((row) => ({ paymentMethod: row.payment_method, count: row.count }))
  }

  /**
   * Phase 10 — Platform Admin. Global Customer Search's payment enrichment
   * — one batched query for a whole page of customers' subscriptions
   * (never N+1 per row). `subscriptionIds` empty/absent returns `[]`
   * cheaply, without a query.
   */
  async getTotalsBySubscriptionIds(subscriptionIds, client = getPool()) {
    if (!subscriptionIds?.length) return []

    const result = await client.query(
      `SELECT subscription_id,
              COUNT(*)::int AS payment_count,
              COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0) AS payment_total
       FROM payments
       WHERE subscription_id = ANY($1::uuid[])
       GROUP BY subscription_id`,
      [subscriptionIds],
    )

    return result.rows.map((row) => ({
      subscriptionId: row.subscription_id,
      paymentCount: row.payment_count,
      paymentTotal: Number(row.payment_total),
    }))
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
