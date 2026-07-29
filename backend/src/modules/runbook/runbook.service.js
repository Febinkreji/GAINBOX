import { runbookRepository } from './runbook.repository.js'
import { auditService } from '../audit/audit.service.js'
import { outboxService } from '../outbox/outbox.service.js'
import { withTransaction } from '../../database/connection.js'
import { NotFoundError } from '../../errors/index.js'
import { parsePagination, buildPaginationMeta } from '../../utils/pagination.js'

/**
 * Business rules live here:
 *  - a runbook is born version 1, active by default (DB defaults);
 *  - every update bumps `version` by one — not client-settable, so it
 *    reliably reflects how many times the procedure has been revised;
 *  - create/update/delete are audited and outboxed in the same transaction.
 */
export const runbookService = {
  async list(query) {
    const pagination = parsePagination(query)
    const filters = {
      category: query.category,
      active: query.active,
      search: query.search,
      relatedIncidentType: query.relatedIncidentType,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    }

    const [items, total] = await Promise.all([
      runbookRepository.findAll(filters, pagination),
      runbookRepository.count(filters),
    ])

    return {
      items,
      meta: buildPaginationMeta({ page: pagination.page, pageSize: pagination.pageSize, total }),
    }
  },

  async getById(id) {
    const runbook = await runbookRepository.findById(id)

    if (!runbook) {
      throw new NotFoundError('Runbook not found')
    }

    return runbook
  },

  async create(data, actorUserId) {
    return withTransaction(async (client) => {
      const created = await runbookRepository.create({ ...data, createdBy: actorUserId ?? null }, client)

      await auditService.record(
        {
          entityType: 'runbook',
          entityId: created.id,
          action: 'runbook.created',
          actorUserId: actorUserId ?? null,
          metadata: { title: created.title, category: created.category },
        },
        client,
      )

      await outboxService.publish(
        { eventType: 'RunbookCreated', aggregateType: 'runbook', aggregateId: created.id, payload: created },
        client,
      )

      return created
    })
  },

  async update(id, data, actorUserId) {
    const existing = await runbookRepository.findById(id)

    if (!existing) {
      throw new NotFoundError('Runbook not found')
    }

    return withTransaction(async (client) => {
      const updated = await runbookRepository.update(
        id,
        { ...data, version: existing.version + 1, updatedBy: actorUserId ?? null },
        client,
      )

      await auditService.record(
        {
          entityType: 'runbook',
          entityId: id,
          action: 'runbook.updated',
          actorUserId: actorUserId ?? null,
          metadata: { changes: data, version: updated.version },
        },
        client,
      )

      await outboxService.publish(
        { eventType: 'RunbookUpdated', aggregateType: 'runbook', aggregateId: id, payload: updated },
        client,
      )

      return updated
    })
  },

  async remove(id, actorUserId) {
    const existing = await runbookRepository.findById(id)

    if (!existing) {
      throw new NotFoundError('Runbook not found')
    }

    await withTransaction(async (client) => {
      await runbookRepository.softDelete(id, client)

      await auditService.record(
        {
          entityType: 'runbook',
          entityId: id,
          action: 'runbook.deleted',
          actorUserId: actorUserId ?? null,
          metadata: {},
        },
        client,
      )

      await outboxService.publish(
        { eventType: 'RunbookDeleted', aggregateType: 'runbook', aggregateId: id, payload: { id } },
        client,
      )
    })
  },
}
