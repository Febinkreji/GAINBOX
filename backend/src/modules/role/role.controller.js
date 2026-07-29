import { asyncHandler } from '../../utils/asyncHandler.js'
import { ApiResponse } from '../../utils/ApiResponse.js'
import { roleService } from './role.service.js'

export const roleController = {
  listRoles: asyncHandler(async (_req, res) => {
    const roles = await roleService.listRoles()
    ApiResponse.send(res, { data: roles })
  }),

  getRoleById: asyncHandler(async (req, res) => {
    const role = await roleService.getRoleById(req.params.id)
    ApiResponse.send(res, { data: role })
  }),

  createRole: asyncHandler(async (req, res) => {
    const role = await roleService.createRole(req.body)
    ApiResponse.send(res, { statusCode: 201, data: role, message: 'Role created' })
  }),

  listPermissions: asyncHandler(async (_req, res) => {
    const permissions = await roleService.listPermissions()
    ApiResponse.send(res, { data: permissions })
  }),

  assignPermission: asyncHandler(async (req, res) => {
    const grant = await roleService.assignPermission(req.params.id, req.body.permissionId)
    ApiResponse.send(res, { data: grant, message: 'Permission assigned' })
  }),
}
