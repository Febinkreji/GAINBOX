import { getPool } from '../../database/connection.js'

/**
 * @typedef {object} Device
 * @property {string} id
 * @property {string} branchId
 * @property {string} label
 * @property {string} status - "registered" | "active" | "offline" | "deactivated"
 * @property {object|null} brandingConfig
 * @property {object|null} tipConfig
 * @property {string|null} createdBy
 * @property {string|null} updatedBy
 * @property {string} createdAt
 * @property {string} updatedAt
 *
 * A payment terminal assigned to a Branch. brandingConfig/tipConfig are
 * JSONB — Surfboard-defined shape, not fixed columns (see migration 0010).
 */

const SORT_COLUMNS = {
  label: 'label',
  createdAt: 'created_at',
  status: 'status',
}

// Same shape as merchant/branch repositories' LIST_WHERE_CLAUSE: one
// static, fully parameterized WHERE clause shared by findAll/count. $4 is
// the tenant-scoping filter Authorization supplies (see
// authorizationService.getAccessibleMerchantIds) — null for an
// unrestricted platform-admin query, an array otherwise. Devices have no
// merchant_id column of their own (only branch_id), so this filters via a
// subquery against branches rather than a direct column comparison.
const LIST_WHERE_CLAUSE = `
  deleted_at IS NULL
  AND ($1::uuid IS NULL OR branch_id = $1)
  AND ($2::varchar IS NULL OR status = $2)
  AND ($3::text IS NULL OR label ILIKE '%' || $3 || '%')
  AND ($4::uuid[] IS NULL OR branch_id IN (SELECT id FROM branches WHERE merchant_id = ANY($4::uuid[])))
`

const SELECT_COLUMNS = `
  id, branch_id, label, status, branding_config, tip_config,
  created_by, updated_by, created_at, updated_at
`

function mapRow(row) {
  if (!row) return null

  return {
    id: row.id,
    branchId: row.branch_id,
    label: row.label,
    status: row.status,
    brandingConfig: row.branding_config,
    tipConfig: row.tip_config,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export class DeviceRepository {
  async findById(id, client = getPool()) {
    const result = await client.query(
      `SELECT ${SELECT_COLUMNS} FROM devices WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    )

    return mapRow(result.rows[0])
  }

  async findAll(filters, pagination, client = getPool()) {
    const sortColumn = SORT_COLUMNS[filters.sortBy] ?? SORT_COLUMNS.createdAt
    const sortOrder = filters.sortOrder === 'asc' ? 'ASC' : 'DESC'

    const result = await client.query(
      `SELECT ${SELECT_COLUMNS}
       FROM devices
       WHERE ${LIST_WHERE_CLAUSE}
       ORDER BY ${sortColumn} ${sortOrder}
       LIMIT $5 OFFSET $6`,
      [
        filters.branchId ?? null,
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
      `SELECT COUNT(*)::int AS total FROM devices WHERE ${LIST_WHERE_CLAUSE}`,
      [filters.branchId ?? null, filters.status ?? null, filters.search ?? null, filters.merchantIds ?? null],
    )

    return result.rows[0].total
  }

  async create(data, client = getPool()) {
    const result = await client.query(
      `INSERT INTO devices (branch_id, label, branding_config, tip_config, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING ${SELECT_COLUMNS}`,
      [data.branchId, data.label, data.brandingConfig ?? null, data.tipConfig ?? null, data.createdBy ?? null],
    )

    return mapRow(result.rows[0])
  }

  async update(id, data, client = getPool()) {
    const fieldMap = {
      label: 'label',
      status: 'status',
      brandingConfig: 'branding_config',
      tipConfig: 'tip_config',
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
      `UPDATE devices
       SET ${assignments.join(', ')}
       WHERE id = $${index} AND deleted_at IS NULL
       RETURNING ${SELECT_COLUMNS}`,
      values,
    )

    return mapRow(result.rows[0])
  }

  async softDelete(id, client = getPool()) {
    const result = await client.query(
      `UPDATE devices SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL RETURNING id`,
      [id],
    )

    return result.rows[0] ?? null
  }
}

export const deviceRepository = new DeviceRepository()
