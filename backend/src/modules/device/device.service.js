import { deviceRepository } from './device.repository.js'
import { branchRepository } from '../branch/branch.repository.js'
import { deviceProvider } from './device.providers.js'
import { auditService } from '../audit/audit.service.js'
import { outboxService } from '../outbox/outbox.service.js'
import { withTransaction } from '../../database/connection.js'
import { NotFoundError } from '../../errors/index.js'
import { logger } from '../../logger/logger.js'
import { parsePagination, buildPaginationMeta } from '../../utils/pagination.js'

/**
 * Business rules live here, not in the repository or controller — same
 * shape as merchant.service.js / branch.service.js:
 *  - a device cannot exist without a real, non-deleted branch — an explicit
 *    existence check before insert (branchId being a well-formed UUID,
 *    checked by validation, says nothing about whether that branch exists);
 *  - a device is always born "registered" (DB default, never client-set —
 *    same enforcement-by-omission pattern as Merchant/Branch's status);
 *  - create/update/delete are audited and outboxed in the same DB
 *    transaction as the write itself;
 *  - the Surfboard sync call happens after that transaction commits, and
 *    its failure is caught and logged rather than failing the request.
 *
 * Note on this module's history: the original foundation-stage stub
 * exposed separate register/deactivate/configureBranding/configureTips
 * actions. This implementation consolidates them into the same generic
 * create/list/get/update/soft-delete shape Merchant and Branch use —
 * brandingConfig/tipConfig are just two more updatable fields on the
 * standard PATCH. The port's configureBranding/configureTips/reassignDevice
 * methods still exist and still work as an interface; nothing calls them
 * yet, matching the scope actually requested (see the implementation
 * report's "assumptions made" section).
 */
export const deviceService = {
  async list(query, accessibleMerchantIds) {
    const pagination = parsePagination(query)
    const filters = {
      branchId: query.branchId,
      merchantIds: accessibleMerchantIds,
      status: query.status,
      search: query.search,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    }

    const [items, total] = await Promise.all([
      deviceRepository.findAll(filters, pagination),
      deviceRepository.count(filters),
    ])

    return {
      items,
      meta: buildPaginationMeta({ page: pagination.page, pageSize: pagination.pageSize, total }),
    }
  },

  async getById(id) {
    const device = await deviceRepository.findById(id)

    if (!device) {
      throw new NotFoundError('Device not found')
    }

    return device
  },

  async create(data, actorUserId) {
    const branch = await branchRepository.findById(data.branchId)

    if (!branch) {
      throw new NotFoundError('Cannot register a device for a branch that does not exist')
    }

    const device = await withTransaction(async (client) => {
      const created = await deviceRepository.create({ ...data, createdBy: actorUserId ?? null }, client)

      await auditService.record(
        {
          entityType: 'device',
          entityId: created.id,
          action: 'device.created',
          actorUserId: actorUserId ?? null,
          metadata: { branchId: created.branchId, label: created.label },
        },
        client,
      )

      await outboxService.publish(
        {
          eventType: 'DeviceCreated',
          aggregateType: 'device',
          aggregateId: created.id,
          payload: created,
        },
        client,
      )

      return created
    })

    try {
      // Placeholder arg: once provider_links is populated, this should
      // resolve the branch's real Surfboard external store id first.
      // Passing the GainBox branchId for now is enough to prove the
      // port/adapter wiring, since the adapter throws regardless of its
      // arguments — same approach as branch.service.js's storeProvider call.
      await deviceProvider.registerDevice(device.branchId, device)
    } catch (error) {
      logger.warn({ err: error, deviceId: device.id }, 'Surfboard device sync is not implemented yet')
    }

    return device
  },

  async update(id, data, actorUserId) {
    const existing = await deviceRepository.findById(id)

    if (!existing) {
      throw new NotFoundError('Device not found')
    }

    return withTransaction(async (client) => {
      const updated = await deviceRepository.update(id, { ...data, updatedBy: actorUserId ?? null }, client)

      await auditService.record(
        {
          entityType: 'device',
          entityId: id,
          action: 'device.updated',
          actorUserId: actorUserId ?? null,
          metadata: { changes: data },
        },
        client,
      )

      await outboxService.publish(
        {
          eventType: 'DeviceUpdated',
          aggregateType: 'device',
          aggregateId: id,
          payload: updated,
        },
        client,
      )

      return updated
    })
  },

  async remove(id, actorUserId) {
    const existing = await deviceRepository.findById(id)

    if (!existing) {
      throw new NotFoundError('Device not found')
    }

    await withTransaction(async (client) => {
      await deviceRepository.softDelete(id, client)

      await auditService.record(
        {
          entityType: 'device',
          entityId: id,
          action: 'device.deleted',
          actorUserId: actorUserId ?? null,
          metadata: {},
        },
        client,
      )

      await outboxService.publish(
        {
          eventType: 'DeviceDeleted',
          aggregateType: 'device',
          aggregateId: id,
          payload: { id },
        },
        client,
      )
    })
  },
}
