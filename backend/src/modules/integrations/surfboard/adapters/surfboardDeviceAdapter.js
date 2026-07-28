import { notImplemented } from '../../../../utils/notImplemented.js'

/**
 * Surfboard's implementation of DeviceProviderPort (see
 * ports/deviceProvider.port.js).
 */
export const surfboardDeviceAdapter = {
  async registerDevice(_storeExternalId, _device) {
    notImplemented('SurfboardDeviceAdapter.registerDevice')
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
