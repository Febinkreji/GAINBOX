import { useCallback, useEffect, useState } from 'react'
import { Mail, RefreshCw, XCircle } from 'lucide-react'
import PageHeader from '@/components/common/PageHeader'
import EmptyState from '@/components/common/EmptyState'
import ErrorState from '@/components/common/ErrorState'
import InvitationSuccessModal from '@/components/common/InvitationSuccessModal'
import DataTable from '@/components/tables/DataTable'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import Select from '@/components/forms/Select'
import { useToast } from '@/hooks/useToast'
import { useDisclosure } from '@/hooks/useDisclosure'
import { listInvitations, resendInvitation, revokeInvitation } from '@/services/platformService'

const STATUS_TONE = { pending: 'brand', accepted: 'success', expired: 'neutral', revoked: 'danger' }
const ROLE_OPTIONS = ['merchant-owner', 'merchant-staff', 'viewer']
const PAGE_SIZE = 15

export default function Invitations() {
  const toast = useToast()

  const [state, setState] = useState({ status: 'loading', items: [], meta: null })
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [role, setRole] = useState('')
  const [page, setPage] = useState(1)

  const [pendingRevoke, setPendingRevoke] = useState(null)
  const [isRevoking, setIsRevoking] = useState(false)
  const [resendingId, setResendingId] = useState(null)
  const [lastInvitation, setLastInvitation] = useState(null)
  const invitationModal = useDisclosure()

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, status: 'loading' }))
    try {
      const res = await listInvitations({
        page,
        pageSize: PAGE_SIZE,
        search: search || undefined,
        status: status || undefined,
        role: role || undefined,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      })
      setState({ status: 'ready', items: res.data, meta: res.meta })
    } catch (error) {
      setState({ status: 'error', items: [], meta: null })
      toast.error(error.message)
    }
  }, [page, search, status, role, toast])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  async function handleResend(invitation) {
    setResendingId(invitation.id)
    try {
      const resent = await resendInvitation(invitation.id)
      toast.success('Invitation resent')
      load()
      setLastInvitation(resent)
      invitationModal.open()
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

  const columns = [
    { key: 'businessName', header: 'Merchant' },
    { key: 'email', header: 'Email' },
    { key: 'displayName', header: 'Name', render: (row) => row.displayName || '—' },
    { key: 'role', header: 'Role' },
    { key: 'status', header: 'Status', render: (row) => <Badge tone={STATUS_TONE[row.status] ?? 'neutral'}>{row.status}</Badge> },
    { key: 'expiresAt', header: 'Expires', render: (row) => new Date(row.expiresAt).toLocaleDateString() },
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
              className="flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 disabled:opacity-50"
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
      <PageHeader title="Invitations" description="Every merchant-owner and staff invitation across the platform." />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-100/60 dark:bg-neutral-900/60 px-3 py-2 sm:max-w-sm sm:flex-1">
          <input
            value={search}
            onChange={(event) => {
              setPage(1)
              setSearch(event.target.value)
            }}
            placeholder="Search by email or name…"
            className="w-full bg-transparent text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none"
          />
        </div>
        <Select
          value={status}
          onChange={(event) => {
            setPage(1)
            setStatus(event.target.value)
          }}
          className="sm:w-44"
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="accepted">Accepted</option>
          <option value="expired">Expired</option>
          <option value="revoked">Revoked</option>
        </Select>
        <Select
          value={role}
          onChange={(event) => {
            setPage(1)
            setRole(event.target.value)
          }}
          className="sm:w-48"
        >
          <option value="">All roles</option>
          {ROLE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </Select>
      </div>

      {state.status === 'error' ? (
        <ErrorState description="We couldn't load invitations." onRetry={load} />
      ) : state.status === 'ready' && state.items.length === 0 ? (
        <EmptyState icon={Mail} title="No invitations found" description="Invite an owner from a merchant's details page." />
      ) : (
        <>
          <DataTable columns={columns} rows={state.status === 'loading' ? [] : state.items} emptyMessage="Loading…" />
          {state.meta && state.meta.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm text-neutral-500">
              <span>
                Page {state.meta.page} of {state.meta.totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((prev) => prev - 1)}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={page >= state.meta.totalPages}
                  onClick={() => setPage((prev) => prev + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <InvitationSuccessModal
        isOpen={invitationModal.isOpen}
        onClose={invitationModal.close}
        invitation={lastInvitation}
      />

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
