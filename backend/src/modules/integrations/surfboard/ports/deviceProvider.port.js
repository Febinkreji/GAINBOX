/**
 * Interface a payment-terminal infrastructure provider must implement.
 *
 * Surfboard capabilities this covers: Device Management, Device Handling,
 * Configure Branding, Configure Tips.
 *
 * @typedef {object} DeviceProviderPort
 * @property {(merchantExternalId: string, storeExternalId: string, device: object) => Promise<{ externalId: string }>} registerDevice
 * @property {(merchantExternalId: string, terminalExternalId: string) => Promise<object>} getTerminalStatus
 * @property {(externalId: string, targetStoreExternalId: string) => Promise<void>} reassignDevice
 * @property {(externalId: string) => Promise<void>} deactivateDevice
 * @property {(externalId: string, branding: object) => Promise<void>} configureBranding
 * @property {(externalId: string, tips: object) => Promise<void>} configureTips
 */
export const DEVICE_PROVIDER_PORT_SHAPE = [
  'registerDevice',
  'getTerminalStatus',
  'reassignDevice',
  'deactivateDevice',
  'configureBranding',
  'configureTips',
]
