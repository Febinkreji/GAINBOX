import { useCallback, useEffect, useState } from 'react'
import { Copy, Plus, RefreshCw, Users, XCircle } from 'lucide-react'
import PageHeader from '@/components/common/PageHeader'
import EmptyState from '@/components/common/EmptyState'
import ErrorState from '@/components/common/ErrorState'
import DataTable from '@/components/tables/DataTable'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import FormField from '@/components/forms/FormField'
import Input from '@/components/forms/Input'
import Select from '@/components/forms/Select'
import { cn } from '@/utils/cn'
import { useToast } from '@/hooks/useToast'
import { useDisclosure } from '@/hooks/useDisclosure'
import {
  listStaff,
  removeStaff,
  listInvitations,
  inviteStaff,
  resendInvitation,
  revokeInvitation,
} from '@/services/staffService'

const ROLE_OPTIONS = ['merchant-owner', 'merchant-staff', 'viewer']
const STAFF_STATUS_TONE = { active: 'success', removed: 'neutral' }
const INVITATION_STATUS_TONE = { pending: 'brand', accepted: 'success', expired: 'neutral', revoked: 'danger' }

function StaffTab() {
  const toast = useToast()
  const [state, setState] = useState({ status: 'loading', items: [] })
  const [pendingRemove, setPendingRemove] = useState(null)
  const [isRemoving, setIsRemoving] = useState(false)

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, status: 'loading' }))
    try {
      const items = await listStaff()
      setState({ status: 'ready', items })
    } catch (error) {
      setState({ status: 'error', items: [] })
      toast.error(error.message)
    }
  }, [toast])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  async function handleRemove() {
    setIsRemoving(true)
    try {
      await removeStaff(pendingRemove.id)
      toast.success('Staff member removed')
      setPendingRemove(null)
      load()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setIsRemoving(false)
    }
  }

  const activeStaff = state.items.filter((entry) => entry.status === 'active')

  const columns = [
    { key: 'displayName', header: 'Name', render: (row) => row.displayName || '—' },
    { key: 'email', header: 'Email' },
    { key: 'roleName', header: 'Role' },
    { key: 'status', header: 'Status', render: (row) => <Badge tone={STAFF_STATUS_TONE[row.status]}>{row.status}</Badge> },
    {
      key: 'actions',
      header: '',
      render: (row) =>
        row.status === 'active' &&
        row.roleName !== 'merchant-owner' && (
          <button
            type="button"
            onClick={() => setPendingRemove(row)}
            className="flex items-center gap-1 text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
          >
            <XCircle size={14} />
            Remove
          </button>
        ),
    },
  ]

  return (
    <>
      {state.status === 'error' ? (
        <ErrorState description="We couldn't load your staff roster." onRetry={load} />
      ) : state.status === 'ready' && activeStaff.length === 0 ? (
        <EmptyState icon={Users} compact title="No active staff" description="Invite your team from the Invitations tab." />
      ) : (
        <DataTable columns={columns} rows={state.status === 'loading' ? [] : activeStaff} emptyMessage="Loading…" />
      )}

      <ConfirmDialog
        isOpen={Boolean(pendingRemove)}
        onClose={() => setPendingRemove(null)}
        onConfirm={handleRemove}
        title="Remove staff member?"
        description={`"${pendingRemove?.displayName || pendingRemove?.email}" will lose access to this merchant.`}
        confirmLabel="Remove"
        isLoading={isRemoving}
      />
    </>
  )
}

