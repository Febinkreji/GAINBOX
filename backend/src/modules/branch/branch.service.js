import { branchRepository } from './branch.repository.js'
import { merchantRepository } from '../merchant/merchant.repository.js'
import { branchSyncService } from '../branchSync/branchSync.service.js'
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
 *    branch creation always succeeds even if Surfboard Store sync doesn't
 *    (e.g. the merchant hasn't reached MERCHANT_CREATED yet, or this
 *    branch has no phone number yet — see branchSync.service.js).
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

    // Delegates to branchSyncService (Phase 2 — Store & Device
    // Integration), which owns Duplicate Prevention, the merchant-
    // MERCHANT_CREATED lifecycle check, and the actual Create Store call —
    // this is also exactly what the "Refresh Sync" action re-runs later,
    // so there's one code path for both instead of two copies of the same
    // create-or-refresh branching. Never thrown from here: startSync()
    // itself already turns an expected provider failure into a recorded
    // `sync_history` row, not an exception — this catch is only a safety
    // net for a genuine framework error, so branch creation still succeeds
    // either way.
    try {
      await branchSyncService.startSync(branch.id, { actorUserId })
    } catch (error) {
      logger.warn({ err: error, branchId: branch.id }, 'Surfboard store sync failed')
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
