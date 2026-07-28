import { roleRepository } from './role.repository.js'
import { permissionRepository } from './permission.repository.js'

export const roleService = {
  async listRoles() {
    return roleRepository.findAll()
  },

  async getRoleById(id) {
    return roleRepository.findById(id)
  },

  async createRole(data) {
    return roleRepository.create(data)
  },

  async listPermissions() {
    return permissionRepository.findAll()
  },

  async assignPermission(roleId, permissionId) {
    return roleRepository.update(roleId, { permissionId })
  },
}
