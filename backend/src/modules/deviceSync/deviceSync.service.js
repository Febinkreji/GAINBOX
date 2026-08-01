import { randomUUID } from 'node:crypto'
import { deviceRepository } from '../device/device.repository.js'
import { branchRepository } from '../branch/branch.repository.js'
import { deviceProvider } from '../device/device.providers.js'
import { providerLinkService } from '../providerLink/providerLink.service.js'
import { unwrapProviderMetadata } from '../providerLink/providerLinkMetadata.util.js'
import { syncHistoryRepository } from '../sync/syncHistory.repository.js'
import { NotFoundError, ConflictError } from '../../errors/index.js'
import { logger } from '../../logger/logger.js'
import { parsePagination, buildPaginationMeta } from '../../utils/pagination.js'

const ENTITY_TYPE = 'device'
const PROVIDER = 'surfboard'

/**
 * Device's own Surfboard Terminal sync — same shape as
 * branchSync.service.js, one level further down the entity hierarchy
 * (Merchant -> Branch/Store -> Device/Terminal). `device.service.js`'s
 * create() calls `startSync()` here instead of calling `deviceProvider`
 * directly, same consolidation reasoning as branchSync.service.js.
 */

async function attemptSync({ deviceId, correlationId, triggeredBy, actorUserId, existingHistoryId }) {
  const device = await deviceRepository.findById(deviceId)

  if (!device) {
    throw new NotFoundError('Device not found')
  }

  const branch = await branchRepository.findById(device.branchId)

  if (!branch) {
    throw new NotFoundError('Cannot sync a device whose branch no longer exists')
  }

  const existingLink = await providerLinkService.checkExistingMapping(ENTITY_TYPE, deviceId, PROVIDER)

  if (existingLink) {
    const historyRow = existingHistoryId
      ? await syncHistoryRepository.markSkipped(existingHistoryId, { reason: 'A provider mapping already exists' })
      : await syncHistoryRepository.create({
          entityType: ENTITY_TYPE,
          entityId: deviceId,
          provider: PROVIDER,
          status: 'skipped',
          correlationId,
          triggeredBy,
          actorUserId,
        })

    logger.info(
      { deviceId, correlationId, externalId: existingLink.externalId },
      'Duplicate Prevented — device already has a Surfboard Terminal mapping, skipping sync',
    )

    // Duplicate Prevention only means "never call Register Terminal twice"
    // — it doesn't mean "never learn this terminal's current telemetry
    // again." Same reasoning as branchSync.service.js's own duplicate branch.
    try {
      const merchantLink = await providerLinkService.checkExistingMapping('merchant', branch.merchantId, PROVIDER)
      const merchantExternalId = unwrapProviderMetadata(merchantLink)?.merchantId

      if (merchantExternalId) {
        const statusResult = await deviceProvider.getTerminalStatus(merchantExternalId, existingLink.externalId)
        const currentMetadata = unwrapProviderMetadata(existingLink) ?? {}
        const data = statusResult?.data ?? {}

        const updates = {}
        if (data.terminalStatus) updates.terminalStatus = data.terminalStatus
        if (data.lastAliveAt) updates.lastAliveAt = data.lastAliveAt
        if (data.batteryPercentage !== undefined) updates.batteryPercentage = data.batteryPercentage
        if (data.isCharging !== undefined) updates.isCharging = data.isCharging
        if (data.powerSource) updates.powerSource = data.powerSource
        if (data.deviceNetwork) updates.deviceNetwork = data.deviceNetwork
        if (data.terminalType) updates.terminalType = data.terminalType
        if (data.serialNo) updates.serialNo = data.serialNo
        if (data.terminalPaymentMethods) updates.terminalPaymentMethods = data.terminalPaymentMethods

        if (Object.keys(updates).length > 0) {
          await providerLinkService.updateLink(existingLink.id, { metadata: { ...currentMetadata, ...updates } })
        }
      }
    } catch (error) {
      logger.warn(
        { err: error, deviceId, correlationId },
        'Refreshing Surfboard terminal status failed — duplicate-prevention result is unaffected',
      )
    }

    return {
      status: 'skipped',
      historyId: historyRow.id,
      externalId: existingLink.externalId,
      message: 'A Surfboard Terminal mapping already exists for this device; sync was skipped to avoid a duplicate.',
    }
  }

  const historyRow = existingHistoryId
    ? await syncHistoryRepository.markRunning(existingHistoryId)
    : await syncHistoryRepository.create({
        entityType: ENTITY_TYPE,
        entityId: deviceId,
        provider: PROVIDER,
        status: 'running',
        correlationId,
        triggeredBy,
        actorUserId,
      })

  logger.info({ deviceId, correlationId, historyId: historyRow.id }, 'Sync Started')

  const startedAt = Date.now()

  try {
    // Lifecycle precondition: Register Terminal needs both the merchant's
    // real Surfboard merchantId (MERCHANT_CREATED reached) and the
    // branch's Surfboard storeId (Store already created) — same
    // "check one field deeper than just a link existing" rule
    // branchSync.service.js already applies for its own merchant check.
    const merchantLink = await providerLinkService.checkExistingMapping('merchant', branch.merchantId, PROVIDER)
    const merchantExternalId = unwrapProviderMetadata(merchantLink)?.merchantId
    const storeLink = await providerLinkService.checkExistingMapping('branch', branch.id, PROVIDER)
    const storeExternalId = storeLink?.externalId

    if (!merchantExternalId || !storeExternalId) {
      throw new ConflictError(
        'Cannot register a Surfboard Terminal until the merchant has reached MERCHANT_CREATED and the branch has a Surfboard Store',
      )
    }

    const result = await deviceProvider.registerDevice(merchantExternalId, storeExternalId, device)

    const link = await providerLinkService.createLink({
      entityType: ENTITY_TYPE,
      entityId: deviceId,
      provider: PROVIDER,
      externalId: result.externalId,
      metadata: result.metadata,
    })

    logger.info({ deviceId, correlationId, externalId: link.externalId }, 'Provider Link Created')

    const durationMs = Date.now() - startedAt
    await syncHistoryRepository.markCompleted(historyRow.id, { durationMs })

    logger.info({ deviceId, correlationId, historyId: historyRow.id, durationMs }, 'Sync Completed')

    return { status: 'completed', historyId: historyRow.id, externalId: link.externalId }
  } catch (error) {
    const durationMs = Date.now() - startedAt
    await syncHistoryRepository.markFailed(historyRow.id, { durationMs, errorMessage: error.message })

    logger.warn({ err: error, deviceId, correlationId, historyId: historyRow.id, durationMs }, 'Sync Failed')

    return { status: 'failed', historyId: historyRow.id, errorMessage: error.message }
  }
}

