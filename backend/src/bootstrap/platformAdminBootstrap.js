import { env } from '../config/env.js'
import { logger } from '../logger/logger.js'
import { withTransaction } from '../database/connection.js'
import { userRepository } from '../modules/user/user.repository.js'
import { roleRepository } from '../modules/role/role.repository.js'
import { userRoleRepository } from '../modules/authorization/userRole.repository.js'
import { platformRepository } from '../modules/platform/platform.repository.js'
import { auditService } from '../modules/audit/audit.service.js'
import { outboxService } from '../modules/outbox/outbox.service.js'

const PLATFORM_ADMIN_ROLE_NAME = 'platform-admin'

/**
 * Development Bootstrap — gives a brand-new environment (no seed data, no
 * existing platform-admin) a way in, without ever introducing username/
 * password authentication. Google Sign-In stays the only auth mechanism:
 * this only grants the platform-admin role to a user row identified by
 * email; it never issues, checks, or stores a password or a Firebase
 * credential of its own. The row it creates has no firebase_uid until
 * BOOTSTRAP_PLATFORM_ADMIN_EMAIL actually signs in with Google — see
 * identitySync.service.js's "claim" branch, which links the two.
 *
 * Idempotent by construction, not merely by pre-check: even if this ran
 * twice concurrently (two instances booting at once), findByEmail finding
 * an already-created row and userRoleRepository.grantRole's own
 * ON CONFLICT DO NOTHING mean neither a duplicate user nor a duplicate
 * role grant can result.
 */
export async function runPlatformAdminBootstrap() {
  if (!env.BOOTSTRAP_ENABLED) {
    return
  }

  if (!env.BOOTSTRAP_PLATFORM_ADMIN_EMAIL) {
    logger.warn(
      'Platform Bootstrap: BOOTSTRAP_ENABLED is true but BOOTSTRAP_PLATFORM_ADMIN_EMAIL is not set — skipping',
    )
    return
  }

  try {
    const platformAdminRole = await roleRepository.findByName(PLATFORM_ADMIN_ROLE_NAME)

    if (!platformAdminRole) {
      // Deployment invariant, not a request the caller controls — see
      // seeds/0001_roles_and_permissions.sql. Logged and skipped, not
      // thrown: an unseeded role must never take the whole server down.
      logger.warn(`Platform Bootstrap: "${PLATFORM_ADMIN_ROLE_NAME}" role is not seeded — skipping`)
      return
    }

    const existingAdmins = await platformRepository.getNewestPlatformAdmins(1)

    if (existingAdmins.length > 0) {
      logger.info('Platform Bootstrap: a platform-admin already exists — nothing to do')
      return
    }

    await withTransaction(async (client) => {
      let user = await userRepository.findByEmail(env.BOOTSTRAP_PLATFORM_ADMIN_EMAIL, client)

      if (!user) {
        user = await userRepository.create(
          { firebaseUid: null, email: env.BOOTSTRAP_PLATFORM_ADMIN_EMAIL, displayName: 'Platform Admin' },
          client,
        )

        logger.info({ email: user.email }, 'Platform Bootstrap: created placeholder user for the platform-admin')
      } else {
        logger.info(
          { email: user.email },
          'Platform Bootstrap: an account for this email already exists — granting platform-admin to it',
        )
      }

      await userRoleRepository.grantRole(user.id, platformAdminRole.id, client)

      await auditService.record(
        {
          entityType: 'user',
          entityId: user.id,
          action: 'user.bootstrapped',
          actorUserId: null,
          metadata: { email: user.email, role: PLATFORM_ADMIN_ROLE_NAME },
        },
        client,
      )

      await outboxService.publish(
        { eventType: 'PlatformAdminBootstrapped', aggregateType: 'user', aggregateId: user.id, payload: user },
        client,
      )

      logger.info({ email: user.email }, 'Platform Bootstrap: platform-admin role granted')
    })
  } catch (error) {
    // Bootstrap is a convenience for empty environments, never a hard
    // requirement to serve traffic — a failure here (e.g. the database
    // isn't reachable yet) must never prevent the server from starting.
    logger.error({ err: error }, 'Platform Bootstrap: failed — server will continue starting without it')
  }
}
