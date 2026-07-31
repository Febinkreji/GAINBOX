import { providerLinkService } from '../providerLink/providerLink.service.js'
import { logger } from '../../logger/logger.js'

// The one event this integration handles today — every other Surfboard
// webhook event is logged (see logSurfboardReceipt) and otherwise ignored,
// per this task's scope.
const APPLICATION_MERCHANT_CREATED_EVENT = 'Application Merchant Created'

/**
 * Request authenticity is verified before this runs (see
 * surfboardWebhookSignature.js) — this module only decides what an already-
 * trusted payload means.
 */
export const webhookService = {
  async logSurfboardReceipt(payload, headers) {
    logger.info(
      { source: 'surfboard', headers: { 'content-type': headers['content-type'] }, payloadKeys: Object.keys(payload) },
      'Received Surfboard webhook',
    )
  },

  /**
   * Handles "Application Merchant Created" only; every other event type is
   * a documented no-op (not this task's scope). Delivery is at-least-once
   * (Surfboard's own confirmed fact), so this must be idempotent: a
   * duplicate delivery whose merchantId/storeId already match what's
   * stored is treated as a no-op, not re-applied.
   *
   * Assumption flagged, not silently guessed at: the confirmed facts list
   * the payload's `merchantId`/`storeId` fields, but not the field carrying
   * the event's own name, or that the payload also carries the
   * `applicationId` needed to correlate back to a GainBox merchant (item 3
   * requires finding the merchant "using the existing ProviderLink/
   * applicationId", which is only possible if the payload includes one).
   * Read here as `payload.event` and `payload.applicationId` respectively —
   * revisit if Surfboard's actual delivery uses different field names.
   */
  async handleSurfboardWebhook(payload) {
    const eventType = payload?.event

    if (eventType !== APPLICATION_MERCHANT_CREATED_EVENT) {
      logger.info({ eventType }, 'Surfboard webhook event is not handled by this integration — ignored')
      return
    }

    const { applicationId, merchantId, storeId } = payload

    if (!applicationId || !merchantId) {
      logger.warn(
        { payloadKeys: Object.keys(payload) },
        'Application Merchant Created webhook is missing applicationId/merchantId — cannot correlate to a ProviderLink',
      )
      return
    }

    const link = await providerLinkService.findByExternalId('surfboard', applicationId)

    if (!link || link.entityType !== 'merchant') {
      logger.warn({ applicationId }, 'Application Merchant Created webhook references an unknown applicationId')
      return
    }

    if (link.metadata?.merchantId === merchantId && link.metadata?.storeId === storeId) {
      logger.info({ applicationId, merchantId }, 'Application Merchant Created webhook already applied — duplicate delivery ignored')
      return
    }

    await providerLinkService.updateLink(link.id, {
      metadata: { ...link.metadata, merchantId, storeId },
    })

    logger.info({ applicationId, merchantId, storeId }, 'Application Merchant Created webhook applied — ProviderLink metadata updated')
  },
}
