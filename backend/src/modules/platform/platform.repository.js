import { getPool } from '../../database/connection.js'

/**
 * Read-only, aggregate-first queries for the Platform Control Center.
 * Nothing here writes; nothing here loads a full table into JavaScript to
 * count/aggregate in memory — every number comes back from SQL
 * (COUNT/GROUP BY/correlated subqueries), computed in one round trip per
 * endpoint. Per-entity CRUD stays in Merchant/Branch/Device/Membership's
 * own repositories; this repository only exists for the cross-cutting
 * summary/overview shapes those repositories don't provide.
 */

const MERCHANT_OVERVIEW_SORT_COLUMNS = {
  businessName: 'm.business_name',
  createdAt: 'm.created_at',
  status: 'm.status',
}

const USER_OVERVIEW_SORT_COLUMNS = {
  displayName: 'u.display_name',
  email: 'u.email',
  createdAt: 'u.created_at',
  status: 'u.status',
}

// Shared between findMerchantOverview/countMerchantOverview so the two
// queries can never disagree on what counts as a "match" — same pattern as
// every other module's LIST_WHERE_CLAUSE.
const MERCHANT_OVERVIEW_WHERE = `
  m.deleted_at IS NULL
  AND ($1::varchar IS NULL OR m.status = $1)
  AND ($2::text IS NULL OR m.business_name ILIKE '%' || $2 || '%')
`

// The `role` filter checks both role sources (global user_roles and
// merchant-scoped merchant_staff) via EXISTS — same "either source grants
// it" semantics as authorizationService.userHasAnyRole.
const USER_OVERVIEW_WHERE = `
  u.deleted_at IS NULL
  AND ($1::varchar IS NULL OR u.status = $1)
  AND ($2::text IS NULL OR u.display_name ILIKE '%' || $2 || '%' OR u.email ILIKE '%' || $2 || '%')
  AND (
    $3::varchar IS NULL
    OR EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
      WHERE ur.user_id = u.id AND r.name = $3
    )
    OR EXISTS (
      SELECT 1 FROM merchant_staff ms
      JOIN roles r ON r.id = ms.role_id AND r.deleted_at IS NULL
      WHERE ms.user_id = u.id AND ms.status = 'active' AND ms.deleted_at IS NULL AND r.name = $3
    )
  )
`

function mapMerchantOverviewRow(row) {
  return {
    merchant: { id: row.id, businessName: row.business_name },
    status: row.status,
    hasPendingOwnerInvite: row.has_pending_owner_invite,
    branchCount: row.branch_count,
    deviceCount: row.device_count,
    staffCount: row.staff_count,
    membershipPlanCount: row.membership_plan_count,
    createdAt: row.created_at,
  }
}

function mapUserOverviewRow(row) {
  return {
    id: row.id,
    displayName: row.display_name,
    email: row.email,
    status: row.status,
    roles: row.roles,
    merchantCount: row.merchant_count,
  }
}

