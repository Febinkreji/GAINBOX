import { branchRepository } from './branch.repository.js'
import { merchantRepository } from '../merchant/merchant.repository.js'
import { storeProvider } from './branch.providers.js'
import { auditService } from '../audit/audit.service.js'
import { outboxService } from '../outbox/outbox.service.js'
import { withTransaction } from '../../database/connection.js'
import { NotFoundError } from '../../errors/index.js'
import { logger } from '../../logger/logger.js'
import { parsePagination, buildPaginationMeta } from '../../utils/pagination.js'

/**
 * Business rules live here, not in the repository or controller:
 *  - a branch cannot exist without a real, non-deleted merchant — enforced
 *    by an explicit existence check before insert, since merchant_id being
 *    a well-formed UUID (checked by validation) says nothing about whether
 *    that merchant actually exists;
 *  - create/update/delete are audited and outboxed in the same DB
 *    transaction as the write itself, mirroring merchant.service.js;
 *  - the Surfboard sync call happens after that transaction commits, and
 *    its failure is caught and logged rather than failing the request —
 *    NotImplementedError is the expected state right now, not a bug.
 */
export const branchService = {
  async list(query, accessibleMerchantIds) {
    const pagination = parsePagination(query)
    const filters = {
      merchantId: query.merchantId,
      merchantIds: accessibleMerchantIds,
      status: query.status,
      search: query.search,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    }

    const [items, total] = await Promise.all([
      branchRepository.findAll(filters, pagination),
      branchRepository.count(filters),
    ])

    return {
      items,
      meta: buildPaginationMeta({ page: pagination.page, pageSize: pagination.pageSize, total }),
    }
  },

  async getById(id) {
    const branch = await branchRepository.findById(id)

    if (!branch) {
      throw new NotFoundError('Branch not found')
    }

    return branch
  },

  async create(data, actorUserId) {
    const merchant = await merchantRepository.findById(data.merchantId)

    if (!merchant) {
      throw new NotFoundError('Cannot create a branch for a merchant that does not exist')
    }

    const branch = await withTransaction(async (client) => {
      const created = await branchRepository.create({ ...data, createdBy: actorUserId ?? null }, client)

      await auditService.record(
        {
          entityType: 'branch',
          entityId: created.id,
          action: 'branch.created',
          actorUserId: actorUserId ?? null,
          metadata: { merchantId: created.merchantId, name: created.name, city: created.city },
        },
        client,
      )

      await outboxService.publish(
        {
          eventType: 'BranchCreated',
          aggregateType: 'branch',
          aggregateId: created.id,
          payload: created,
        },
        client,
      )

      return created
    })

    try {
      // Placeholder arg: once provider_links is populated, this should
      // resolve the merchant's real Surfboard external id first. Passing
      // the GainBox merchantId for now is enough to prove the port/adapter
      // wiring, since the adapter throws regardless of its arguments.
      await storeProvider.createStore(branch.merchantId, branch)
    } catch (error) {
      logger.warn({ err: error, branchId: branch.id }, 'Surfboard store sync is not implemented yet')
    }

    return branch
  },

  async update(id, data, actorUserId) {
    const existing = await branchRepository.findById(id)

    if (!existing) {
      throw new NotFoundError('Branch not found')
    }

    return withTransaction(async (client) => {
      const updated = await branchRepository.update(id, { ...data, updatedBy: actorUserId ?? null }, client)

      await auditService.record(
        {
          entityType: 'branch',
          entityId: id,
          action: 'branch.updated',
          actorUserId: actorUserId ?? null,
          metadata: { changes: data },
        },
        client,
      )

      await outboxService.publish(
        {
          eventType: 'BranchUpdated',
          aggregateType: 'branch',
          aggregateId: id,
          payload: updated,
        },
        client,
      )

      return updated
    })
  },

  async remove(id, actorUserId) {
    const existing = await branchRepository.findById(id)

    if (!existing) {
      throw new NotFoundError('Branch not found')
    }

    await withTransaction(async (client) => {
      await branchRepository.softDelete(id, client)

      await auditService.record(
        {
          entityType: 'branch',
          entityId: id,
          action: 'branch.deleted',
          actorUserId: actorUserId ?? null,
          metadata: {},
        },
        client,
      )

      await outboxService.publish(
        {
          eventType: 'BranchDeleted',
          aggregateType: 'branch',
          aggregateId: id,
          payload: { id },
        },
        client,
      )
    })
  },
}
