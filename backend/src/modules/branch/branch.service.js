import { branchRepository } from './branch.repository.js'
import { merchantRepository } from '../merchant/merchant.repository.js'
import { storeProvider } from './branch.providers.js'
import { providerLinkService } from '../providerLink/providerLink.service.js'
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
      // Store Capabilities is scoped under Surfboard's own merchant id
      // (/partners/{partnerId}/merchants/{merchantExternalId}/stores) — not
      // GainBox's merchant.id. That mapping lives in provider_links,
      // written once Merchant Creation's own success response is
      // confirmed (see surfboardMerchantAdapter.js) — until then, no
      // merchant has one yet, so this is skipped rather than sent with a
      // meaningless id.
      const merchantLink = await providerLinkService.checkExistingMapping('merchant', branch.merchantId, 'surfboard')

      if (!merchantLink) {
        logger.warn(
          { branchId: branch.id, merchantId: branch.merchantId },
          'Surfboard store sync skipped — merchant has no Surfboard mapping yet',
        )
      } else {
        const result = await storeProvider.createStore(merchantLink.externalId, branch)

        await providerLinkService.createLink({
          entityType: 'branch',
          entityId: branch.id,
          provider: 'surfboard',
          externalId: result.externalId,
          metadata: result.metadata,
        })
      }
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
