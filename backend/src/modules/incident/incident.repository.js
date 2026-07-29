import { getPool } from '../../database/connection.js'

/**
 * @typedef {object} Incident
 * @property {string} id
 * @property {string} title
 * @property {string|null} description
 * @property {string} severity - "low" | "medium" | "high" | "critical"
 * @property {string} status - "open" | "investigating" | "resolved" | "closed" | "cancelled"
 * @property {string|null} category
 * @property {string|null} merchantId
 * @property {string|null} branchId
 * @property {string|null} deviceId
 * @property {string|null} createdBy
 * @property {string|null} assignedTo
 * @property {string} createdAt
 * @property {string} updatedAt
 *
 * Platform Control Center's operational incident record — see migration
 * 0022. Scope (merchant/branch/device) is optional: a platform-wide
 * incident has none of them.
 */

const SORT_COLUMNS = {
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  severity: 'severity',
  status: 'status',
  title: 'title',
}

const LIST_WHERE_CLAUSE = `
  deleted_at IS NULL
  AND ($1::varchar IS NULL OR status = $1)
  AND ($2::varchar IS NULL OR severity = $2)
  AND ($3::varchar IS NULL OR category = $3)
  AND ($4::uuid IS NULL OR merchant_id = $4)
  AND ($5::uuid IS NULL OR branch_id = $5)
  AND ($6::uuid IS NULL OR device_id = $6)
  AND ($7::uuid IS NULL OR assigned_to = $7)
  AND ($8::text IS NULL OR title ILIKE '%' || $8 || '%' OR description ILIKE '%' || $8 || '%')
`

const SELECT_COLUMNS = `
  id, title, description, severity, status, category,
  merchant_id, branch_id, device_id, created_by, assigned_to,
  created_at, updated_at
`

function mapRow(row) {
  if (!row) return null

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    severity: row.severity,
    status: row.status,
    category: row.category,
    merchantId: row.merchant_id,
    branchId: row.branch_id,
    deviceId: row.device_id,
    createdBy: row.created_by,
    assignedTo: row.assigned_to,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export class IncidentRepository {
  async findById(id, client = getPool()) {
    const result = await client.query(
      `SELECT ${SELECT_COLUMNS} FROM incidents WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    )

    return mapRow(result.rows[0])
  }

  async findAll(filters, pagination, client = getPool()) {
    const sortColumn = SORT_COLUMNS[filters.sortBy] ?? SORT_COLUMNS.createdAt
    const sortOrder = filters.sortOrder === 'asc' ? 'ASC' : 'DESC'

    const result = await client.query(
      `SELECT ${SELECT_COLUMNS}
       FROM incidents
       WHERE ${LIST_WHERE_CLAUSE}
       ORDER BY ${sortColumn} ${sortOrder}
       LIMIT $9 OFFSET $10`,
      [
        filters.status ?? null,
        filters.severity ?? null,
        filters.category ?? null,
        filters.merchantId ?? null,
        filters.branchId ?? null,
        filters.deviceId ?? null,
        filters.assignedTo ?? null,
        filters.search ?? null,
        pagination.pageSize,
        pagination.offset,
      ],
    )

    return result.rows.map(mapRow)
  }

  async count(filters, client = getPool()) {
    const result = await client.query(
      `SELECT COUNT(*)::int AS total FROM incidents WHERE ${LIST_WHERE_CLAUSE}`,
      [
        filters.status ?? null,
        filters.severity ?? null,
        filters.category ?? null,
        filters.merchantId ?? null,
        filters.branchId ?? null,
        filters.deviceId ?? null,
        filters.assignedTo ?? null,
        filters.search ?? null,
      ],
    )

    return result.rows[0].total
  }

  async create(data, client = getPool()) {
    const result = await client.query(
      `INSERT INTO incidents (title, description, severity, status, category, merchant_id, branch_id, device_id, created_by, assigned_to)
       VALUES ($1, $2, COALESCE($3, 'medium'), COALESCE($4, 'open'), $5, $6, $7, $8, $9, $10)
       RETURNING ${SELECT_COLUMNS}`,
      [
        data.title,
        data.description ?? null,
        data.severity ?? null,
        data.status ?? null,
        data.category ?? null,
        data.merchantId ?? null,
        data.branchId ?? null,
        data.deviceId ?? null,
        data.createdBy ?? null,
        data.assignedTo ?? null,
      ],
    )

    return mapRow(result.rows[0])
  }

  async update(id, data, client = getPool()) {
    const fieldMap = {
      title: 'title',
      description: 'description',
      severity: 'severity',
      status: 'status',
      category: 'category',
      merchantId: 'merchant_id',
      branchId: 'branch_id',
      deviceId: 'device_id',
      assignedTo: 'assigned_to',
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
      `UPDATE incidents
       SET ${assignments.join(', ')}
       WHERE id = $${index} AND deleted_at IS NULL
       RETURNING ${SELECT_COLUMNS}`,
      values,
    )

    return mapRow(result.rows[0])
  }

  async softDelete(id, client = getPool()) {
    const result = await client.query(
      `UPDATE incidents SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL RETURNING id`,
      [id],
    )

    return result.rows[0] ?? null
  }
}

export const incidentRepository = new IncidentRepository()