export const deviceSyncService = {
  /**
   * Manual Synchronization — Platform Admin's "Refresh Sync" action (also
   * the only caller of Register Terminal, via device.service.js's
   * create()). Always creates a fresh sync_history row.
   */
  async startSync(deviceId, { actorUserId } = {}) {
    const correlationId = randomUUID()
    return attemptSync({ deviceId, correlationId, triggeredBy: 'manual', actorUserId })
  },

  /**
   * Synchronization Status — derived from the latest sync_history row plus
   * the provider_links mapping's stored metadata, never a separate column.
   */
  async getStatus(deviceId) {
    const device = await deviceRepository.findById(deviceId)

    if (!device) {
      throw new NotFoundError('Device not found')
    }

    const [latest, link] = await Promise.all([
      syncHistoryRepository.findLatestForEntity(ENTITY_TYPE, deviceId, PROVIDER),
      providerLinkService.findByEntity(ENTITY_TYPE, deviceId, PROVIDER),
    ])

    const providerMetadata = unwrapProviderMetadata(link)

    return {
      deviceId,
      provider: PROVIDER,
      connected: Boolean(link),
      surfboardTerminalId: link?.externalId ?? null,
      // Surfboard's own Terminal telemetry — populated once Fetch Terminal
      // by ID has been called at least once (on create, or on a later
      // refresh). This is what Merchant Dashboard's terminal status /
      // analytics views read (Phase 2B) — never a live Surfboard call on
      // every page load, only via the explicit "Refresh Sync" action.
      terminalStatus: providerMetadata?.terminalStatus ?? null,
      lastAliveAt: providerMetadata?.lastAliveAt ?? null,
      batteryPercentage: providerMetadata?.batteryPercentage ?? null,
      isCharging: providerMetadata?.isCharging ?? null,
      powerSource: providerMetadata?.powerSource ?? null,
      deviceNetwork: providerMetadata?.deviceNetwork ?? null,
      terminalType: providerMetadata?.terminalType ?? null,
      serialNo: providerMetadata?.serialNo ?? null,
      terminalPaymentMethods: providerMetadata?.terminalPaymentMethods ?? null,
      syncStatus: latest?.status ?? 'never_started',
      lastSyncAt: latest?.startedAt ?? null,
      lastSyncResult: latest?.status ?? null,
      lastError: latest?.errorMessage ?? null,
    }
  },

  /** Synchronization History for one device (Merchant Details' own view). */
  async getHistory(deviceId, query) {
    const device = await deviceRepository.findById(deviceId)

    if (!device) {
      throw new NotFoundError('Device not found')
    }

    const pagination = parsePagination(query)

    const [items, total] = await Promise.all([
      syncHistoryRepository.findByEntity(ENTITY_TYPE, deviceId, PROVIDER, pagination),
      syncHistoryRepository.countByEntity(ENTITY_TYPE, deviceId, PROVIDER),
    ])

    return { items, meta: buildPaginationMeta({ page: pagination.page, pageSize: pagination.pageSize, total }) }
  },

  /** Platform-wide Synchronization History (GET .../devices/history). */
  async getAllHistory(query) {
    const pagination = parsePagination(query)
    const filters = { entityType: ENTITY_TYPE, entityId: query.deviceId, provider: PROVIDER, status: query.status }

    const [items, total] = await Promise.all([
      syncHistoryRepository.findAll(filters, pagination),
      syncHistoryRepository.count(filters),
    ])

    return { items, meta: buildPaginationMeta({ page: pagination.page, pageSize: pagination.pageSize, total }) }
  },
}
