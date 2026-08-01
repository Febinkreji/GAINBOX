import { surfboardClient } from '../surfboard.client.js'
import { ValidationError } from '../../../../errors/index.js'
import { notImplemented } from '../../../../utils/notImplemented.js'
import { logger } from '../../../../logger/logger.js'

/**
 * Surfboard's implementation of DeviceProviderPort (see
 * ports/deviceProvider.port.js). Only `registerDevice` is implemented —
 * reassignDevice/deactivateDevice/configureBranding/configureTips stay
 * stubs until their own scenarios are confirmed, same pattern as
 * surfboardStoreAdapter.js leaving `updateStore` unimplemented.
 *
 * Endpoint, headers, and request/response shape are confirmed directly
 * against the official Surfboard "Terminal & Device Management" guide
 * (Phase 2 — Store & Device Integration): `POST /merchants/{merchantId}/
 * stores/{storeId}/devices` — both ids are Surfboard's own (real
 * merchantId, not the KYB applicationId; and the Store's own externalId),
 * resolving them is the caller's job (see deviceSync.service.js).
 */
export const surfboardDeviceAdapter = {
  /**
   * @param {string} merchantExternalId - Surfboard's own **merchant id**
   *   (not GainBox's merchant.id, and not the KYB applicationId — see
   *   surfboardStoreAdapter.js's createStore() docstring for why that
   *   distinction matters).
   * @param {string} storeExternalId - Surfboard's own store id (from
   *   provider_links, entityType='branch').
   * @param {object} device - GainBox's Device (see device.repository.js)
   * @returns {Promise<{ externalId: string, status: string, metadata: object }>}
   */
  async registerDevice(merchantExternalId, storeExternalId, device) {
    // GainBox-side validation. `terminalName` maps to the existing `label`
    // field.
    const missing = []
    if (!device.registrationIdentifier) missing.push('registrationIdentifier')
    if (!device.label) missing.push('label')

    if (missing.length > 0) {
      throw new ValidationError('GainBox device is missing fields required by Surfboard Device Registration', {
        missing,
      })
    }

    const payload = {
      registrationIdentifier: device.registrationIdentifier,
      terminalName: device.label,
    }

    const path = `/merchants/${merchantExternalId}/stores/${storeExternalId}/devices`

    // Confirmed required by every merchant-scoped Store/Terminal endpoint —
    // see surfboardStoreAdapter.js's createStore() for the same header.
    const headers = { 'MERCHANT-ID': merchantExternalId }

    // Any error HTTP status is already thrown as a mapped AppError by
    // surfboard.client.js before this line — same pipeline as Merchant/Store.
    const response = await surfboardClient.request('POST', path, { payload, headers })

    // Surfboard can return the ERROR envelope on a 2xx HTTP status — same
    // confirmed behavior as Create Merchant/Create Store (see
    // surfboardStoreAdapter.js's createStore() for where this was first
    // confirmed live, during Phase 2 verification).
    if (response?.status === 'ERROR') {
      throw new ValidationError(response.message ?? 'Surfboard rejected device registration', {
        surfboardStatus: response.status,
        surfboardMessage: response.message,
      })
    }

    // Confirmed response envelope (official guide): { status: 'SUCCESS',
    // data: { terminalId, registrationStatus: 'REGISTERED'|'ALREADY_REGISTERED' },
    // message }. Guarded rather than assumed, same as every other
    // confirmed endpoint's response mapping.
    if (response?.data?.terminalId === undefined) {
      logger.warn(
        { responseData: response?.data },
        'Surfboard Device Registration returned SUCCESS without a terminalId — response no longer matches the documented contract',
      )
      notImplemented('SurfboardDeviceAdapter.registerDevice response mapping (terminalId not found at data.terminalId)')
    }

    return { externalId: response.data.terminalId, status: response.status, metadata: response.data }
  },

  /**
   * Fetch Terminal by ID — confirmed against the official docs:
   * `GET /terminals/{terminalId}`, `MERCHANT-ID` header required. Returns
   * rich telemetry (`terminalStatus`, `lastAliveAt`, `batteryPercentage`,
   * `isCharging`, `powerSource`, `deviceNetwork`, `serialNo`, ...) — the
   * data source for Merchant Dashboard's terminal status/analytics views.
   * @param {string} merchantExternalId - Surfboard's own real merchant id.
   * @param {string} terminalExternalId - Surfboard's own terminal id (from
   *   provider_links, entityType='device').
   * @returns {Promise<object>} the raw parsed response — deviceSync
   *   .service.js decides what to persist, not this adapter.
   */
  async getTerminalStatus(merchantExternalId, terminalExternalId) {
    const path = `/terminals/${terminalExternalId}`
    const headers = { 'MERCHANT-ID': merchantExternalId }

    // Any error status is already thrown as a mapped AppError by
    // surfboard.client.js before this line — same pipeline as registerDevice().
    return surfboardClient.request('GET', path, { headers })
  },

  async reassignDevice(_externalId, _targetStoreExternalId) {
    notImplemented('SurfboardDeviceAdapter.reassignDevice')
  },

  async deactivateDevice(_externalId) {
    notImplemented('SurfboardDeviceAdapter.deactivateDevice')
  },

  async configureBranding(_externalId, _branding) {
    notImplemented('SurfboardDeviceAdapter.configureBranding')
  },

  async configureTips(_externalId, _tips) {
    notImplemented('SurfboardDeviceAdapter.configureTips')
  },
}
