import { invitationRepository } from './invitation.repository.js'
import { merchantRepository } from '../merchant/merchant.repository.js'
import { roleRepository } from '../role/role.repository.js'
import { merchantStaffRepository } from '../merchantStaff/merchantStaff.repository.js'
import { generateInvitationToken, hashInvitationToken } from './invitationToken.js'
import { auditService } from '../audit/audit.service.js'
import { outboxService } from '../outbox/outbox.service.js'
import { withTransaction } from '../../database/connection.js'
import { NotFoundError, ConflictError, ForbiddenError, UnauthorizedError } from '../../errors/index.js'
import { parsePagination, buildPaginationMeta } from '../../utils/pagination.js'

const INVITATION_TTL_DAYS = 7

function expiryDate() {
  return new Date(Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000)
}

/**
 * Shared by accept() and previewByToken() — every validity check the
 * invitation lifecycle needs, in one place, so a preview can never
 * disagree with what accept() would actually do (e.g. show "pending" for
 * a token that would then be rejected as expired). Read-only: the one
 * exception is the lazy-expiry write, which was already part of accept()'s
 * existing behavior and is idempotent regardless of which caller triggers
 * it first.
 */
async function resolveInvitationByToken(tokenPlaintext, user) {
  const tokenHash = hashInvitationToken(tokenPlaintext)
  const invitation = await invitationRepository.findByTokenHash(tokenHash)

  if (!invitation) {
    throw new UnauthorizedError('Invalid invitation token')
  }

  if (invitation.status === 'accepted') {
    throw new ConflictError('This invitation has already been accepted')
  }

  if (invitation.status === 'revoked') {
    throw new ConflictError('This invitation has been revoked')
  }

  if (invitation.status === 'expired' || invitation.expiresAt <= new Date()) {
    if (invitation.status !== 'expired') {
      // Lazy expiry: no background sweeper exists (out of scope for this
      // phase) — the first accept attempt after expiry is what flips the
      // status, so it stays eventually-consistent without a scheduler.
      await invitationRepository.update(invitation.id, { status: 'expired' })
    }

    throw new ConflictError('This invitation has expired')
  }

  // The token is the bearer secret, but it was only ever meant for one
  // recipient — without this check, anyone who obtained the token (not
  // necessarily its intended recipient) could redeem it as themselves.
  if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
    throw new ForbiddenError('This invitation was issued to a different email address')
  }

  // A merchant can be suspended after its owner invitation was already
  // sent — "pending" (not yet activated) is the normal, expected state for
  // a brand-new merchant's very first invitation, so only "suspended"
  // blocks acceptance here.
  if (invitation.merchantStatus === 'suspended') {
    throw new ConflictError('This merchant account is currently suspended')
  }

  return invitation
}

/**
 * Business rules for the invitation lifecycle (pending -> accepted |
 * expired | revoked), same shape as every other domain service:
 *  - create/resend/revoke/accept are audited (and outboxed on create) in
 *    the same transaction as the write itself;
 *  - the plaintext token exists in memory for exactly one response — it's
 *    generated here, hashed before it ever touches the repository/DB, and
 *    never persisted or logged (see invitationToken.js).
 */
