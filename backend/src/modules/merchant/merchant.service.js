import { randomUUID } from 'node:crypto'
import { merchantRepository } from './merchant.repository.js'
import { merchantProvider } from './merchant.providers.js'
import { providerLinkService } from '../providerLink/providerLink.service.js'
import { auditService } from '../audit/audit.service.js'
import { outboxService } from '../outbox/outbox.service.js'
import { syncHistoryRepository } from '../sync/syncHistory.repository.js'
import { withTransaction } from '../../database/connection.js'
import { NotFoundError, ConflictError, ValidationError } from '../../errors/index.js'
import { logger } from '../../logger/logger.js'
import { parsePagination, buildPaginationMeta } from '../../utils/pagination.js'

/**
 * Business rules live here, not in the repository or controller:
 *  - a merchant is always born `pending` (enforced by simply never passing
 *    `status` through to INSERT — the DB column default is the single
 *    source of truth for that rule, see migration 0007);
 *  - create/update/delete are audited and outboxed in the same DB
 *    transaction as the write itself, so the two can never disagree;
 *  - Surfboard sync is requested (not performed) here, via the same
 *    transactional outbox: a `sync_history` row is created `pending` and a
 *    `SurfboardMerchantSyncRequested` event is published, both inside this
 *    transaction, so "merchant created" and "sync requested" can never
 *    disagree with each other. This module no longer calls
 *    `merchantProvider` at all — see merchantSync.service.js, the only
 *    place that does now, and merchantSyncOutbox.worker.js, which is what
 *    actually picks this event up and calls it, entirely outside this
 *    request. That's what makes "merchant creation must succeed even if
 *    synchronization fails" true structurally, not just by convention.
 *
 * `create`'s optional third argument (`client`) is the one addition Merchant
 * Onboarding required: when supplied, create() writes through that
 * already-open transaction instead of opening its own, so
 * MerchantOnboardingService can wrap "create merchant + link/invite owner"
 * in one atomic transaction — see merchantOnboarding.service.js. Every
 * existing caller (e.g. merchantController.create) omits it and gets its
 * own transaction instead; either way, the sync request is queued in the
 * same transaction as the merchant itself.
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

  async create(data, actorUserId, client) {
    const insert = async (txClient) => {
      const created = await merchantRepository.create({ ...data, createdBy: actorUserId ?? null }, txClient)

      await auditService.record(
        {
          entityType: 'merchant',
          entityId: created.id,
          action: 'merchant.created',
          actorUserId: actorUserId ?? null,
          metadata: { businessName: created.businessName, businessType: created.businessType },
        },
        txClient,
      )

      await outboxService.publish(
        {
          eventType: 'MerchantCreated',
          aggregateType: 'merchant',
          aggregateId: created.id,
          payload: created,
        },
        txClient,
      )

      // Queues the Surfboard sync — never calls it. A `pending` history
      // row + an outbox event, both in this same transaction, so a rolled-
      // back merchant creation can never leave a sync request behind for
      // one that doesn't exist.
      const correlationId = randomUUID()

      const syncHistoryRow = await syncHistoryRepository.create(
        { entityType: 'merchant', entityId: created.id, provider: 'surfboard', status: 'pending', correlationId },
        txClient,
      )

      await outboxService.publish(
        {
          eventType: 'SurfboardMerchantSyncRequested',
          aggregateType: 'merchant',
          aggregateId: created.id,
          payload: { merchantId: created.id, syncHistoryId: syncHistoryRow.id, correlationId },
        },
        txClient,
      )

      logger.info(
        { merchantId: created.id, correlationId, syncHistoryId: syncHistoryRow.id },
        'Sync Requested — Outbox Published',
      )

      return created
    }

    return client ? insert(client) : withTransaction(insert)
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

  /**
   * Platform Administration's dedicated "Activate"/"Deactivate" actions
   * (Step 1) — both reuse update()'s existing validation/transaction/audit
   * for the actual status write, and only add a second, more specific
   * audit entry ('merchant.activated'/'merchant.deactivated') on top of
   * update()'s generic 'merchant.updated' one, so the audit trail can
   * distinguish a lifecycle transition from an ordinary detail edit without
   * duplicating any of update()'s SQL or business rules.
   */
  async activate(id, actorUserId) {
    const existing = await this.getById(id)

    if (existing.status === 'active') {
      throw new ConflictError('Merchant is already active')
    }

    const merchant = await this.update(id, { status: 'active' }, actorUserId)

    await auditService.record({
      entityType: 'merchant',
      entityId: id,
      action: 'merchant.activated',
      actorUserId: actorUserId ?? null,
      metadata: { previousStatus: existing.status },
    })

    return merchant
  },

  async deactivate(id, actorUserId) {
    const existing = await this.getById(id)

    if (existing.status === 'suspended') {
      throw new ConflictError('Merchant is already suspended')
    }

    const merchant = await this.update(id, { status: 'suspended' }, actorUserId)

    await auditService.record({
      entityType: 'merchant',
      entityId: id,
      action: 'merchant.deactivated',
      actorUserId: actorUserId ?? null,
      metadata: { previousStatus: existing.status },
    })

    return merchant
  },

  /**
   * Merchant Status (Get Merchant Status) — requires a `merchant`
   * ProviderLink to already exist (its `externalId` is the Surfboard
   * applicationId this endpoint takes). Note: Merchant Creation's own
   * response-mapping gap (see surfboardMerchantAdapter.js's createMerchant)
   * means no merchant has ever actually gotten one yet, so this will throw
   * ValidationError for every merchant today — that's an existing,
   * documented blocker, not a bug in this method.
   */
  async getStatus(id) {
    await this.getById(id)

    const link = await providerLinkService.checkExistingMapping('merchant', id, 'surfboard')

    if (!link) {
      throw new ValidationError('Merchant status cannot be checked via Surfboard — no Surfboard mapping exists yet', {
        merchantId: id,
      })
    }

    const result = await merchantProvider.getMerchantStatus(link.externalId)

    const newMerchantId = result?.data?.merchantId
    const newStoreId = result?.data?.storeId

    if (newMerchantId || newStoreId) {
      await providerLinkService.updateLink(link.id, {
        metadata: {
          ...link.metadata,
          ...(newMerchantId ? { merchantId: newMerchantId } : {}),
          ...(newStoreId ? { storeId: newStoreId } : {}),
        },
      })
    }

    return result
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
