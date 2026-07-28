import { merchantRepository } from './merchant.repository.js'
import { merchantProvider } from './merchant.providers.js'
import { auditService } from '../audit/audit.service.js'
import { outboxService } from '../outbox/outbox.service.js'
import { withTransaction } from '../../database/connection.js'
import { NotFoundError } from '../../errors/index.js'
import { logger } from '../../logger/logger.js'
import { parsePagination, buildPaginationMeta } from '../../utils/pagination.js'

/**
 * Business rules live here, not in the repository or controller:
 *  - a merchant is always born `pending` (enforced by simply never passing
 *    `status` through to INSERT — the DB column default is the single
 *    source of truth for that rule, see migration 0007);
 *  - create/update/delete are audited and outboxed in the same DB
 *    transaction as the write itself, so the two can never disagree;
 *  - the Surfboard sync call happens *after* that transaction commits
 *    (an external HTTP call has no business holding a DB connection open),
 *    and its failure is caught and logged rather than failing the request —
 *    NotImplementedError is the *expected* state right now, not a bug.
 */
export const merchantService = {
  async list(query) {
    const pagination = parsePagination(query)
    const filters = {
      status: query.status,
      businessType: query.businessType,
      search: query.search,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    }

    const [items, total] = await Promise.all([
      merchantRepository.findAll(filters, pagination),
      merchantRepository.count(filters),
    ])

    return {
      items,
      meta: buildPaginationMeta({ page: pagination.page, pageSize: pagination.pageSize, total }),
    }
  },

  async getById(id) {
    const merchant = await merchantRepository.findById(id)

    if (!merchant) {
      throw new NotFoundError('Merchant not found')
    }

    return merchant
  },

  async create(data, actorUserId) {
    const merchant = await withTransaction(async (client) => {
      const created = await merchantRepository.create({ ...data, createdBy: actorUserId ?? null }, client)

      await auditService.record(
        {
          entityType: 'merchant',
          entityId: created.id,
          action: 'merchant.created',
          actorUserId: actorUserId ?? null,
          metadata: { businessName: created.businessName, businessType: created.businessType },
        },
        client,
      )

      await outboxService.publish(
        {
          eventType: 'MerchantCreated',
          aggregateType: 'merchant',
          aggregateId: created.id,
          payload: created,
        },
        client,
      )

      return created
    })

    try {
      await merchantProvider.createMerchant(merchant)
    } catch (error) {
      logger.warn({ err: error, merchantId: merchant.id }, 'Surfboard merchant sync is not implemented yet')
    }

    return merchant
  },

  async update(id, data, actorUserId) {
    const existing = await merchantRepository.findById(id)

    if (!existing) {
      throw new NotFoundError('Merchant not found')
    }

    return withTransaction(async (client) => {
      const updated = await merchantRepository.update(id, { ...data, updatedBy: actorUserId ?? null }, client)

      await auditService.record(
        {
          entityType: 'merchant',
          entityId: id,
          action: 'merchant.updated',
          actorUserId: actorUserId ?? null,
          metadata: { changes: data },
        },
        client,
      )

      return updated
    })
  },

  async remove(id, actorUserId) {
    const existing = await merchantRepository.findById(id)

    if (!existing) {
      throw new NotFoundError('Merchant not found')
    }

    await withTransaction(async (client) => {
      await merchantRepository.softDelete(id, client)

      await auditService.record(
        {
          entityType: 'merchant',
          entityId: id,
          action: 'merchant.deleted',
          actorUserId: actorUserId ?? null,
          metadata: {},
        },
        client,
      )
    })
  },
}
