import { logger } from '../../logger/logger.js'

/**
 * Foundation only: logs receipt and nothing else. Does not verify the
 * request came from Surfboard (no signature check exists yet — see
 * webhook.controller.js) and does not call any business service. A future
 * version will verify the signature, then likely write to the Outbox or
 * call a domain service directly.
 */
export const webhookService = {
  async logSurfboardReceipt(payload, headers) {
    logger.info(
      { source: 'surfboard', headers: { 'content-type': headers['content-type'] }, payloadKeys: Object.keys(payload) },
      'Received Surfboard webhook',
    )
  },
}
