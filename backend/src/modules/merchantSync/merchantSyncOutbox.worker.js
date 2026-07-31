import { outboxRepository } from '../outbox/outbox.repository.js'
import { merchantSyncService } from './merchantSync.service.js'
import { logger } from '../../logger/logger.js'
import { env } from '../../config/env.js'

/**
 * The Merchant Created -> Outbox Event -> Worker -> Provider Port leg of
 * the Sprint 2A framework. This is the first outbox consumer this codebase
 * has ever had — outbox.repository.js's `findPending` existed since the
 * original Transactional Outbox foundation, unread by anything, until now.
 *
 * Deliberately a simple in-process poller (setInterval), not a separate
 * process/queue — the batch size and interval are small enough that this
 * comfortably keeps up, and it needs no new deployment artifact. If a
 * later sprint needs multiple app instances to stop competing for the same
 * events, this is the one function (`processPendingMerchantSyncEvents`) a
 * proper job queue would replace the *trigger* for — its actual logic
 * wouldn't change.
 */

const EVENT_TYPE = 'SurfboardMerchantSyncRequested'
const BATCH_SIZE = 20

/**
 * Drains up to BATCH_SIZE pending sync-requested events. Exported
 * separately from the interval wiring so a disposable verification script
 * can call this directly without waiting on the poll interval.
 */
export async function processPendingMerchantSyncEvents() {
  const events = await outboxRepository.findPendingByEventType(EVENT_TYPE, BATCH_SIZE)

  for (const event of events) {
    const { merchantId, syncHistoryId, correlationId } = event.payload

    try {
      // Never throws for an expected outcome (including the constant
      // NotImplementedError from the stub adapter) — see
      // merchantSync.service.js's attemptSync(). A thrown error here means
      // the *framework* failed to process the event, not that the sync
      // itself failed — those are different things, and only the former
      // should mark the outbox event 'failed'.
      await merchantSyncService.processQueuedSync({ merchantId, syncHistoryId, correlationId })
      await outboxRepository.markProcessed(event.id)
    } catch (error) {
      await outboxRepository.markFailed(event.id)
      logger.error(
        { err: error, eventId: event.id, merchantId, correlationId },
        'Merchant sync outbox event processing failed',
      )
    }
  }

  return events.length
}

let intervalHandle = null

/** Idempotent — calling this twice is a no-op, matching the existing bootstrap module's convention. */
export function startMerchantSyncWorker() {
  if (intervalHandle) {
    return stopMerchantSyncWorker
  }

  const intervalMs = env.SURFBOARD_SYNC_POLL_INTERVAL_MS
  logger.info({ intervalMs }, 'Merchant sync outbox worker started')

  intervalHandle = setInterval(() => {
    processPendingMerchantSyncEvents().catch((error) => {
      logger.error({ err: error }, 'Merchant sync outbox worker tick failed')
    })
  }, intervalMs)

  // Never keep the process alive on its own — server.js's graceful
  // shutdown (closing the DB pool, exiting) already decides process
  // lifetime; this timer shouldn't be a second vote.
  intervalHandle.unref?.()

  return stopMerchantSyncWorker
}

export function stopMerchantSyncWorker() {
  if (intervalHandle) {
    clearInterval(intervalHandle)
    intervalHandle = null
  }
}
