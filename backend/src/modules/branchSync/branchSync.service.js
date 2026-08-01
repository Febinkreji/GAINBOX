import { randomUUID } from 'node:crypto'
import { branchRepository } from '../branch/branch.repository.js'
import { storeProvider } from '../branch/branch.providers.js'
import { providerLinkService } from '../providerLink/providerLink.service.js'
import { unwrapProviderMetadata } from '../providerLink/providerLinkMetadata.util.js'
import { syncHistoryRepository } from '../sync/syncHistory.repository.js'
import { NotFoundError, ConflictError } from '../../errors/index.js'
import { logger } from '../../logger/logger.js'
import { parsePagination, buildPaginationMeta } from '../../utils/pagination.js'

const ENTITY_TYPE = 'branch'
const PROVIDER = 'surfboard'

/**
 * Branch's own Surfboard Store sync — same shape as merchantSync.service.js
 * (Phase 1), one level down the entity hierarchy. `branch.service.js`'s
 * create() calls `startSync()` here instead of calling `storeProvider`
 * directly (see this module's own history: it used to be an inline
 * try/catch inside branch.service.js — moved here so the exact same
 * create-or-refresh logic backs both "sync on create" and the manual
 * "Refresh Sync" action, instead of being duplicated in two places).
 */

async function attemptSync({ branchId, correlationId, triggeredBy, actorUserId, existingHistoryId }) {
  const branch = await branchRepository.findById(branchId)

  if (!branch) {
    throw new NotFoundError('Branch not found')
  }

  const existingLink = await providerLinkService.checkExistingMapping(ENTITY_TYPE, branchId, PROVIDER)

  if (existingLink) {
    const historyRow = existingHistoryId
      ? await syncHistoryRepository.markSkipped(existingHistoryId, { reason: 'A provider mapping already exists' })
      : await syncHistoryRepository.create({
          entityType: ENTITY_TYPE,
          entityId: branchId,
          provider: PROVIDER,
          status: 'skipped',
          correlationId,
          triggeredBy,
          actorUserId,
        })

    logger.info(
      { branchId, correlationId, externalId: existingLink.externalId },
      'Duplicate Prevented — branch already has a Surfboard Store mapping, skipping sync',
    )

    // Duplicate Prevention only means "never call Create Store twice" —
    // it doesn't mean "never learn this store's current status again."
    // Same reasoning as merchantSync.service.js's own duplicate branch.
    try {
      const merchantLink = await providerLinkService.checkExistingMapping('merchant', branch.merchantId, PROVIDER)
      const merchantExternalId = unwrapProviderMetadata(merchantLink)?.merchantId

      if (merchantExternalId) {
        const statusResult = await storeProvider.getStoreStatus(merchantExternalId, existingLink.externalId)
        const currentMetadata = unwrapProviderMetadata(existingLink) ?? {}

        const updates = {}
        if (statusResult?.data?.status) updates.status = statusResult.data.status
        if (statusResult?.data?.onlineOnboardingStatus) updates.onlineOnboardingStatus = statusResult.data.onlineOnboardingStatus

        if (Object.keys(updates).length > 0) {
          await providerLinkService.updateLink(existingLink.id, { metadata: { ...currentMetadata, ...updates } })
        }
      }
    } catch (error) {
      logger.warn(
        { err: error, branchId, correlationId },
        'Refreshing Surfboard store status failed — duplicate-prevention result is unaffected',
      )
    }

    return {
      status: 'skipped',
      historyId: historyRow.id,
      externalId: existingLink.externalId,
      message: 'A Surfboard Store mapping already exists for this branch; sync was skipped to avoid a duplicate.',
    }
  }

  const historyRow = existingHistoryId
    ? await syncHistoryRepository.markRunning(existingHistoryId)
    : await syncHistoryRepository.create({
        entityType: ENTITY_TYPE,
        entityId: branchId,
        provider: PROVIDER,
        status: 'running',
        correlationId,
        triggeredBy,
        actorUserId,
      })

  logger.info({ branchId, correlationId, historyId: historyRow.id }, 'Sync Started')

  const startedAt = Date.now()

  try {
    // Lifecycle precondition: Create Store needs the merchant's *real*
    // Surfboard merchantId (only present once MERCHANT_CREATED) — not
    // just any provider_links row, and not the KYB applicationId that
    // link's own externalId holds. See Phase 2's own design notes for why
    // this distinction matters (Create Store 404s/403s against the wrong
    // id otherwise).
    const merchantLink = await providerLinkService.checkExistingMapping('merchant', branch.merchantId, PROVIDER)
    const merchantExternalId = unwrapProviderMetadata(merchantLink)?.merchantId

    if (!merchantExternalId) {
      throw new ConflictError(
        'Cannot create a Surfboard Store until the merchant has reached MERCHANT_CREATED',
      )
    }

    const result = await storeProvider.createStore(merchantExternalId, branch)

    const link = await providerLinkService.createLink({
      entityType: ENTITY_TYPE,
      entityId: branchId,
      provider: PROVIDER,
      externalId: result.externalId,
      metadata: result.metadata,
    })

    logger.info({ branchId, correlationId, externalId: link.externalId }, 'Provider Link Created')

    const durationMs = Date.now() - startedAt
    await syncHistoryRepository.markCompleted(historyRow.id, { durationMs })

    logger.info({ branchId, correlationId, historyId: historyRow.id, durationMs }, 'Sync Completed')

    return { status: 'completed', historyId: historyRow.id, externalId: link.externalId }
  } catch (error) {
    const durationMs = Date.now() - startedAt
    await syncHistoryRepository.markFailed(historyRow.id, { durationMs, errorMessage: error.message })

    logger.warn({ err: error, branchId, correlationId, historyId: historyRow.id, durationMs }, 'Sync Failed')

    return { status: 'failed', historyId: historyRow.id, errorMessage: error.message }
  }
}

