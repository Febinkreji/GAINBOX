import { auditRepository } from './audit.repository.js'
import { NotFoundError } from '../../errors/index.js'
import { parsePagination, buildPaginationMeta } from '../../utils/pagination.js'

/**
 * `record` remains internal infrastructure — called by domain services
 * after a successful write, inside the same DB transaction as that write
 * (see merchant.service.js). Untouched by Phase 3: `list`/`getById` below
 * are the only public, routed capability this service gains, and they only
 * read (see audit.controller.js, wired under /platform/audit).
 */
export const auditService = {
  /**
   * @param {{ entityType: string, entityId: string, action: string, actorUserId?: string|null, metadata?: object }} entry
   * @param {import('pg').PoolClient} [client] - pass the transaction client when called inside one.
   */
  async record(entry, client) {
    return auditRepository.record(entry, client)
  },

  async list(query) {
    const pagination = parsePagination(query)
    const filters = {
      entityType: query.entityType,
      entityId: query.entityId,
      actorUserId: query.actorUserId,
      action: query.action,
      severity: query.severity,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      search: query.search,
      sortOrder: query.sortOrder,
    }

    const [items, total] = await Promise.all([
      auditRepository.findAll(filters, pagination),
      auditRepository.count(filters),
    ])

    return {
      items,
      meta: buildPaginationMeta({ page: pagination.page, pageSize: pagination.pageSize, total }),
    }
  },

  async getById(id) {
    const entry = await auditRepository.findById(id)

    if (!entry) {
      throw new NotFoundError('Audit entry not found')
    }

    return entry
  },
}