export const invitationService = {
  async list(query) {
    const pagination = parsePagination(query)
    const filters = {
      merchantId: query.merchantId,
      status: query.status,
      search: query.search,
      role: query.role,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    }

    const [items, total] = await Promise.all([
      invitationRepository.findAll(filters, pagination),
      invitationRepository.count(filters),
    ])

    return {
      items,
      meta: buildPaginationMeta({ page: pagination.page, pageSize: pagination.pageSize, total }),
    }
  },

  async getById(id) {
    const invitation = await invitationRepository.findById(id)

    if (!invitation) {
      throw new NotFoundError('Invitation not found')
    }

    return invitation
  },

  /**
   * @param {object} data - { merchantId, email, displayName?, role }
   * @param {string} [actorUserId]
   * @param {import('pg').PoolClient} [client] - pass an already-open
   *   transaction client when called from MerchantOnboardingService, so
   *   invitation creation shares that one atomic transaction. Omit to let
   *   this method open its own (Feature 4's standalone POST /invitations).
   */
  async create(data, actorUserId, client) {
    const merchant = await merchantRepository.findById(data.merchantId, client)

    if (!merchant) {
      throw new NotFoundError('Cannot create an invitation for a merchant that does not exist')
    }

    const role = await roleRepository.findByName(data.role, client)

    if (!role) {
      throw new NotFoundError(`Role "${data.role}" does not exist`)
    }

    const { token, tokenHash } = generateInvitationToken()

    const insert = async (txClient) => {
      let created

      try {
        created = await invitationRepository.create(
          {
            merchantId: data.merchantId,
            email: data.email,
            displayName: data.displayName ?? null,
            roleId: role.id,
            tokenHash,
            expiresAt: expiryDate(),
            createdBy: actorUserId ?? null,
          },
          txClient,
        )
      } catch (error) {
        if (error.code === '23505') {
          throw new ConflictError('An invitation is already pending for this email at this merchant')
        }

        throw error
      }

      await auditService.record(
        {
          entityType: 'merchantInvitation',
          entityId: created.id,
          action: 'invitation.created',
          actorUserId: actorUserId ?? null,
          metadata: { merchantId: created.merchantId, email: created.email, role: created.role },
        },
        txClient,
      )

      await outboxService.publish(
        { eventType: 'InvitationCreated', aggregateType: 'merchantInvitation', aggregateId: created.id, payload: created },
        txClient,
      )

      return created
    }

    const invitation = client ? await insert(client) : await withTransaction(insert)

    return { ...invitation, token }
  },

  /**
   * Reissues a fresh token/expiration for a pending or expired invitation
   * — accepted/revoked invitations are terminal and can't be resent.
   */
  async resend(id, actorUserId) {
    const existing = await invitationRepository.findById(id)

    if (!existing) {
      throw new NotFoundError('Invitation not found')
    }

    if (existing.status !== 'pending' && existing.status !== 'expired') {
      throw new ConflictError(`Cannot resend an invitation with status "${existing.status}"`)
    }

    const { token, tokenHash } = generateInvitationToken()

    const updated = await withTransaction(async (client) => {
      const result = await invitationRepository.update(
        id,
        { tokenHash, expiresAt: expiryDate(), status: 'pending' },
        client,
      )

      await auditService.record(
        {
          entityType: 'merchantInvitation',
          entityId: id,
          action: 'invitation.resent',
          actorUserId: actorUserId ?? null,
          metadata: { email: existing.email },
        },
        client,
      )

      return result
    })

    return { ...updated, token }
  },

  async revoke(id, actorUserId) {
    const existing = await invitationRepository.findById(id)

    if (!existing) {
      throw new NotFoundError('Invitation not found')
    }

    if (existing.status !== 'pending' && existing.status !== 'expired') {
      throw new ConflictError(`Cannot revoke an invitation with status "${existing.status}"`)
    }

    return withTransaction(async (client) => {
      const updated = await invitationRepository.update(id, { status: 'revoked' }, client)

      await auditService.record(
        {
          entityType: 'merchantInvitation',
          entityId: id,
          action: 'invitation.revoked',
          actorUserId: actorUserId ?? null,
          metadata: { email: existing.email },
        },
        client,
      )

      return updated
    })
  },

  /**
   * Read-only counterpart to accept() — lets the invitation-acceptance UI
   * show merchant name / invited email / status before the user commits,
   * without creating the merchant_staff row or marking anything accepted.
   * Reuses resolveInvitationByToken so its validity rules can never drift
   * from what accept() itself enforces.
   */
  async previewByToken(tokenPlaintext, user) {
    const invitation = await resolveInvitationByToken(tokenPlaintext, user)

    return {
      merchantId: invitation.merchantId,
      businessName: invitation.businessName,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
    }
  },

  /**
   * Feature 5 — called after requireAuth() has already verified the
   * caller's identity via Firebase + Identity Sync (see
   * auth.routes.js). `user` is req.user (the internal Postgres user, never
   * a raw Firebase identity — per Authorization's own "never trust
   * Firebase claims" rule, this only ever reads from req.user, which
   * Identity Sync already reconciled against Postgres).
   */
  async accept(tokenPlaintext, user) {
    const invitation = await resolveInvitationByToken(tokenPlaintext, user)

    const assignment = await withTransaction(async (client) => {
      let created

      try {
        created = await merchantStaffRepository.create(
          { merchantId: invitation.merchantId, userId: user.id, roleId: invitation.roleId, invitedBy: invitation.createdBy },
          client,
        )
      } catch (error) {
        if (error.code === '23505') {
          throw new ConflictError('You already have an assignment at this merchant')
        }

        throw error
      }

      await invitationRepository.update(invitation.id, { status: 'accepted', acceptedAt: new Date() }, client)

      await auditService.record(
        {
          entityType: 'merchantInvitation',
          entityId: invitation.id,
          action: 'invitation.accepted',
          actorUserId: user.id,
          metadata: { merchantId: invitation.merchantId, role: invitation.role, merchantStaffId: created.id },
        },
        client,
      )

      return created
    })

    return { merchantId: invitation.merchantId, businessName: invitation.businessName, role: invitation.role, status: 'accepted', merchantStaffId: assignment.id }
  },
}
