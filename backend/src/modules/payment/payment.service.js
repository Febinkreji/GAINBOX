import { paymentRepository } from './payment.repository.js'
import { receiptRepository } from './receipt.repository.js'
import { branchRepository } from '../branch/branch.repository.js'
import { paymentProvider } from './payment.providers.js'
import { providerLinkService } from '../providerLink/providerLink.service.js'
import { NotFoundError, ValidationError } from '../../errors/index.js'
import { logger } from '../../logger/logger.js'

// Surfboard's Get Order Status `paymentStatus` values mapped to GainBox's
// own payment.status enum — confirmed mapping, not inferred. Any value not
// listed here (there are none outside these six today) is treated as an
// honest gap in `getStatus()` below rather than guessed at.
const SURFBOARD_PAYMENT_STATUS_MAP = {
  PAYMENT_COMPLETED: 'paid',
  PAYMENT_FAILED: 'failed',
  PAYMENT_CANCELLED: 'cancelled',
  PAYMENT_INITIATED: 'pending',
  PAYMENT_PROCESSING: 'pending',
  PAYMENT_PROCESSED: 'pending',
}

/**
 * Surfboard integration points (see modules/integrations/surfboard/ports):
 * - `create`          -> paymentProviderPort (Make Your Payments, Additional
 *   Payment Methods)
 * - `getStatus`        -> paymentProviderPort (Get Order Status)
 * - `refund`/`capture`/`cancel` -> paymentProviderPort (Additional Operations)
 * - `getReceipt`       -> paymentProviderPort (Receipts)
 *
 * Unlike Merchant/Branch/Device, the Surfboard call in `create()` is not a
 * background metadata sync that can fail silently — it's the only mechanism
 * that actually initiates the transaction at the terminal, so a missing
 * mapping or a provider failure propagates as a real error rather than being
 * logged and swallowed.
 */
