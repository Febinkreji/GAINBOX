import { userRepository } from '../user/user.repository.js'
import { auditService } from '../audit/audit.service.js'
import { outboxService } from '../outbox/outbox.service.js'
import { withTransaction } from '../../database/connection.js'
import { ValidationError } from '../../errors/index.js'

/**
 * Reconciles a verified provider identity (see
 * ../auth/identityProvider.port.js — AuthenticatedIdentity, already
 * provider-agnostic) with the internal `users` table, and returns the
 * shape business modules consume as req.user.
 *
 * This is the seam that keeps `firebaseUid` from leaking into business
 * modules: they only ever see the internal Postgres UUID. Swapping or
 * adding identity providers (Apple, Microsoft, Enterprise SSO) means
 * teaching the adapter to produce an AuthenticatedIdentity — this service,
 * and everything downstream of it, is unaffected.
 *
 * Not Authorization: this never inspects role/permission/status to decide
 * whether the request may proceed — only whether the identity's record
 * exists and is current. See identitySync.service.js's future integration
 * note in the auth middleware for where a status check would go.
 */
export const identitySyncService = {
  async sync(identity) {
    if (!identity.email) {
      // The `users.email` column is NOT NULL (migration 0003) — Firebase
      // phone-only/anonymous sign-in produces no email, so there's no
      // account to reconcile against yet. A deliberate limitation, not an
      // oversight: those sign-in methods aren't supported by this schema.
      throw new ValidationError('Authenticated identity has no email; phone-only or anonymous sign-in is not yet supported')
    }

    const existing = await userRepository.findByFirebaseUid(identity.id)

    if (existing) {
      return toRequestIdentity(await syncExisting(existing, identity))
    }

    // Development Bootstrap support (see
    // src/bootstrap/platformAdminBootstrap.js): that module may have
    // already created a placeholder user row for a known email — no
    // firebase_uid yet, since nobody had signed in when it ran. If this
    // identity's email matches one of those rows, link this real Firebase
    // UID to it instead of falling through to createUser(), which would
    // otherwise fail on the email uniqueness constraint (or worse, silently
    // create a second, unrelated account for someone who already has a
    // platform-admin role waiting for them).
    const unclaimed = await userRepository.findUnclaimedByEmail(identity.email)

    if (unclaimed) {
      return toRequestIdentity(await claimUnclaimedUser(unclaimed, identity))
    }

    return toRequestIdentity(await createUser(identity))
  },
}

async function createUser(identity) {
  try {
    return await withTransaction(async (client) => {
      const created = await userRepository.create(
        { firebaseUid: identity.id, email: identity.email, displayName: identity.name },
        client,
      )

      await auditService.record(
        {
          entityType: 'user',
          entityId: created.id,
          action: 'user.provisioned',
          actorUserId: created.id,
          metadata: { firebaseUid: created.firebaseUid, email: created.email },
        },
        client,
      )

      await outboxService.publish(
        { eventType: 'UserProvisioned', aggregateType: 'user', aggregateId: created.id, payload: created },
        client,
      )

      return created
    })
  } catch (error) {
    if (error.code === '23505') {
      // Two requests raced to provision the same brand-new firebase_uid
      // (e.g. a client firing several calls right after first sign-in) —
      // the loser here just adopts the winner's row instead of failing.
      const winner = await userRepository.findByFirebaseUid(identity.id)
      if (winner) return winner
    }

    throw error
  }
}

/**
 * Links a real Firebase UID to a placeholder user row (see migration 0026
 * and userRepository.findUnclaimedByEmail) — the bootstrap counterpart to
 * syncExisting() above, distinguished only by also writing firebaseUid,
 * which a normal sync never touches. The email is already known to match
 * (that's how `unclaimed` was found), so there's nothing to reconcile
 * there; displayName is filled in from the real Google profile if the
 * placeholder had none.
 */
async function claimUnclaimedUser(existing, identity) {
  return withTransaction(async (client) => {
    const updated = await userRepository.update(
      existing.id,
      { firebaseUid: identity.id, displayName: identity.name ?? existing.displayName },
      client,
    )

    await auditService.record(
      {
        entityType: 'user',
        entityId: existing.id,
        action: 'user.claimed',
        actorUserId: existing.id,
        metadata: { email: existing.email },
      },
      client,
    )

    return updated
  })
}

async function syncExisting(existing, identity) {
  const changes = {}

  if (identity.email !== existing.email) {
    changes.email = identity.email
  }

  if (identity.name !== existing.displayName) {
    changes.displayName = identity.name
  }

  if (Object.keys(changes).length === 0) {
    return existing
  }

  return withTransaction(async (client) => {
    const updated = await userRepository.update(existing.id, changes, client)

    await auditService.record(
      {
        entityType: 'user',
        entityId: existing.id,
        action: 'user.synced',
        actorUserId: existing.id,
        metadata: { changes },
      },
      client,
    )

    return updated
  })
}

function toRequestIdentity(user) {
  return {
    id: user.id,
    firebaseUid: user.firebaseUid,
    email: user.email,
    displayName: user.displayName,
    status: user.status,
  }
}
