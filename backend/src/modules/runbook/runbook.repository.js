import { getPool } from '../../database/connection.js'

/**
 * @typedef {object} Runbook
 * @property {string} id
 * @property {string} title
 * @property {string|null} category
 * @property {string|null} description
 * @property {Array} steps - ordered, free-form procedure content
 * @property {string[]} relatedIncidentTypes
 * @property {number} version
 * @property {boolean} active
 * @property {string|null} createdBy
 * @property {string|null} updatedBy
 * @property {string} createdAt
 * @property {string} updatedAt
 *
 * See migration 0022. `version` is bumped by runbook.service.js on every
 * update — this repository just writes whatever version value it's given.
 */

const SORT_COLUMNS = {
  title: 'title',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  version: 'version',
}

const LIST_WHERE_CLAUSE = `
  deleted_at IS NULL
  AND ($1::varchar IS NULL OR category = $1)
  AND ($2::boolean IS NULL OR active = $2)
  AND ($3::text IS NULL OR title ILIKE '%' || $3 || '%' OR description ILIKE '%' || $3 || '%')
  AND ($4::text IS NULL OR $4 = ANY(related_incident_types))
`

const SELECT_COLUMNS = `
  id, title, category, description, steps, related_incident_types,
  version, active, created_by, updated_by, created_at, updated_at
`

function mapRow(row) {
  if (!row) return null

  return {
    id: row.id,
    title: row.title,
    category: row.category,
    description: row.description,
    steps: row.steps,
    relatedIncidentTypes: row.related_incident_types,
    version: row.version,
    active: row.active,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export class RunbookRepository {
  async findById(id, client = getPool()) {
    const result = await client.query(
      `SELECT ${SELECT_COLUMNS} FROM runbooks WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    )

    return mapRow(result.rows[0])
  }

  async findAll(filters, pagination, client = getPool()) {
    const sortColumn = SORT_COLUMNS[filters.sortBy] ?? SORT_COLUMNS.createdAt
    const sortOrder = filters.sortOrder === 'asc' ? 'ASC' : 'DESC'

    const result = await client.query(
      `SELECT ${SELECT_COLUMNS}
       FROM runbooks
       WHERE ${LIST_WHERE_CLAUSE}
       ORDER BY ${sortColumn} ${sortOrder}
       LIMIT $5 OFFSET $6`,
      [
        filters.category ?? null,
        filters.active ?? null,
        filters.search ?? null,
        filters.relatedIncidentType ?? null,
        pagination.pageSize,
        pagination.offset,
      ],
    )

    return result.rows.map(mapRow)
  }

  async count(filters, client = getPool()) {
    const result = await client.query(
      `SELECT COUNT(*)::int AS total FROM runbooks WHERE ${LIST_WHERE_CLAUSE}`,
      [filters.category ?? null, filters.active ?? null, filters.search ?? null, filters.relatedIncidentType ?? null],
    )

    return result.rows[0].total
  }

  async create(data, client = getPool()) {
    const result = await client.query(
      `INSERT INTO runbooks (title, category, description, steps, related_incident_types, created_by)
       VALUES ($1, $2, $3, $4::jsonb, $5, $6)
       RETURNING ${SELECT_COLUMNS}`,
      [
        data.title,
        data.category ?? null,
        data.description ?? null,
        JSON.stringify(data.steps ?? []),
        data.relatedIncidentTypes ?? [],
        data.createdBy ?? null,
      ],
    )

    return mapRow(result.rows[0])
  }

  async update(id, data, client = getPool()) {
    const assignments = []
    const values = []
    let index = 1

    if (data.title !== undefined) {
      assignments.push(`title = $${index}`)
      values.push(data.title)
      index += 1
    }

    if (data.category !== undefined) {
      assignments.push(`category = $${index}`)
      values.push(data.category)
      index += 1
    }

    if (data.description !== undefined) {
      assignments.push(`description = $${index}`)
      values.push(data.description)
      index += 1
    }

    if (data.steps !== undefined) {
      assignments.push(`steps = $${index}::jsonb`)
      values.push(JSON.stringify(data.steps))
      index += 1
    }

    if (data.relatedIncidentTypes !== undefined) {
      assignments.push(`related_incident_types = $${index}`)
      values.push(data.relatedIncidentTypes)
      index += 1
    }

    if (data.active !== undefined) {
      assignments.push(`active = $${index}`)
      values.push(data.active)
      index += 1
    }

    if (data.version !== undefined) {
      assignments.push(`version = $${index}`)
      values.push(data.version)
      index += 1
    }

    if (data.updatedBy !== undefined) {
      assignments.push(`updated_by = $${index}`)
      values.push(data.updatedBy)
      index += 1
    }

    values.push(id)

    const result = await client.query(
      `UPDATE runbooks
       SET ${assignments.join(', ')}
       WHERE id = $${index} AND deleted_at IS NULL
       RETURNING ${SELECT_COLUMNS}`,
      values,
    )

    return mapRow(result.rows[0])
  }

  async softDelete(id, client = getPool()) {
    const result = await client.query(
      `UPDATE runbooks SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL RETURNING id`,
      [id],
    )

    return result.rows[0] ?? null
  }
}

export const runbookRepository = new RunbookRepository()