export const paymentService = {
  async list(_filters) {
    return paymentRepository.findAll()
  },

  async getById(id) {
    return paymentRepository.findById(id)
  },

  async create(data) {
    const payment = await paymentRepository.create(data)

    try {
      const branch = await branchRepository.findById(payment.branchId)

      if (!branch) {
        throw new NotFoundError('Cannot process a payment for a branch that does not exist')
      }

      const merchantLink = await providerLinkService.checkExistingMapping('merchant', branch.merchantId, 'surfboard')
      const terminalLink = payment.deviceId
        ? await providerLinkService.checkExistingMapping('device', payment.deviceId, 'surfboard')
        : null

      if (!merchantLink || !terminalLink) {
        throw new ValidationError(
          'Payment cannot be processed via Surfboard — the merchant or the device has no Surfboard mapping yet',
          {
            hasMerchantLink: Boolean(merchantLink),
            hasDeviceId: Boolean(payment.deviceId),
            hasTerminalLink: Boolean(terminalLink),
          },
        )
      }

      const result = await paymentProvider.createPayment(merchantLink.externalId, terminalLink.externalId, payment)

      await providerLinkService.createLink({
        entityType: 'payment',
        entityId: payment.id,
        provider: 'surfboard',
        externalId: result.externalId,
        metadata: result.metadata,
      })

      return payment
    } catch (error) {
      // The payment row already committed (no transaction wraps this — see
      // the transaction-flow review) — mark it 'failed' rather than leaving
      // it silently 'pending' forever, then re-throw the original error
      // untouched. The status-update's own failure is swallowed here only
      // so it can't mask the real error above it; it is not the error this
      // catch exists to handle.
      await paymentRepository.update(payment.id, { status: 'failed' }).catch(() => {})
      throw error
    }
  },

  /**
   * Pulls the current status of this payment's Surfboard order and updates
   * the local row accordingly. Requires createPayment() to have already
   * succeeded (a `payment` ProviderLink must exist — its `externalId` is
   * the Surfboard orderId this endpoint takes, and its stored
   * `metadata.paymentId` is how the right entry in the order's
   * `payments[]` array is picked out, since one order can carry more than
   * one payment attempt).
   */
  async getStatus(id) {
    const payment = await paymentRepository.findById(id)

    if (!payment) {
      throw new NotFoundError('Payment not found')
    }

    const branch = await branchRepository.findById(payment.branchId)

    if (!branch) {
      throw new NotFoundError('Cannot check payment status for a branch that does not exist')
    }

    const merchantLink = await providerLinkService.checkExistingMapping('merchant', branch.merchantId, 'surfboard')
    const paymentLink = await providerLinkService.checkExistingMapping('payment', payment.id, 'surfboard')

    if (!merchantLink || !paymentLink) {
      throw new ValidationError(
        'Payment status cannot be checked via Surfboard — no Surfboard order mapping exists yet',
        { hasMerchantLink: Boolean(merchantLink), hasPaymentLink: Boolean(paymentLink) },
      )
    }

    const result = await paymentProvider.getPaymentStatus(merchantLink.externalId, paymentLink.externalId)

    const surfboardPaymentId = paymentLink.metadata?.paymentId
    const matchingPayment = result.payments.find((entry) => entry.paymentId === surfboardPaymentId)

    if (!matchingPayment) {
      logger.warn(
        { paymentId: id, orderExternalId: paymentLink.externalId, surfboardPaymentId },
        'Get Order Status response did not include this payment\'s own paymentId — leaving local status unchanged',
      )
      return payment
    }

    const mappedStatus = SURFBOARD_PAYMENT_STATUS_MAP[matchingPayment.paymentStatus]

    if (!mappedStatus) {
      logger.warn(
        { paymentId: id, surfboardStatus: matchingPayment.paymentStatus },
        'Surfboard paymentStatus has no confirmed GainBox status mapping — leaving local status unchanged',
      )
      return payment
    }

    return paymentRepository.update(id, { status: mappedStatus })
  },

  async refund(id, _refundDetails) {
    return paymentRepository.update(id, { status: 'refunded' })
  },

  /**
   * Requires createPayment() to have already succeeded (a `payment`
   * ProviderLink must exist). Uses `metadata.paymentId` — Surfboard's own
   * paymentId, not the orderId `capturePayment`'s path takes a different id
   * than getPaymentStatus()'s orderId. Deliberately does not touch
   * `payment.status` — the confirmed contract has no response field to map
   * from, and Get Order Status remains the only source of truth for status.
   */
  async capture(id, amount) {
    const paymentLink = await providerLinkService.checkExistingMapping('payment', id, 'surfboard')

    if (!paymentLink) {
      throw new ValidationError('Payment cannot be captured via Surfboard — no Surfboard order mapping exists yet', {
        paymentId: id,
      })
    }

    const surfboardPaymentId = paymentLink.metadata?.paymentId

    if (!surfboardPaymentId) {
      throw new ValidationError(
        'Payment cannot be captured via Surfboard — no Surfboard paymentId was recorded at Create Order time',
        { paymentId: id },
      )
    }

    return paymentProvider.capturePayment(surfboardPaymentId, amount)
  },

  /**
   * Requires createPayment() to have already succeeded (a `payment`
   * ProviderLink must exist). Uses `metadata.paymentId` — Surfboard's own
   * paymentId, same as capture(), not the orderId getStatus() uses. Only
   * updates the local row to 'cancelled' if Surfboard actually confirms
   * `paymentStatus === 'PAYMENT_CANCELLED'` — any other value is left
   * unchanged and logged, not assumed to mean success.
   */
  async cancel(id) {
    const paymentLink = await providerLinkService.checkExistingMapping('payment', id, 'surfboard')

    if (!paymentLink) {
      throw new ValidationError('Payment cannot be cancelled via Surfboard — no Surfboard order mapping exists yet', {
        paymentId: id,
      })
    }

    const surfboardPaymentId = paymentLink.metadata?.paymentId

    if (!surfboardPaymentId) {
      throw new ValidationError(
        'Payment cannot be cancelled via Surfboard — no Surfboard paymentId was recorded at Create Order time',
        { paymentId: id },
      )
    }

    const result = await paymentProvider.cancelPayment(surfboardPaymentId)

    if (result.paymentStatus === 'PAYMENT_CANCELLED') {
      return paymentRepository.update(id, { status: 'cancelled' })
    }

    logger.warn(
      { paymentId: id, surfboardPaymentStatus: result.paymentStatus },
      'Surfboard cancelPayment did not confirm PAYMENT_CANCELLED — leaving local status unchanged',
    )

    return paymentRepository.findById(id)
  },

  /**
   * Requires createPayment() to have already succeeded (a `payment`
   * ProviderLink must exist). Uses `metadata.paymentId`, same as
   * capture()/cancel(). Void is asynchronous on Surfboard's side —
   * VOID_INITIATED doesn't mean voided yet, and no confirmed endpoint
   * reports when it finishes — so, per the confirmed scope, `payment.status`
   * is never updated here regardless of voidStatus; the caller gets the raw
   * provider response back for any of VOID_INITIATED/VOIDED/CANNOT_VOID/
   * NOT_INITIATED. CANNOT_VOID additionally logs a warning.
   */
  async void(id) {
    const payment = await paymentRepository.findById(id)

    if (!payment) {
      throw new NotFoundError('Payment not found')
    }

    const branch = await branchRepository.findById(payment.branchId)

    if (!branch) {
      throw new NotFoundError('Cannot void a payment for a branch that does not exist')
    }

    const merchantLink = await providerLinkService.checkExistingMapping('merchant', branch.merchantId, 'surfboard')
    const paymentLink = await providerLinkService.checkExistingMapping('payment', id, 'surfboard')

    if (!merchantLink || !paymentLink) {
      throw new ValidationError(
        'Payment cannot be voided via Surfboard — no Surfboard merchant/order mapping exists yet',
        { hasMerchantLink: Boolean(merchantLink), hasPaymentLink: Boolean(paymentLink) },
      )
    }

    const surfboardPaymentId = paymentLink.metadata?.paymentId

    if (!surfboardPaymentId) {
      throw new ValidationError(
        'Payment cannot be voided via Surfboard — no Surfboard paymentId was recorded at Create Order time',
        { paymentId: id },
      )
    }

    const result = await paymentProvider.voidPayment(merchantLink.externalId, surfboardPaymentId)

    if (result.voidStatus === 'CANNOT_VOID') {
      logger.warn({ paymentId: id, voidStatus: result.voidStatus }, 'Surfboard reported CANNOT_VOID for this payment')
    }

    return result
  },

  async getReceipt(paymentId) {
    return receiptRepository.findAll({ paymentId })
  },
}
