import { deviceRepository } from './device.repository.js'

/**
 * Surfboard integration points (see modules/integrations/surfboard/ports):
 * - `register`/`reassign`/`deactivate` -> deviceProviderPort (Device
 *   Management, Device Handling)
 * - `configureBranding`/`configureTips` -> deviceProviderPort (Configure
 *   Branding, Configure Tips)
 */
export const deviceService = {
  async listByBranch(_branchId) {
    return deviceRepository.findAll()
  },

  async getById(id) {
    return deviceRepository.findById(id)
  },

  async register(data) {
    return deviceRepository.create(data)
  },

  async update(id, data) {
    return deviceRepository.update(id, data)
  },

  async deactivate(id) {
    return deviceRepository.delete(id)
  },

  async configureBranding(id, brandingConfig) {
    return deviceRepository.update(id, { branding: brandingConfig })
  },

  async configureTips(id, tipConfig) {
    return deviceRepository.update(id, { tips: tipConfig })
  },
}
