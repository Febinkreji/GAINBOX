import { incidentRepository } from './incident.repository.js'
import { auditService } from '../audit/audit.service.js'
import { outboxService } from '../outbox/outbox.service.js'
import { withTransaction } from '../../database/connection.js'
import { NotFoundError } from '../../errors/index.js'
import { parsePagination, buildPaginationMeta } from '../../utils/pagination.js'

/**
 * Business rules live here, same shape as Merchant/Branch/Device:
 *  - an incident is always born with severity/status defaulting to
 *    'medium'/'open' (DB defaults, never passed through on create unless
 *    explicitly provided — see incident.validation.js allowing an optional
 *    initial severity);
 *  - create/update/delete are audited and outboxed in the same DB
 *    transaction as the write itself.
 *
 * No Surfboard integration point — an incident is a pure GainBox
 * operational concept, same reasoning as Membership.
 */
export const incidentService = {
  async list(query) {
    const pagination = parsePagination(query)
    const filters = {
      status: query.status,
      severity: query.severity,
      category: query.category,
      merchantId: query.merchantId,
      branchId: query.branchId,
      deviceId: query.deviceId,
      assignedTo: query.assignedTo,
      search: query.search,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    }

    const [items, total] = await Promise.all([
      incidentRepository.findAll(filters, pagination),
      incidentRepository.count(filters),
    ])

    return {
      items,
      meta: buildPaginationMeta({ page: pagination.page, pageSize: pagination.pageSize, total }),
    }
  },

  async getById(id) {
    const incident = await incidentRepository.findById(id)

    if (!incident) {
      throw new NotFoundError('Incident not found')
    }

    return incident
  },

  async create(data, actorUserId) {
    return withTransaction(async (client) => {
      const created = await incidentRepository.create({ ...data, createdBy: actorUserId ?? null }, client)

      await auditService.record(
        {
          entityType: 'incident',
          entityId: created.id,
          action: 'incident.created',
          actorUserId: actorUserId ?? null,
          metadata: { title: created.title, severity: created.severity, category: created.category },
        },
        client,
      )

      await outboxService.publish(
        { eventType: 'IncidentCreated', aggregateType: 'incident', aggregateId: created.id, payload: created },
        client,
      )

      return created
    })
  },

  async update(id, data, actorUserId) {
    const existing = await incidentRepository.findById(id)

    if (!existing) {
      throw new NotFoundError('Incident not found')
    }

    return withTransaction(async (client) => {
      const updated = await incidentRepository.update(id, data, client)

      await auditService.record(
        {
          entityType: 'incident',
          entityId: id,
          action: 'incident.updated',
          actorUserId: actorUserId ?? null,
          metadata: { changes: data },
        },
        client,
      )

      await outboxService.publish(
        { eventType: 'IncidentUpdated', aggregateType: 'incident', aggregateId: id, payload: updated },
        client,
      )

      return updated
    })
  },

  async remove(id, actorUserId) {
    const existing = await incidentRepository.findById(id)

    if (!existing) {
      throw new NotFoundError('Incident not found')
    }

    await withTransaction(async (client) => {
      await incidentRepository.softDelete(id, client)

      await auditService.record(
        {
          entityType: 'incident',
          entityId: id,
          action: 'incident.deleted',
          actorUserId: actorUserId ?? null,
          metadata: {},
        },
        client,
      )

      await outboxService.publish(
        { eventType: 'IncidentDeleted', aggregateType: 'incident', aggregateId: id, payload: { id } },
        client,
      )
    })
  },
}
