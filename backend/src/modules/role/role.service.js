import { roleRepository } from './role.repository.js'
import { permissionRepository } from './permission.repository.js'
import { NotFoundError } from '../../errors/index.js'

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

  // role_permissions is the source of truth Authorization reads (see
  // roleRepository.hasPermission) — this grants into it directly, fixing
  // the previous call to update(roleId, { permissionId }), which silently
  // no-op'd against a column `roles` doesn't have.
  async assignPermission(roleId, permissionId) {
    try {
      return await roleRepository.grantPermission(roleId, permissionId)
    } catch (error) {
      if (error.code === '23503') {
        throw new NotFoundError('Role or permission not found')
      }

      throw error
    }
  },
}
