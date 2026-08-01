import { randomUUID } from 'node:crypto'
import { merchantRepository } from '../merchant/merchant.repository.js'
import { merchantProvider } from '../merchant/merchant.providers.js'
import { merchantService } from '../merchant/merchant.service.js'
import { providerLinkService } from '../providerLink/providerLink.service.js'
import { syncHistoryRepository } from '../sync/syncHistory.repository.js'
import { outboxRepository } from '../outbox/outbox.repository.js'
import { NotFoundError } from '../../errors/index.js'
import { logger } from '../../logger/logger.js'
import { parsePagination, buildPaginationMeta } from '../../utils/pagination.js'

const ENTITY_TYPE = 'merchant'
const PROVIDER = 'surfboard'

/**
 * The Merchant Integration Framework's core (Sprint 2A). This is the ONLY
 * place that calls `merchantProvider.createMerchant()` — merchant.service.js
 * no longer does (see its docstring) — so there is exactly one call site to
 * change in Sprint 2B when the real adapter exists.
 *
 * Two entry points into the same underlying attempt logic:
 *  - processQueuedSync — the outbox worker's path (see
 *    merchantSyncOutbox.worker.js), resolving a `pending` row that was
 *    created transactionally alongside the merchant itself.
 *  - startSync — the Manual Sync path (see merchantSync.controller.js),
 *    which has no pre-existing row to resolve and creates one fresh.
 *
 * Neither path ever throws for an *expected* provider failure (including
 * today's constant NotImplementedError) — that's a normal, recorded
 * outcome (`status: 'failed'` in the returned summary and in sync_history),
 * not a bug. Only genuine framework errors (merchant not found, a DB
 * write failing) propagate, since those really are exceptional.
 */

async function attemptSync({ merchantId, correlationId, triggeredBy, actorUserId, existingHistoryId }) {
  const merchant = await merchantRepository.findById(merchantId)

  if (!merchant) {
    throw new NotFoundError('Merchant not found')
  }

  const existingLink = await providerLinkService.checkExistingMapping(ENTITY_TYPE, merchantId, PROVIDER)

  if (existingLink) {
    const historyRow = existingHistoryId
      ? await syncHistoryRepository.markSkipped(existingHistoryId, { reason: 'A provider mapping already exists' })
      : await syncHistoryRepository.create({
          entityType: ENTITY_TYPE,
          entityId: merchantId,
          provider: PROVIDER,
          status: 'skipped',
          correlationId,
          triggeredBy,
          actorUserId,
        })

    logger.info(
      { merchantId, correlationId, externalId: existingLink.externalId },
      'Duplicate Prevented — merchant already has a Surfboard mapping, skipping sync',
    )

    // Duplicate Prevention only ever meant "never call Create Merchant
    // twice" — it was never meant to also freeze this link's merchantId/
    // storeId/applicationStatus at whatever they were the day the mapping
    // was created. This is what "Refresh Surfboard Status" (this same
    // startSync() path) actually needs to do for an application still in
    // progress. Reuses merchant.service.js's own getStatus() (Check
    // Application Status + persist) rather than duplicating that logic
    // here. A refresh failure is logged, not thrown — it must never turn
    // an otherwise-successful "skipped" outcome into an error.
    try {
      await merchantService.getStatus(merchantId)
    } catch (error) {
      logger.warn(
        { err: error, merchantId, correlationId },
        'Refreshing Surfboard application status failed — duplicate-prevention result is unaffected',
      )
    }

    return {
      status: 'skipped',
      historyId: historyRow.id,
      externalId: existingLink.externalId,
      message: 'A Surfboard mapping already exists for this merchant; sync was skipped to avoid a duplicate.',
    }
  }

  const historyRow = existingHistoryId
    ? await syncHistoryRepository.markRunning(existingHistoryId)
    : await syncHistoryRepository.create({
        entityType: ENTITY_TYPE,
        entityId: merchantId,
        provider: PROVIDER,
        status: 'running',
        correlationId,
        triggeredBy,
        actorUserId,
      })

  logger.info({ merchantId, correlationId, historyId: historyRow.id }, 'Sync Started')

  const startedAt = Date.now()

  try {
    // Sprint 2A boundary: this call always throws NotImplementedError today
    // (see adapters/surfboardMerchantAdapter.js) — that's the expected,
    // designed-for outcome, not an error condition for this framework.
    // Sprint 2B replaces only the adapter; nothing here changes.
    const result = await merchantProvider.createMerchant(merchant)

    const link = await providerLinkService.createLink({
      entityType: ENTITY_TYPE,
      entityId: merchantId,
      provider: PROVIDER,
      externalId: result.externalId,
      // Only the adapter's `metadata` sub-object (applicationId, webKybUrl,
      // etc.) — not the whole `{ externalId, status, metadata }` result,
      // which would double-wrap it and silently break every later read
      // that expects a flat metadata shape (see merchantService.getStatus()
      // and merchantSyncService.getStatus(), both of which unwrap around
      // this exact mistake for rows written before this fix).
      metadata: result.metadata,
    })

    logger.info({ merchantId, correlationId, externalId: link.externalId }, 'Provider Link Created')

    const durationMs = Date.now() - startedAt
    await syncHistoryRepository.markCompleted(historyRow.id, { durationMs })

    logger.info({ merchantId, correlationId, historyId: historyRow.id, durationMs }, 'Sync Completed')

    return { status: 'completed', historyId: historyRow.id, externalId: link.externalId }
  } catch (error) {
    const durationMs = Date.now() - startedAt
    await syncHistoryRepository.markFailed(historyRow.id, { durationMs, errorMessage: error.message })

    logger.warn(
      { err: error, merchantId, correlationId, historyId: historyRow.id, durationMs },
      'Sync Failed',
    )

    return { status: 'failed', historyId: historyRow.id, errorMessage: error.message }
  }
}

