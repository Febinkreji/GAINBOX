import { Copy } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { useToast } from '@/hooks/useToast'
import { invitationAcceptanceLink } from '@/constants/routes'

const STATUS_TONE = { pending: 'brand', accepted: 'success', expired: 'neutral', revoked: 'danger' }

/**
 * Self-contained success modal shown right after an invitation is created
 * or resent — the token only ever appears in that one response (see
 * backend's invitationToken.js), so this is the only place either form of
 * it can be copied from. Owns its own <Modal> (unlike the old
 * InvitationTokenDisplay, which every caller wrapped in its own differently-
 * titled Modal) so the three creation sites (MerchantManagement,
 * MerchantDetails, Invitations) share one consistent layout and copy.
 *
 * `invitation` is whatever invitationService.create()/resend() returned —
 * { token, email, status, expiresAt, ... } — passed straight through, no
 * re-fetch and no second token generated.
 */
export default function InvitationSuccessModal({ isOpen, onClose, invitation }) {
  const toast = useToast()

  if (!invitation) return null

  const link = invitationAcceptanceLink(invitation.token)

  function copy(value, label) {
    navigator.clipboard?.writeText(value)
    toast.info(`${label} copied to clipboard`)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Invitation Created Successfully">
      <div className="space-y-4">
        <div>
          <p className="mb-1 text-xs font-medium text-neutral-500">Owner Email</p>
          <p className="text-sm text-neutral-800 dark:text-neutral-200">{invitation.email}</p>
        </div>

        <div>
          <p className="mb-1 text-xs font-medium text-neutral-500">Invitation Link</p>
          <div className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 dark:border-neutral-800 dark:bg-neutral-950">
            <code className="flex-1 truncate text-xs text-neutral-700 dark:text-neutral-300">{link}</code>
            <button
              type="button"
              onClick={() => copy(link, 'Link')}
              className="shrink-0 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200"
            >
              <Copy size={15} />
            </button>
          </div>
          <Button type="button" variant="secondary" size="sm" className="mt-2 w-full" onClick={() => copy(link, 'Link')}>
            <Copy size={14} />
            Copy Invitation Link
          </Button>
        </div>

        <div>
          <p className="mb-1 text-xs font-medium text-neutral-500">Invitation Token</p>
          <div className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 dark:border-neutral-800 dark:bg-neutral-950">
            <code className="flex-1 truncate text-xs text-neutral-700 dark:text-neutral-300">{invitation.token}</code>
            <button
              type="button"
              onClick={() => copy(invitation.token, 'Token')}
              className="shrink-0 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200"
            >
              <Copy size={15} />
            </button>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="mt-2 w-full"
            onClick={() => copy(invitation.token, 'Token')}
          >
            <Copy size={14} />
            Copy Token
          </Button>
        </div>

        <div className="flex items-center justify-between border-t border-neutral-200 pt-4 dark:border-neutral-800">
          <div>
            <p className="mb-1 text-xs font-medium text-neutral-500">Status</p>
            <Badge tone={STATUS_TONE[invitation.status] ?? 'neutral'}>{invitation.status}</Badge>
          </div>
          <div className="text-right">
            <p className="mb-1 text-xs font-medium text-neutral-500">Expires</p>
            <p className="text-sm text-neutral-800 dark:text-neutral-200">
              {new Date(invitation.expiresAt).toLocaleDateString(undefined, {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button type="button" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  )
}
