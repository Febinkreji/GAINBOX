import { merchantService } from '../merchant/merchant.service.js'
import { userRepository } from '../user/user.repository.js'
import { roleRepository } from '../role/role.repository.js'
import { merchantStaffRepository } from '../merchantStaff/merchantStaff.repository.js'
import { invitationService } from '../invitation/invitation.service.js'
import { auditService } from '../audit/audit.service.js'
import { outboxService } from '../outbox/outbox.service.js'
import { withTransaction } from '../../database/connection.js'
import { ConflictError } from '../../errors/index.js'

const OWNER_ROLE_NAME = 'merchant-owner'

/**
 * Orchestrates the Business Flow's first three steps (Create Merchant ->
 * Assign Initial Merchant Owner -> Send Invitation) as one atomic unit —
 * this is the *only* place that decision is made; merchant.service.js,
 * invitation.service.js, and merchantStaffRepository each still own their
 * individual write, audit, and validation rules. Nothing here duplicates
 * merchant-creation or invitation-creation logic — it calls the existing
 * services/repositories, passing its own transaction's client through so
 * every write commits or rolls back together.
 */
export const merchantOnboardingService = {
  /**
   * @param {object} data - { merchant: {...merchantDetailsSchema}, ownerEmail, ownerDisplayName? }
   */
  async onboard(data, actorUserId) {
    // Platform Administration phase: ownerEmail is optional, so a Platform
    // Admin can create a merchant alone (Step 1) and invite its owner later
    // via standalone POST /platform/invitations (Step 2) instead of always
    // doing both atomically. Only look up the owner role — a deployment
    // invariant check — when an owner is actually being assigned.
    const ownerRole = data.ownerEmail ? await roleRepository.findByName(OWNER_ROLE_NAME) : null

    if (data.ownerEmail && !ownerRole) {
      // Not a client error — the seed data this depends on (see seeds/
      // 0001_roles_and_permissions.sql) is a deployment invariant, not
      // something a request payload could ever cause.
      throw new Error(`"${OWNER_ROLE_NAME}" role is not seeded — cannot onboard a merchant owner`)
    }

    const result = await withTransaction(async (client) => {
      // merchantService.create's optional third argument makes this
      // participate in *this* transaction instead of opening its own —
      // see merchant.service.js's docstring on that parameter.
      const merchant = await merchantService.create(data.merchant, actorUserId, client)

      if (!data.ownerEmail) {
        return { merchant, ownerLinked: false, staffAssignment: null, invitation: null }
      }

      const existingUser = await userRepository.findByEmail(data.ownerEmail, client)

      if (existingUser) {
        let staffAssignment

        try {
          staffAssignment = await merchantStaffRepository.create(
            { merchantId: merchant.id, userId: existingUser.id, roleId: ownerRole.id, invitedBy: actorUserId ?? null },
            client,
          )
        } catch (error) {
          if (error.code === '23505') {
            throw new ConflictError('This user is already assigned to this merchant')
          }

          throw error
        }

        await auditService.record(
          {
            entityType: 'merchantStaff',
            entityId: staffAssignment.id,
            action: 'merchantStaff.created',
            actorUserId: actorUserId ?? null,
            metadata: { merchantId: merchant.id, userId: existingUser.id, role: OWNER_ROLE_NAME, onboarding: true },
          },
          client,
        )

        await outboxService.publish(
          {
            eventType: 'MerchantOwnerAssigned',
            aggregateType: 'merchantStaff',
            aggregateId: staffAssignment.id,
            payload: staffAssignment,
          },
          client,
        )

        return { merchant, ownerLinked: true, staffAssignment, invitation: null }
      }

      const invitation = await invitationService.create(
        { merchantId: merchant.id, email: data.ownerEmail, displayName: data.ownerDisplayName, role: OWNER_ROLE_NAME },
        actorUserId,
        client,
      )

      return { merchant, ownerLinked: false, staffAssignment: null, invitation }
    })

    // No separate Surfboard sync call here anymore — merchantService.create()
    // (called above, participating in this same transaction) already
    // queues it via the transactional outbox. See its own docstring.

    return result
  },
}
