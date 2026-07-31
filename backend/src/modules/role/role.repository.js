import { BaseRepository } from '../../database/BaseRepository.js'
import { getPool } from '../../database/connection.js'

/**
 * @typedef {object} Role
 * @property {string} id
 * @property {string} name - e.g. "platform-admin" | "merchant-owner" | "merchant-staff" | "viewer" | "customer"
 *
 * Deliberately its own domain, decoupled from User, so merchant-specific
 * custom roles can be introduced later without touching the User entity.
 *
 * Still extends BaseRepository (findById/findAll/create/update/delete stay
 * NotImplemented) — a Role management CRUD API is a separate, not-yet-built
 * concern (see role.service.js). `hasPermission` below is the one real,
 * concrete method: the single query Authorization needs.
 */
export class RoleRepository extends BaseRepository {
  constructor() {
    super('roles')
  }

  /**
   * @param {string[]} roleIds
   * @param {string} permissionName
   */
  async hasPermission(roleIds, permissionName, client = getPool()) {
    if (roleIds.length === 0) {
      return false
    }

    const result = await client.query(
      `SELECT EXISTS (
         SELECT 1
         FROM role_permissions rp
         JOIN permissions p ON p.id = rp.permission_id AND p.deleted_at IS NULL
         WHERE rp.role_id = ANY($1::uuid[]) AND p.name = $2
       ) AS has_permission`,
      [roleIds, permissionName],
    )

    return result.rows[0].has_permission
  }

  /**
   * Looks up a role by its name — Merchant Onboarding needs the
   * merchant-owner role's id to write merchant_staff/merchant_invitations
   * rows; role names are the stable, human-readable identifier this
   * codebase already uses everywhere else (seed data, requireRole(), ...).
   */
  async findByName(name, client = getPool()) {
    const result = await client.query('SELECT id, name FROM roles WHERE name = $1 AND deleted_at IS NULL', [name])

    return result.rows[0] ?? null
  }

  /**
   * Distinct permission names granted by any of `roleIds` — the "what can
   * this set of roles actually do" view Platform Control Center's User
   * Details needs. Same role_permissions join as `hasPermission`, just
   * returning names instead of a single yes/no.
   */
  async findPermissionNamesForRoles(roleIds, client = getPool()) {
    if (roleIds.length === 0) {
      return []
    }

    const result = await client.query(
      `SELECT DISTINCT p.name
       FROM role_permissions rp
       JOIN permissions p ON p.id = rp.permission_id AND p.deleted_at IS NULL
       WHERE rp.role_id = ANY($1::uuid[])
       ORDER BY p.name`,
      [roleIds],
    )

    return result.rows.map((row) => row.name)
  }

  /**
   * Grants `permissionId` to `roleId` by inserting into role_permissions —
   * the actual source of truth Authorization reads (see `hasPermission`
   * above). Fixes the pre-existing bug where this instead called
   * `update(roleId, { permissionId })` against `roles`, a table with no
   * such column — that call was a silent no-op query, not a real grant.
   * Idempotent (ON CONFLICT DO NOTHING): assigning the same permission
   * twice is not an error. A non-existent roleId/permissionId surfaces as a
   * foreign key violation — role_permissions' own FKs are the existence
   * check, no separate one is needed here.
   */
  async grantPermission(roleId, permissionId, client = getPool()) {
    await client.query(
      `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [roleId, permissionId],
    )

    return { roleId, permissionId }
  }
}

export const roleRepository = new RoleRepository()
