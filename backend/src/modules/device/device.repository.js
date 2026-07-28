import { BaseRepository } from '../../database/BaseRepository.js'

/**
 * @typedef {object} Device
 * @property {string} id
 * @property {string} branchId
 * @property {string} label
 * @property {string} status - "registered" | "active" | "offline" | "deactivated"
 */
export class DeviceRepository extends BaseRepository {
  constructor() {
    super('devices')
  }
}

export const deviceRepository = new DeviceRepository()