export const branchSyncService = {
  /**
   * Manual Synchronization — Platform Admin's "Refresh Sync" action (also
   * the only caller of Create Store, via branch.service.js's create()).
   * Always creates a fresh sync_history row.
   */
  async startSync(branchId, { actorUserId } = {}) {
    const correlationId = randomUUID()
    return attemptSync({ branchId, correlationId, triggeredBy: 'manual', actorUserId })
  },

  /**
   * Synchronization Status — derived from the latest sync_history row plus
   * the provider_links mapping's stored metadata, never a separate column
   * (same reasoning as merchantSyncService.getStatus()).
   */
  async getStatus(branchId) {
    const branch = await branchRepository.findById(branchId)

    if (!branch) {
      throw new NotFoundError('Branch not found')
    }

    const [latest, link] = await Promise.all([
      syncHistoryRepository.findLatestForEntity(ENTITY_TYPE, branchId, PROVIDER),
      providerLinkService.findByEntity(ENTITY_TYPE, branchId, PROVIDER),
    ])

    const providerMetadata = unwrapProviderMetadata(link)

    return {
      branchId,
      provider: PROVIDER,
      connected: Boolean(link),
      surfboardStoreId: link?.externalId ?? null,
      // Surfboard's own Store status (`ACTIVE|DEACTIVATED|BLOCKED|INACTIVE`)
      // and online-onboarding status — populated once Fetch Store Details
      // has been called at least once (on create, or on a later refresh).
      storeStatus: providerMetadata?.status ?? null,
      onlineOnboardingStatus: providerMetadata?.onlineOnboardingStatus ?? null,
      syncStatus: latest?.status ?? 'never_started',
      lastSyncAt: latest?.startedAt ?? null,
      lastSyncResult: latest?.status ?? null,
      lastError: latest?.errorMessage ?? null,
    }
  },

  /** Synchronization History for one branch (Merchant Details' own view). */
  async getHistory(branchId, query) {
    const branch = await branchRepository.findById(branchId)

    if (!branch) {
      throw new NotFoundError('Branch not found')
    }

    const pagination = parsePagination(query)

    const [items, total] = await Promise.all([
      syncHistoryRepository.findByEntity(ENTITY_TYPE, branchId, PROVIDER, pagination),
      syncHistoryRepository.countByEntity(ENTITY_TYPE, branchId, PROVIDER),
    ])

    return { items, meta: buildPaginationMeta({ page: pagination.page, pageSize: pagination.pageSize, total }) }
  },

  /** Platform-wide Synchronization History (GET .../branches/history). */
  async getAllHistory(query) {
    const pagination = parsePagination(query)
    const filters = { entityType: ENTITY_TYPE, entityId: query.branchId, provider: PROVIDER, status: query.status }

    const [items, total] = await Promise.all([
      syncHistoryRepository.findAll(filters, pagination),
      syncHistoryRepository.count(filters),
    ])

    return { items, meta: buildPaginationMeta({ page: pagination.page, pageSize: pagination.pageSize, total }) }
  },
}