export class PlatformRepository {
  /**
   * One query, one round trip: every dashboard number is a scalar
   * subquery, each backed by an existing index (status/deleted_at columns,
   * role_permissions-style FK columns) — not a table scan repeated per
   * stat. `merchantOwners`/`merchantStaff`/`viewers` count *distinct
   * users* holding that role somewhere, not assignment rows — a user
   * staffed at two merchants with the same role counts once.
   */
  async getDashboardSummary(client = getPool()) {
    const result = await client.query(`
      SELECT
        (SELECT COUNT(*)::int FROM merchants WHERE deleted_at IS NULL) AS merchants,
        (SELECT COUNT(*)::int FROM merchants WHERE deleted_at IS NULL AND status = 'active') AS active_merchants,
        (SELECT COUNT(*)::int FROM merchants WHERE deleted_at IS NULL AND status = 'pending') AS pending_merchants,
        (SELECT COUNT(*)::int FROM merchants WHERE deleted_at IS NULL AND status = 'suspended') AS suspended_merchants,
        (SELECT COUNT(*)::int FROM branches WHERE deleted_at IS NULL) AS branches,
        (SELECT COUNT(*)::int FROM devices WHERE deleted_at IS NULL) AS devices,
        (SELECT COUNT(*)::int FROM membership_plans WHERE deleted_at IS NULL) AS membership_plans,
        (SELECT COUNT(*)::int FROM subscriptions) AS subscriptions,
        (
          SELECT COUNT(DISTINCT ur.user_id)::int FROM user_roles ur
          JOIN roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
          WHERE r.name = 'platform-admin'
        ) AS platform_admins,
        (
          SELECT COUNT(DISTINCT ms.user_id)::int FROM merchant_staff ms
          JOIN roles r ON r.id = ms.role_id AND r.deleted_at IS NULL
          WHERE r.name = 'merchant-owner' AND ms.status = 'active' AND ms.deleted_at IS NULL
        ) AS merchant_owners,
        (
          SELECT COUNT(DISTINCT ms.user_id)::int FROM merchant_staff ms
          JOIN roles r ON r.id = ms.role_id AND r.deleted_at IS NULL
          WHERE r.name = 'merchant-staff' AND ms.status = 'active' AND ms.deleted_at IS NULL
        ) AS merchant_staff_count,
        (
          SELECT COUNT(DISTINCT ms.user_id)::int FROM merchant_staff ms
          JOIN roles r ON r.id = ms.role_id AND r.deleted_at IS NULL
          WHERE r.name = 'viewer' AND ms.status = 'active' AND ms.deleted_at IS NULL
        ) AS viewers
    `)

    const row = result.rows[0]

    return {
      merchants: row.merchants,
      activeMerchants: row.active_merchants,
      pendingMerchants: row.pending_merchants,
      suspendedMerchants: row.suspended_merchants,
      branches: row.branches,
      devices: row.devices,
      membershipPlans: row.membership_plans,
      subscriptions: row.subscriptions,
      platformAdmins: row.platform_admins,
      merchantOwners: row.merchant_owners,
      merchantStaff: row.merchant_staff_count,
      viewers: row.viewers,
    }
  }

  /**
   * Dashboard operational summaries (Phase 2) — a fixed set of small,
   * independently bounded (LIMIT 5) reads, each backed by a created_at
   * index (see migration 0023) or an existing one (merchants/branches
   * already had one). This is deliberately NOT one mega-query: these
   * touch different tables with different shapes, and UNIONing them would
   * produce awkward heterogeneous rows for no real benefit. Ten small,
   * indexed, parallel queries is not N+1 — N+1 means one query per row of
   * an unbounded result set; this is a fixed, small query count regardless
   * of how large any of these tables grow.
   */
  async getLatestMerchants(limit, client = getPool()) {
    const result = await client.query(
      `SELECT id, business_name, status, created_at FROM merchants
       WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT $1`,
      [limit],
    )

    return result.rows.map((row) => ({
      id: row.id,
      businessName: row.business_name,
      status: row.status,
      createdAt: row.created_at,
    }))
  }

  async getLatestUsers(limit, client = getPool()) {
    const result = await client.query(
      `SELECT id, display_name, email, status, created_at FROM users
       WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT $1`,
      [limit],
    )

    return result.rows.map((row) => ({
      id: row.id,
      displayName: row.display_name,
      email: row.email,
      status: row.status,
      createdAt: row.created_at,
    }))
  }

  async getLatestDevices(limit, client = getPool()) {
    const result = await client.query(
      `SELECT id, branch_id, label, status, created_at FROM devices
       WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT $1`,
      [limit],
    )

    return result.rows.map((row) => ({
      id: row.id,
      branchId: row.branch_id,
      label: row.label,
      status: row.status,
      createdAt: row.created_at,
    }))
  }

  async getLatestMembershipPlans(limit, client = getPool()) {
    const result = await client.query(
      `SELECT id, merchant_id, name, status, created_at FROM membership_plans
       WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT $1`,
      [limit],
    )

    return result.rows.map((row) => ({
      id: row.id,
      merchantId: row.merchant_id,
      name: row.name,
      status: row.status,
      createdAt: row.created_at,
    }))
  }

  async getLatestSubscriptions(limit, client = getPool()) {
    // No deleted_at on subscriptions by design (see subscription.repository.js).
    const result = await client.query(
      `SELECT id, membership_plan_id, status, started_at, created_at FROM subscriptions
       ORDER BY created_at DESC LIMIT $1`,
      [limit],
    )

    return result.rows.map((row) => ({
      id: row.id,
      membershipPlanId: row.membership_plan_id,
      status: row.status,
      startedAt: row.started_at,
      createdAt: row.created_at,
    }))
  }

