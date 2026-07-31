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
 * Endpoint and request shape are confirmed directly by the task that
 * supplied this contract: `POST /merchants/{merchantId}/stores/{storeId}/devices`
 * (Surfboard's own ids, not GainBox's — resolving them is the caller's job,
 * see device.service.js). Auth reuses `surfboardClient` exactly as
 * Merchant/Store do (API-KEY/API-SECRET headers) — no separate auth scheme
 * for this endpoint, per the confirmed instruction.
 */
export const surfboardDeviceAdapter = {
  /**
   * @param {string} merchantExternalId - Surfboard's own merchant id (from
   *   provider_links, entityType='merchant').
   * @param {string} storeExternalId - Surfboard's own store id (from
   *   provider_links, entityType='branch').
   * @param {object} device - GainBox's Device (see device.repository.js)
   * @returns {Promise<{ externalId: string, status: string, metadata: object }>}
   */
  async registerDevice(merchantExternalId, storeExternalId, device) {
    // GainBox-side validation. `terminalName` maps to the existing `label`
    // field. `registrationIdentifier` has no GainBox equivalent today —
    // devices.repository.js has no column for a physical terminal's
    // registration code — so this throws here until that model gains one,
    // same honest-gap handling as surfboardStoreAdapter.js's phoneNumber.
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

    // Any error status is already thrown as a mapped AppError by
    // surfboard.client.js before this line — same pipeline as Merchant/Store.
    const response = await surfboardClient.request('POST', path, { payload })

    // Response envelope wasn't given as an explicit example for this
    // endpoint, but every other confirmed Surfboard response so far uses
    // the same shape ({status, data, message} for Merchant; {data.storeId}
    // for Store) — `data.terminalId` follows that same convention. Logged
    // for visibility rather than assumed silently.
    if (response?.data?.terminalId === undefined) {
      logger.warn(
        { responseData: response?.data },
        'Surfboard Device Registration response did not contain data.terminalId in the expected shape',
      )
      notImplemented('SurfboardDeviceAdapter.registerDevice response mapping (terminalId not found at data.terminalId)')
    }

    return { externalId: response.data.terminalId, status: response.status, metadata: response.data }
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