export const merchantSyncService = {
  /**
   * Manual Synchronization — Platform Admin explicitly triggers this via
   * POST .../merchants/:merchantId/sync. Always creates a fresh
   * sync_history row (a manual re-sync is its own attempt, not a
   * continuation of whatever the last automatic one was).
   */
  async startSync(merchantId, { actorUserId } = {}) {
    const correlationId = randomUUID()
    return attemptSync({ merchantId, correlationId, triggeredBy: 'manual', actorUserId })
  },

  /**
   * The outbox worker's entry point — resolves the `pending` row created
   * inside merchant.service.js's own transaction, rather than creating a
   * new one, so "queued at merchant-creation time" and "attempted by the
   * worker" are visibly the same history entry.
   */
  async processQueuedSync({ merchantId, syncHistoryId, correlationId }) {
    return attemptSync({ merchantId, correlationId, triggeredBy: 'system', existingHistoryId: syncHistoryId })
  },

  /**
   * Synchronization Status — derived from the latest sync_history row plus
   * whether an active provider_links mapping exists, never a separate
   * stored column (see migration 0027's own comment on why).
   */
  async getStatus(merchantId) {
    const merchant = await merchantRepository.findById(merchantId)

    if (!merchant) {
      throw new NotFoundError('Merchant not found')
    }

    const [latest, link, pendingEvents] = await Promise.all([
      syncHistoryRepository.findLatestForEntity(ENTITY_TYPE, merchantId, PROVIDER),
      providerLinkService.findByEntity(ENTITY_TYPE, merchantId, PROVIDER),
      countPendingSyncEvents(merchantId),
    ])

    // attemptSync()'s create branch now writes a flat `metadata` (just
    // `result.metadata`), and merchant.service.js's getStatus() self-heals
    // any row it refreshes onto the same flat shape — but rows created
    // before that fix (and never since refreshed) still have the old
    // double-wrapped shape (`{ externalId, status, metadata: {...} }`).
    // Unwrapping defensively here means this read works for both without
    // needing a data migration.
    const providerMetadata = link?.metadata?.metadata ?? link?.metadata ?? null

    return {
      merchantId,
      provider: PROVIDER,
      connected: Boolean(link),
      externalId: link?.externalId ?? null,
      // The KYB link Surfboard generates on a successful Create Merchant
      // call — stored in provider_links.metadata by attemptSync() above,
      // never a separate column (same "derive, don't duplicate" reasoning
      // as the rest of this status object). Lets Platform Admin complete
      // the merchant's Surfboard application from Merchant Details.
      webKybUrl: providerMetadata?.webKybUrl ?? null,
      // Surfboard's own merchant id — distinct from the GainBox `merchantId`
      // above (that's this route's own path param). Populated once Check
      // Application Status or the "Application Merchant Created" webhook
      // confirms MERCHANT_CREATED (see merchant.service.js's getStatus() and
      // webhook.service.js) — null until then. The frontend uses this, not
      // `syncStatus`, to know whether onboarding has actually finished,
      // since a "completed" sync only means Create Merchant succeeded, not
      // that the merchant exists yet on Surfboard's side.
      surfboardMerchantId: providerMetadata?.merchantId ?? null,
      // Surfboard's own store id — same "populated once MERCHANT_CREATED"
      // rule as surfboardMerchantId above.
      surfboardStoreId: providerMetadata?.storeId ?? null,
      // The raw Surfboard application status (APPLICATION_INITIATED |
      // APPLICATION_SUBMITTED | APPLICATION_PENDING_INFORMATION |
      // APPLICATION_SIGNED | APPLICATION_COMPLETED | MERCHANT_CREATED |
      // APPLICATION_REJECTED | APPLICATION_EXPIRED) — null until the first
      // successful Check Application Status call persists it.
      applicationStatus: providerMetadata?.applicationStatus ?? null,
      paymentMethods: providerMetadata?.paymentMethods ?? null,
      billingPlans: providerMetadata?.billingPlans ?? null,
      syncStatus: latest?.status ?? 'never_started',
      lastSyncAt: latest?.startedAt ?? null,
      lastSyncResult: latest?.status ?? null,
      lastError: latest?.errorMessage ?? null,
      pendingEvents,
    }
  },

  /** Synchronization History for one merchant (Merchant Details' own view). */
  async getHistory(merchantId, query) {
    const merchant = await merchantRepository.findById(merchantId)

    if (!merchant) {
      throw new NotFoundError('Merchant not found')
    }

    const pagination = parsePagination(query)

    const [items, total] = await Promise.all([
      syncHistoryRepository.findByEntity(ENTITY_TYPE, merchantId, PROVIDER, pagination),
      syncHistoryRepository.countByEntity(ENTITY_TYPE, merchantId, PROVIDER),
    ])

    return { items, meta: buildPaginationMeta({ page: pagination.page, pageSize: pagination.pageSize, total }) }
  },

  /**
   * Platform-wide Synchronization History (GET .../merchants/history) —
   * `merchantId` is an optional filter, not a separate route, so the same
   * endpoint serves both the admin-wide activity view and (via
   * ?merchantId=) the per-merchant one the UI actually uses today.
   */
  async getAllHistory(query) {
    const pagination = parsePagination(query)
    const filters = { entityType: ENTITY_TYPE, entityId: query.merchantId, provider: PROVIDER, status: query.status }

    const [items, total] = await Promise.all([
      syncHistoryRepository.findAll(filters, pagination),
      syncHistoryRepository.count(filters),
    ])

    return { items, meta: buildPaginationMeta({ page: pagination.page, pageSize: pagination.pageSize, total }) }
  },
}

/**
 * Reaches into outboxRepository directly (not outboxService, which only
 * exposes `publish`) — this is a read for the Sync Status view ("Pending
 * Events"), not part of the transactional-outbox write path.
 */
async function countPendingSyncEvents(merchantId) {
  return outboxRepository.countPendingForAggregate('merchant', merchantId, 'SurfboardMerchantSyncRequested')
}
