import { surfboardDeviceAdapter } from '../integrations/surfboard/index.js'

/**
 * Composition point for DeviceProviderPort (see
 * integrations/surfboard/ports/deviceProvider.port.js). device.service.js
 * imports `deviceProvider` from here, never `surfboardDeviceAdapter`
 * directly — mirrors merchant.providers.js and branch.providers.js.
 */
export const deviceProvider = surfboardDeviceAdapter
