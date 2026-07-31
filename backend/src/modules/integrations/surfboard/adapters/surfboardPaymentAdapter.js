import { surfboardClient } from '../surfboard.client.js'
import { ValidationError } from '../../../../errors/index.js'
import { notImplemented } from '../../../../utils/notImplemented.js'
import { logger } from '../../../../logger/logger.js'

// ISO 4217 numeric codes for the currencies GainBox's `payments.currency`
// (VARCHAR(3), e.g. 'INR', 'USD') can actually hold today. A public,
// deterministic standard mapping — not a guess — but only the codes GainBox
// is known to use are listed; an unlisted currency throws rather than
// silently sending a wrong numeric code.
const CURRENCY_NUMERIC_CODES = {
  INR: '356',
  USD: '840',
  EUR: '978',
  GBP: '826',
}

/**
 * Surfboard's implementation of PaymentProviderPort (see
 * ports/paymentProvider.port.js). Only `createPayment` (Create Order) and
 * `getPaymentStatus` (Get Order Status) are implemented —
 * refund/capture/cancel/getReceipt stay stubs until their own scenarios are
 * confirmed, same pattern as every other adapter in this integration.
 *
 * Endpoint, headers, and response envelope for both are confirmed directly
 * by the tasks that supplied these contracts: `POST /orders` and
 * `GET /orders/{orderId}/status`, both with an extra `MERCHANT-ID` header
 * alongside the usual API-KEY/API-SECRET (see surfboard.client.js's
 * `headers` option, added for Create Order and reused here).
 */
