import { getPool } from '../../database/connection.js'

/**
 * @typedef {object} Recommendation
 * @property {string} id
 * @property {string} incidentId
 * @property {string} runbookId
 * @property {string|null} description
 * @property {string} status - "suggested" | "applied" | "dismissed"
 * @property {string|null} createdBy
 * @property {string} createdAt
 * @property {string} updatedAt
 *
 * The link in Incident -> Recommendation -> Runbook (see migration 0022):
 * "for this incident, this runbook is recommended". Both FKs are required —
 * a recommendation never exists without both ends of the chain.
 */

const SORT_COLUMNS = {
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  status: 'status',
}

const LIST_WHERE_CLAUSE = `
  deleted_at IS NULL
  AND ($1::uuid IS NULL OR incident_id = $1)
  AND ($2::uuid IS NULL OR runbook_id = $2)
  AND ($3::varchar IS NULL OR status = $3)
  AND ($4::text IS NULL OR description ILIKE '%' || $4 || '%')
`

const SELECT_COLUMNS = `
  id, incident_id, runbook_id, description, status, created_by, created_at, updated_at
`

function mapRow(row) {
  if (!row) return null

  return {
    id: row.id,
    incidentId: row.incident_id,
    runbookId: row.runbook_id,
    description: row.description,
    status: row.status,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export class RecommendationRepository {
  async findById(id, client = getPool()) {
    const result = await client.query(
      `SELECT ${SELECT_COLUMNS} FROM recommendations WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    )

    return mapRow(result.rows[0])
  }

  async findAll(filters, pagination, client = getPool()) {
    const sortColumn = SORT_COLUMNS[filters.sortBy] ?? SORT_COLUMNS.createdAt
    const sortOrder = filters.sortOrder === 'asc' ? 'ASC' : 'DESC'

    const result = await client.query(
      `SELECT ${SELECT_COLUMNS}
       FROM recommendations
       WHERE ${LIST_WHERE_CLAUSE}
       ORDER BY ${sortColumn} ${sortOrder}
       LIMIT $5 OFFSET $6`,
      [
        filters.incidentId ?? null,
        filters.runbookId ?? null,
        filters.status ?? null,
        filters.search ?? null,
        pagination.pageSize,
        pagination.offset,
      ],
    )

    return result.rows.map(mapRow)
  }

  async count(filters, client = getPool()) {
    const result = await client.query(
      `SELECT COUNT(*)::int AS total FROM recommendations WHERE ${LIST_WHERE_CLAUSE}`,
      [filters.incidentId ?? null, filters.runbookId ?? null, filters.status ?? null, filters.search ?? null],
    )

    return result.rows[0].total
  }

  async create(data, client = getPool()) {
    const result = await client.query(
      `INSERT INTO recommendations (incident_id, runbook_id, description, status, created_by)
       VALUES ($1, $2, $3, COALESCE($4, 'suggested'), $5)
       RETURNING ${SELECT_COLUMNS}`,
      [data.incidentId, data.runbookId, data.description ?? null, data.status ?? null, data.createdBy ?? null],
    )

    return mapRow(result.rows[0])
  }

  async update(id, data, client = getPool()) {
    const fieldMap = {
      description: 'description',
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
      `UPDATE recommendations
       SET ${assignments.join(', ')}
       WHERE id = $${index} AND deleted_at IS NULL
       RETURNING ${SELECT_COLUMNS}`,
      values,
    )

    return mapRow(result.rows[0])
  }

  async softDelete(id, client = getPool()) {
    const result = await client.query(
      `UPDATE recommendations SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL RETURNING id`,
      [id],
    )

    return result.rows[0] ?? null
  }
}

export const recommendationRepository = new RecommendationRepository()