function InvitationsTab() {
  const toast = useToast()
  const [state, setState] = useState({ status: 'loading', items: [] })
  const [formValues, setFormValues] = useState({ email: '', displayName: '', role: 'merchant-staff' })
  const [formErrors, setFormErrors] = useState({})
  const [isSaving, setIsSaving] = useState(false)
  const [lastToken, setLastToken] = useState(null)
  const inviteModal = useDisclosure()
  const [pendingRevoke, setPendingRevoke] = useState(null)
  const [isRevoking, setIsRevoking] = useState(false)
  const [resendingId, setResendingId] = useState(null)

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, status: 'loading' }))
    try {
      const res = await listInvitations({ sortBy: 'createdAt', sortOrder: 'desc' })
      setState({ status: 'ready', items: res.data })
    } catch (error) {
      setState({ status: 'error', items: [] })
      toast.error(error.message)
    }
  }, [toast])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  function openInviteModal() {
    setFormValues({ email: '', displayName: '', role: 'merchant-staff' })
    setFormErrors({})
    setLastToken(null)
    inviteModal.open()
  }

  function validateForm() {
    const errors = {}
    if (!/^\S+@\S+\.\S+$/.test(formValues.email.trim())) errors.email = 'Enter a valid email address'
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!validateForm()) return

    setIsSaving(true)
    try {
      const invitation = await inviteStaff({
        email: formValues.email.trim(),
        displayName: formValues.displayName.trim() || undefined,
        role: formValues.role,
      })
      toast.success('Invitation created')
      setLastToken(invitation.token)
      load()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleResend(invitation) {
    setResendingId(invitation.id)
    try {
      const resent = await resendInvitation(invitation.id)
      toast.success('Invitation resent')
      setLastToken(resent.token)
      inviteModal.open()
      load()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setResendingId(null)
    }
  }

  async function handleRevoke() {
    setIsRevoking(true)
    try {
      await revokeInvitation(pendingRevoke.id)
      toast.success('Invitation revoked')
      setPendingRevoke(null)
      load()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setIsRevoking(false)
    }
  }

  function copyToken() {
    navigator.clipboard?.writeText(lastToken)
    toast.info('Token copied to clipboard')
  }

  const columns = [
    { key: 'email', header: 'Email' },
    { key: 'displayName', header: 'Name', render: (row) => row.displayName || '—' },
    { key: 'role', header: 'Role' },
    { key: 'status', header: 'Status', render: (row) => <Badge tone={INVITATION_STATUS_TONE[row.status]}>{row.status}</Badge> },
    {
      key: 'actions',
      header: '',
      render: (row) =>
        (row.status === 'pending' || row.status === 'expired') && (
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => handleResend(row)}
              disabled={resendingId === row.id}
              className="flex items-center gap-1 text-sm text-brand-400 hover:text-brand-300 disabled:opacity-50"
            >
              <RefreshCw size={14} className={resendingId === row.id ? 'animate-spin' : ''} />
              Resend
            </button>
            <button
              type="button"
              onClick={() => setPendingRevoke(row)}
              className="flex items-center gap-1 text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
            >
              <XCircle size={14} />
              Revoke
            </button>
          </div>
        ),
    },
  ]

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button type="button" onClick={openInviteModal}>
          <Plus size={16} />
          Invite Staff
        </Button>
      </div>

      {state.status === 'error' ? (
        <ErrorState description="We couldn't load invitations." onRetry={load} />
      ) : state.status === 'ready' && state.items.length === 0 ? (
        <EmptyState icon={Users} compact title="No invitations yet" description="Invite someone to join your team." />
      ) : (
        <DataTable columns={columns} rows={state.status === 'loading' ? [] : state.items} emptyMessage="Loading…" />
      )}

      <Modal isOpen={inviteModal.isOpen} onClose={inviteModal.close} title="Invite Staff">
        {lastToken ? (
          <div className="space-y-4">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Share this invitation token with the invitee — there's no email delivery yet, so this is the only way
              they can accept.
            </p>
            <div className="flex items-center gap-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 px-3 py-2">
              <code className="flex-1 truncate text-xs text-neutral-700 dark:text-neutral-300">{lastToken}</code>
              <button type="button" onClick={copyToken} className="shrink-0 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200">
                <Copy size={15} />
              </button>
            </div>
            <div className="flex justify-end pt-2">
              <Button type="button" onClick={inviteModal.close}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField label="Email" htmlFor="invite-email" error={formErrors.email}>
              <Input
                id="invite-email"
                type="email"
                value={formValues.email}
                onChange={(event) => setFormValues((prev) => ({ ...prev, email: event.target.value }))}
                placeholder="staff@example.com"
              />
            </FormField>
            <FormField label="Display name" htmlFor="invite-name">
              <Input
                id="invite-name"
                value={formValues.displayName}
                onChange={(event) => setFormValues((prev) => ({ ...prev, displayName: event.target.value }))}
              />
            </FormField>
            <FormField label="Role" htmlFor="invite-role">
              <Select
                id="invite-role"
                value={formValues.role}
                onChange={(event) => setFormValues((prev) => ({ ...prev, role: event.target.value }))}
              >
                {ROLE_OPTIONS.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </Select>
            </FormField>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={inviteModal.close} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Sending…' : 'Send invitation'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(pendingRevoke)}
        onClose={() => setPendingRevoke(null)}
        onConfirm={handleRevoke}
        title="Revoke invitation?"
        description={`The invitation for "${pendingRevoke?.email}" will no longer be acceptable.`}
        confirmLabel="Revoke"
        isLoading={isRevoking}
      />
    </>
  )
}

export default function Staff() {
  const [tab, setTab] = useState('roster')

  return (
    <>
      <PageHeader title="Staff" description="Manage who has access to your merchant account." />

      <div className="mb-6 inline-flex rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-100/60 dark:bg-neutral-900/60 p-1">
        {[
          { key: 'roster', label: 'Staff' },
          { key: 'invitations', label: 'Invitations' },
        ].map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={cn(
              'rounded-md px-4 py-1.5 text-sm font-medium transition-colors',
              tab === item.key
                ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400'
                : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'roster' ? <StaffTab /> : <InvitationsTab />}
    </>
  )
}
