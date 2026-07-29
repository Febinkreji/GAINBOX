import { recommendationRepository } from './recommendation.repository.js'
import { incidentRepository } from '../incident/incident.repository.js'
import { runbookRepository } from '../runbook/runbook.repository.js'
import { auditService } from '../audit/audit.service.js'
import { outboxService } from '../outbox/outbox.service.js'
import { withTransaction } from '../../database/connection.js'
import { NotFoundError } from '../../errors/index.js'
import { parsePagination, buildPaginationMeta } from '../../utils/pagination.js'

/**
 * Business rules live here, same shape as Branch/Device (which check their
 * parent exists before insert):
 *  - a recommendation cannot exist without a real, non-deleted incident AND
 *    a real, non-deleted runbook — both checked before insert, since
 *    well-formed UUIDs (checked by validation) say nothing about whether
 *    those rows actually exist;
 *  - create/update/delete are audited and outboxed in the same transaction.
 */
export const recommendationService = {
  async list(query) {
    const pagination = parsePagination(query)
    const filters = {
      incidentId: query.incidentId,
      runbookId: query.runbookId,
      status: query.status,
      search: query.search,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    }

    const [items, total] = await Promise.all([
      recommendationRepository.findAll(filters, pagination),
      recommendationRepository.count(filters),
    ])

    return {
      items,
      meta: buildPaginationMeta({ page: pagination.page, pageSize: pagination.pageSize, total }),
    }
  },

  async getById(id) {
    const recommendation = await recommendationRepository.findById(id)

    if (!recommendation) {
      throw new NotFoundError('Recommendation not found')
    }

    return recommendation
  },

  async create(data, actorUserId) {
    const [incident, runbook] = await Promise.all([
      incidentRepository.findById(data.incidentId),
      runbookRepository.findById(data.runbookId),
    ])

    if (!incident) {
      throw new NotFoundError('Cannot create a recommendation for an incident that does not exist')
    }

    if (!runbook) {
      throw new NotFoundError('Cannot create a recommendation for a runbook that does not exist')
    }

    return withTransaction(async (client) => {
      const created = await recommendationRepository.create({ ...data, createdBy: actorUserId ?? null }, client)

      await auditService.record(
        {
          entityType: 'recommendation',
          entityId: created.id,
          action: 'recommendation.created',
          actorUserId: actorUserId ?? null,
          metadata: { incidentId: created.incidentId, runbookId: created.runbookId },
        },
        client,
      )

      await outboxService.publish(
        { eventType: 'RecommendationCreated', aggregateType: 'recommendation', aggregateId: created.id, payload: created },
        client,
      )

      return created
    })
  },

  async update(id, data, actorUserId) {
    const existing = await recommendationRepository.findById(id)

    if (!existing) {
      throw new NotFoundError('Recommendation not found')
    }

    return withTransaction(async (client) => {
      const updated = await recommendationRepository.update(id, data, client)

      await auditService.record(
        {
          entityType: 'recommendation',
          entityId: id,
          action: 'recommendation.updated',
          actorUserId: actorUserId ?? null,
          metadata: { changes: data },
        },
        client,
      )

      await outboxService.publish(
        { eventType: 'RecommendationUpdated', aggregateType: 'recommendation', aggregateId: id, payload: updated },
        client,
      )

      return updated
    })
  },

  async remove(id, actorUserId) {
    const existing = await recommendationRepository.findById(id)

    if (!existing) {
      throw new NotFoundError('Recommendation not found')
    }

    await withTransaction(async (client) => {
      await recommendationRepository.softDelete(id, client)

      await auditService.record(
        {
          entityType: 'recommendation',
          entityId: id,
          action: 'recommendation.deleted',
          actorUserId: actorUserId ?? null,
          metadata: {},
        },
        client,
      )

      await outboxService.publish(
        { eventType: 'RecommendationDeleted', aggregateType: 'recommendation', aggregateId: id, payload: { id } },
        client,
      )
    })
  },
}
