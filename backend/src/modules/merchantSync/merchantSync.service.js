import { randomUUID } from 'node:crypto'
import { merchantRepository } from '../merchant/merchant.repository.js'
import { merchantProvider } from '../merchant/merchant.providers.js'
import { providerLinkService } from '../providerLink/providerLink.service.js'
import { syncHistoryRepository } from '../sync/syncHistory.repository.js'
import { outboxRepository } from '../outbox/outbox.repository.js'
import { NotFoundError, ConflictError, ValidationError } from '../../errors/index.js'
import { isProduction } from '../../config/env.js'
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
      metadata: result,
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
   * Demo-only simulated onboarding — NOT a real Surfboard connection.
   * Exists because this integration is currently blocked on an external,
   * account-level gap (the partner account has no transaction pricing plan
   * provisioned — see docs/architecture/SURFBOARD_INTEGRATION.md's Known
   * Limitations), which no amount of GainBox code can resolve. Fabricates
   * an obviously-fake applicationId/merchantId/storeId, clearly flagged
   * `metadata.simulated: true` everywhere it's stored, so it can never be
   * mistaken for a genuine provider_links mapping created by attemptSync()
   * above. Disabled outright in production as a safety rail — this is a
   * demo aid, not a feature real deployments should ever expose.
   */
  async simulateOnboarding(merchantId, { actorUserId } = {}) {
    if (isProduction) {
      throw new ValidationError('Simulated onboarding is a demo-only feature and is disabled in production')
    }

    const merchant = await merchantRepository.findById(merchantId)

    if (!merchant) {
      throw new NotFoundError('Merchant not found')
    }

    const existingLink = await providerLinkService.checkExistingMapping(ENTITY_TYPE, merchantId, PROVIDER)

    if (existingLink) {
      throw new ConflictError('A Surfboard mapping already exists for this merchant')
    }

    const correlationId = randomUUID()
    const fakeApplicationId = `DEMO-APP-${randomUUID()}`
    const fakeMerchantId = `DEMO-MERCHANT-${randomUUID()}`
    const fakeStoreId = `DEMO-STORE-${randomUUID()}`

    const historyRow = await syncHistoryRepository.create({
      entityType: ENTITY_TYPE,
      entityId: merchantId,
      provider: PROVIDER,
      status: 'running',
      correlationId,
      triggeredBy: 'manual',
      actorUserId,
    })

    const link = await providerLinkService.createLink({
      entityType: ENTITY_TYPE,
      entityId: merchantId,
      provider: PROVIDER,
      externalId: fakeApplicationId,
      metadata: {
        simulated: true,
        applicationId: fakeApplicationId,
        merchantId: fakeMerchantId,
        storeId: fakeStoreId,
        message: 'Simulated onboarding — not a real Surfboard connection. Generated for demo purposes only.',
      },
    })

    await syncHistoryRepository.markCompleted(historyRow.id, { durationMs: 0 })

    logger.warn(
      { merchantId, correlationId, externalId: link.externalId },
      'Simulated Surfboard Onboarding — demo mode only, NOT a real connection',
    )

    return {
      status: 'completed',
      historyId: historyRow.id,
      externalId: link.externalId,
      simulated: true,
    }
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
      webKybUrl: link?.metadata?.webKybUrl ?? null,
      // True only for links created by simulateOnboarding() (demo mode) —
      // lets the UI visibly distinguish a fake connection from a real one.
      simulated: link?.metadata?.simulated ?? false,
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