  async getPendingMerchants(limit, client = getPool()) {
    const result = await client.query(
      `SELECT id, business_name, created_at FROM merchants
       WHERE deleted_at IS NULL AND status = 'pending' ORDER BY created_at DESC LIMIT $1`,
      [limit],
    )

    return result.rows.map((row) => ({ id: row.id, businessName: row.business_name, createdAt: row.created_at }))
  }

  async getSuspendedMerchants(limit, client = getPool()) {
    const result = await client.query(
      `SELECT id, business_name, created_at FROM merchants
       WHERE deleted_at IS NULL AND status = 'suspended' ORDER BY created_at DESC LIMIT $1`,
      [limit],
    )

    return result.rows.map((row) => ({ id: row.id, businessName: row.business_name, createdAt: row.created_at }))
  }

  async getNewestMerchantStaff(limit, client = getPool()) {
    const result = await client.query(
      `SELECT ms.id, ms.user_id, u.display_name, u.email, ms.merchant_id, m.business_name, r.name AS role_name, ms.status, ms.created_at
       FROM merchant_staff ms
       JOIN users u ON u.id = ms.user_id AND u.deleted_at IS NULL
       JOIN merchants m ON m.id = ms.merchant_id AND m.deleted_at IS NULL
       JOIN roles r ON r.id = ms.role_id AND r.deleted_at IS NULL
       WHERE ms.deleted_at IS NULL
       ORDER BY ms.created_at DESC
       LIMIT $1`,
      [limit],
    )

    return result.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      displayName: row.display_name,
      email: row.email,
      merchantId: row.merchant_id,
      businessName: row.business_name,
      roleName: row.role_name,
      status: row.status,
      createdAt: row.created_at,
    }))
  }

  async getNewestPlatformAdmins(limit, client = getPool()) {
    const result = await client.query(
      `SELECT u.id AS user_id, u.display_name, u.email, ur.created_at
       FROM user_roles ur
       JOIN users u ON u.id = ur.user_id AND u.deleted_at IS NULL
       JOIN roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
       WHERE r.name = 'platform-admin'
       ORDER BY ur.created_at DESC
       LIMIT $1`,
      [limit],
    )

    return result.rows.map((row) => ({
      userId: row.user_id,
      displayName: row.display_name,
      email: row.email,
      createdAt: row.created_at,
    }))
  }

  /**
   * A lightweight activity feed, not the full Audit Explorer (Phase 3) —
   * just the N most recent audit_logs entries with the actor's name
   * resolved, reusing the same audit_logs_created_at_idx index Phase 3's
   * broad browsing query also relies on.
   */
  async getRecentActivity(limit, client = getPool()) {
    const result = await client.query(
      `SELECT al.id, al.entity_type, al.entity_id, al.action, al.actor_user_id, u.display_name AS actor_display_name, al.created_at
       FROM audit_logs al
       LEFT JOIN users u ON u.id = al.actor_user_id
       ORDER BY al.created_at DESC
       LIMIT $1`,
      [limit],
    )

    return result.rows.map((row) => ({
      id: row.id,
      entityType: row.entity_type,
      entityId: row.entity_id,
      action: row.action,
      actor: row.actor_user_id ? { id: row.actor_user_id, displayName: row.actor_display_name } : null,
      timestamp: row.created_at,
    }))
  }

  /**
   * Per-merchant counts via correlated scalar subqueries, not JOIN+GROUP BY
   * — a 4-way join across branches/devices/staff/plans would fan out into
   * a cross product per merchant before collapsing, multiplying rows the
   * database has to process for no reason. Each subquery here is a single
   * indexed COUNT scoped to one merchant id, run once per outer row inside
   * one query plan — still one round trip, no N+1, no fan-out risk.
   */
  async findMerchantOverview(filters, pagination, client = getPool()) {
    const sortColumn = MERCHANT_OVERVIEW_SORT_COLUMNS[filters.sortBy] ?? MERCHANT_OVERVIEW_SORT_COLUMNS.createdAt
    const sortOrder = filters.sortOrder === 'asc' ? 'ASC' : 'DESC'

    const result = await client.query(
      `SELECT
         m.id, m.business_name, m.status, m.created_at,
         (SELECT COUNT(*)::int FROM branches b WHERE b.merchant_id = m.id AND b.deleted_at IS NULL) AS branch_count,
         (
           SELECT COUNT(*)::int FROM devices d
           JOIN branches b ON b.id = d.branch_id AND b.deleted_at IS NULL
           WHERE b.merchant_id = m.id AND d.deleted_at IS NULL
         ) AS device_count,
         (
           SELECT COUNT(*)::int FROM merchant_staff ms
           WHERE ms.merchant_id = m.id AND ms.status = 'active' AND ms.deleted_at IS NULL
         ) AS staff_count,
         (SELECT COUNT(*)::int FROM membership_plans mp WHERE mp.merchant_id = m.id AND mp.deleted_at IS NULL) AS membership_plan_count,
         (
           EXISTS (
             SELECT 1 FROM merchant_invitations mi
             JOIN roles r ON r.id = mi.role_id AND r.deleted_at IS NULL
             WHERE mi.merchant_id = m.id AND mi.status = 'pending' AND r.name = 'merchant-owner'
           )
         ) AS has_pending_owner_invite
       FROM merchants m
       WHERE ${MERCHANT_OVERVIEW_WHERE}
       ORDER BY ${sortColumn} ${sortOrder}
       LIMIT $3 OFFSET $4`,
      [filters.status ?? null, filters.search ?? null, pagination.pageSize, pagination.offset],
    )

    return result.rows.map(mapMerchantOverviewRow)
  }

  async countMerchantOverview(filters, client = getPool()) {
    const result = await client.query(
      `SELECT COUNT(*)::int AS total FROM merchants m WHERE ${MERCHANT_OVERVIEW_WHERE}`,
      [filters.status ?? null, filters.search ?? null],
    )

    return result.rows[0].total
  }

  /**
   * Roles come from two sources (global user_roles, merchant-scoped
   * merchant_staff) — the inner UNION dedupes a role held both ways into
   * one entry. ARRAY_AGG(DISTINCT ...) then collapses that per user into a
   * single array column, still as one correlated subquery per row, not a
   * per-user round trip.
   */
  async findUserOverview(filters, pagination, client = getPool()) {
    const sortColumn = USER_OVERVIEW_SORT_COLUMNS[filters.sortBy] ?? USER_OVERVIEW_SORT_COLUMNS.createdAt
    const sortOrder = filters.sortOrder === 'asc' ? 'ASC' : 'DESC'

    const result = await client.query(
      `SELECT
         u.id, u.display_name, u.email, u.status,
         (
           SELECT COALESCE(ARRAY_AGG(DISTINCT role_name), '{}')
           FROM (
             SELECT r.name AS role_name FROM user_roles ur
             JOIN roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
             WHERE ur.user_id = u.id
             UNION
             SELECT r.name FROM merchant_staff ms
             JOIN roles r ON r.id = ms.role_id AND r.deleted_at IS NULL
             WHERE ms.user_id = u.id AND ms.status = 'active' AND ms.deleted_at IS NULL
           ) all_roles
         ) AS roles,
         (
           SELECT COUNT(DISTINCT merchant_id)::int FROM merchant_staff ms2
           WHERE ms2.user_id = u.id AND ms2.status = 'active' AND ms2.deleted_at IS NULL
         ) AS merchant_count
       FROM users u
       WHERE ${USER_OVERVIEW_WHERE}
       ORDER BY ${sortColumn} ${sortOrder}
       LIMIT $4 OFFSET $5`,
      [filters.status ?? null, filters.search ?? null, filters.role ?? null, pagination.pageSize, pagination.offset],
    )

    return result.rows.map(mapUserOverviewRow)
  }

  async countUserOverview(filters, client = getPool()) {
    const result = await client.query(
      `SELECT COUNT(*)::int AS total FROM users u WHERE ${USER_OVERVIEW_WHERE}`,
      [filters.status ?? null, filters.search ?? null, filters.role ?? null],
    )

    return result.rows[0].total
  }
}

export const platformRepository = new PlatformRepository()