export const surfboardPaymentAdapter = {
  /**
   * @param {string} merchantExternalId - Surfboard's own merchant id (from
   *   provider_links, entityType='merchant') — sent as the `MERCHANT-ID` header.
   * @param {string} terminalExternalId - Surfboard's own device/terminal id
   *   (from provider_links, entityType='device') — GainBox's Payment has no
   *   line-item concept, so the whole payment maps to Surfboard's required
   *   `terminal$id` field via this one resolved id.
   * @param {object} payment - GainBox's Payment (see payment.repository.js)
   * @returns {Promise<{ externalId: string, paymentId: string, status: string, metadata: object }>}
   */
  async createPayment(merchantExternalId, terminalExternalId, payment) {
    const numericCurrency = CURRENCY_NUMERIC_CODES[payment.currency]

    if (!numericCurrency) {
      throw new ValidationError('GainBox payment currency has no confirmed Surfboard numeric ISO 4217 mapping', {
        field: 'currency',
        value: payment.currency,
      })
    }

    // Smallest currency unit — GainBox stores a NUMERIC(10,2) decimal
    // amount, so this is a plain x100 conversion, not a per-currency
    // decimal-places lookup (GainBox's own storage already assumes 2).
    const minorAmount = Math.round(Number(payment.amount) * 100)

    // GainBox models a Payment as one lump-sum transaction — there is no
    // per-line-item breakdown (quantity, discount) anywhere in the schema.
    // Surfboard's `orderLines[]` is a required structural wrapper, though,
    // so the whole payment is expressed as exactly one line rather than
    // guessing at a business-level split that doesn't exist in GainBox.
    // `regular`/`total` are both set to the same amount since GainBox has
    // no discount concept to distinguish them.
    const payload = {
      'terminal$id': terminalExternalId,
      orderLines: [
        {
          id: '1',
          name: payment.purpose,
          quantity: 1,
          amount: {
            regular: minorAmount,
            total: minorAmount,
            currency: numericCurrency,
          },
        },
      ],
    }

    // Any error status is already thrown as a mapped AppError by
    // surfboard.client.js before this line — same pipeline as
    // Merchant/Store/Device.
    const response = await surfboardClient.request('POST', '/orders', {
      payload,
      headers: { 'MERCHANT-ID': merchantExternalId },
    })

    // Confirmed response envelope: { status: 'SUCCESS', data: { orderId,
    // paymentId, ... }, message }. Guarded rather than assumed, same as
    // every other adapter's response mapping.
    if (!response?.data?.orderId || !response?.data?.paymentId) {
      logger.warn(
        { paymentId: payment.id, responseData: response?.data },
        'Surfboard Create Order response did not contain data.orderId/data.paymentId in the expected shape',
      )
      notImplemented('SurfboardPaymentAdapter.createPayment response mapping (orderId/paymentId not found at data.orderId/data.paymentId)')
    }

    return {
      externalId: response.data.orderId,
      paymentId: response.data.paymentId,
      status: response.status,
      metadata: response.data,
    }
  },

  /**
   * @param {string} merchantExternalId - Surfboard's own merchant id (from
   *   provider_links, entityType='merchant') — sent as the `MERCHANT-ID` header.
   * @param {string} orderExternalId - Surfboard's own order id (from
   *   provider_links, entityType='payment', persisted by createPayment()).
   * @returns {Promise<{ orderStatus: string, payments: Array<object>, paymentIds: string[] }>}
   */
  async getPaymentStatus(merchantExternalId, orderExternalId) {
    const path = `/orders/${orderExternalId}/status`

    // Any error status is already thrown as a mapped AppError by
    // surfboard.client.js before this line — same pipeline as Create Order.
    const response = await surfboardClient.request('GET', path, {
      headers: { 'MERCHANT-ID': merchantExternalId },
    })

    // Confirmed response envelope: { status: 'SUCCESS', data: { orderStatus,
    // payments: [{paymentId, paymentStatus, paymentMethod, amount}],
    // paymentIds: [...] } }. Guarded rather than assumed, same as every
    // other adapter's response mapping. Which specific `payments[]` entry
    // belongs to which GainBox payment is payment.service.js's job (it
    // knows the Surfboard paymentId it stored at Create Order time) — this
    // adapter only fetches and shape-checks Surfboard's response.
    if (!response?.data?.orderStatus || !Array.isArray(response?.data?.payments)) {
      logger.warn(
        { orderExternalId, responseData: response?.data },
        'Surfboard Get Order Status response did not contain data.orderStatus/data.payments in the expected shape',
      )
      notImplemented('SurfboardPaymentAdapter.getPaymentStatus response mapping (orderStatus/payments not found at data.orderStatus/data.payments)')
    }

    return {
      orderStatus: response.data.orderStatus,
      payments: response.data.payments,
      paymentIds: response.data.paymentIds ?? [],
    }
  },

  async refundPayment(_externalId, _amount) {
    notImplemented('SurfboardPaymentAdapter.refundPayment')
  },

  /**
   * @param {string} paymentExternalId - Surfboard's own paymentId (from
   *   provider_links, entityType='payment', metadata.paymentId — NOT the
   *   orderId used by getPaymentStatus()).
   * @param {number} [amount] - Only for a PRE-AUTH capture; omitted entirely
   *   (not sent as `null`/`undefined`) for a standard capture.
   * @returns {Promise<{ status: string, message: string }>}
   */
  async capturePayment(paymentExternalId, amount) {
    const payload = amount !== undefined ? { amount } : {}
    const path = `/payments/${paymentExternalId}/capture`

    // Any error status is already thrown as a mapped AppError by
    // surfboard.client.js before this line — same pipeline as Create Order
    // / Get Order Status. Confirmed response has no `data` envelope, unlike
    // those two — just { status, message } directly.
    const response = await surfboardClient.request('POST', path, { payload })

    return { status: response?.status, message: response?.message }
  },

  /**
   * @param {string} paymentExternalId - Surfboard's own paymentId (from
   *   provider_links, entityType='payment', metadata.paymentId).
   * @returns {Promise<{ status: string, paymentStatus: string, message: string }>}
   */
  async cancelPayment(paymentExternalId) {
    const path = `/payments/${paymentExternalId}`

    // Any error status is already thrown as a mapped AppError by
    // surfboard.client.js before this line — same pipeline as every other
    // confirmed endpoint.
    const response = await surfboardClient.request('DELETE', path)

    // Confirmed response envelope: { status: 'SUCCESS', data: {
    // paymentStatus: 'PAYMENT_CANCELLED' }, message }. Whether
    // paymentStatus actually reads 'PAYMENT_CANCELLED' is payment.service.js's
    // decision to act on, not this adapter's — it only fetches and returns.
    return { status: response?.status, paymentStatus: response?.data?.paymentStatus, message: response?.message }
  },

  /**
   * @param {string} merchantExternalId - Surfboard's own merchant id (from
   *   provider_links, entityType='merchant') — sent as the `MERCHANT-ID`
   *   header, per this endpoint's confirmed Headers list (unlike
   *   capturePayment/cancelPayment, whose confirmed contracts had no such
   *   header — hence the extra parameter here).
   * @param {string} paymentExternalId - Surfboard's own paymentId (from
   *   provider_links, entityType='payment', metadata.paymentId).
   * @returns {Promise<{ status: string, voidStatus: string, message: string }>}
   */
  async voidPayment(merchantExternalId, paymentExternalId) {
    const path = `/payments/${paymentExternalId}/void`

    // Any error status is already thrown as a mapped AppError by
    // surfboard.client.js before this line — same pipeline as every other
    // confirmed endpoint.
    const response = await surfboardClient.request('PUT', path, {
      payload: {},
      headers: { 'MERCHANT-ID': merchantExternalId },
    })

    // Confirmed response envelope: { status: 'SUCCESS', data: { voidStatus,
    // message }, message }. Whether voidStatus means "done" is
    // payment.service.js's decision to act on, not this adapter's.
    return { status: response?.status, voidStatus: response?.data?.voidStatus, message: response?.message }
  },

  async getReceipt(_externalId) {
    notImplemented('SurfboardPaymentAdapter.getReceipt')
  },
}
