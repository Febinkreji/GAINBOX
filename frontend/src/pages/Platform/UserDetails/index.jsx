import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Power as PowerIcon, PowerOff } from 'lucide-react'
import PageHeader from '@/components/common/PageHeader'
import ErrorState from '@/components/common/ErrorState'
import EmptyState from '@/components/common/EmptyState'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Skeleton from '@/components/ui/Skeleton'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import DataTable from '@/components/tables/DataTable'
import { useToast } from '@/hooks/useToast'
import { ROUTES } from '@/constants/routes'
import { getUserDetails, activateUser, deactivateUser } from '@/services/platformService'

const STATUS_TONE = { active: 'success', invited: 'warning', disabled: 'danger' }
const ASSIGNMENT_STATUS_TONE = { active: 'success', removed: 'neutral' }

export default function UserDetails() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()

  const [state, setState] = useState({ status: 'loading', details: null })
  const [lifecycleAction, setLifecycleAction] = useState(null) // 'activate' | 'deactivate' | null
  const [isTransitioning, setIsTransitioning] = useState(false)

  const load = useCallback(async () => {
    setState({ status: 'loading', details: null })
    try {
      const details = await getUserDetails(userId)
      setState({ status: 'ready', details })
    } catch (error) {
      setState({ status: 'error', details: null })
      toast.error(error.message)
    }
  }, [userId, toast])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  async function handleLifecycleConfirm() {
    setIsTransitioning(true)
    try {
      if (lifecycleAction === 'activate') {
        await activateUser(userId)
        toast.success('User activated')
      } else {
        await deactivateUser(userId)
        toast.success('User deactivated')
      }
      setLifecycleAction(null)
      load()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setIsTransitioning(false)
    }
  }

  if (state.status === 'error') {
    return (
      <>
        <PageHeader title="User Details" />
        <ErrorState description="We couldn't load this user." onRetry={load} />
      </>
    )
  }

  if (state.status === 'loading') {
    return (
      <>
        <PageHeader title="User Details" />
        <Card>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-8 w-full" />
            ))}
          </div>
        </Card>
      </>
    )
  }

  const { user, merchantAssignments, roles, permissions } = state.details

  const assignmentColumns = [
    { key: 'businessName', header: 'Merchant' },
    { key: 'roleName', header: 'Role' },
    { key: 'status', header: 'Status', render: (row) => <Badge tone={ASSIGNMENT_STATUS_TONE[row.status] ?? 'neutral'}>{row.status}</Badge> },
    { key: 'createdAt', header: 'Since', render: (row) => new Date(row.createdAt).toLocaleDateString() },
  ]

  return (
    <>
      <PageHeader
        title={user.displayName || user.email}
        description="Account details, platform roles, and merchant assignments."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => navigate(ROUTES.PLATFORM_USERS)}>
              <ArrowLeft size={16} />
              Back
            </Button>
            {user.status === 'disabled' ? (
              <Button type="button" onClick={() => setLifecycleAction('activate')}>
                <PowerIcon size={16} />
                Activate
              </Button>
            ) : (
              <Button type="button" variant="danger" onClick={() => setLifecycleAction('deactivate')}>
                <PowerOff size={16} />
                Deactivate
              </Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Account</h2>
            <Badge tone={STATUS_TONE[user.status] ?? 'neutral'}>{user.status}</Badge>
          </div>
          <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-neutral-500">Email</dt>
              <dd className="text-neutral-800 dark:text-neutral-200">{user.email}</dd>
            </div>
            <div>
              <dt className="text-neutral-500">Display name</dt>
              <dd className="text-neutral-800 dark:text-neutral-200">{user.displayName || '—'}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-neutral-500">Firebase UID</dt>
              <dd className="truncate font-mono text-xs text-neutral-300 dark:text-neutral-600 dark:text-neutral-300">{user.firebaseUid}</dd>
            </div>
            <div>
              <dt className="text-neutral-500">Created</dt>
              <dd className="text-neutral-800 dark:text-neutral-200">{new Date(user.createdAt).toLocaleDateString()}</dd>
            </div>
            <div>
              <dt className="text-neutral-500">Last updated</dt>
              <dd className="text-neutral-800 dark:text-neutral-200">{new Date(user.updatedAt).toLocaleDateString()}</dd>
            </div>
          </dl>
        </Card>

        <Card>
          <h2 className="mb-4 text-sm font-semibold text-neutral-900 dark:text-neutral-100">Platform roles</h2>
          {roles.length === 0 ? (
            <p className="text-sm text-neutral-500">No roles assigned.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {roles.map((roleName) => (
                <Badge key={roleName} tone="brand">
                  {roleName}
                </Badge>
              ))}
            </div>
          )}

          <h3 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-neutral-500">Permissions</h3>
          {permissions.length === 0 ? (
            <p className="text-sm text-neutral-500">No permissions granted.</p>
          ) : (
            <ul className="space-y-1 text-sm text-neutral-300 dark:text-neutral-600 dark:text-neutral-300">
              {permissions.map((permission) => (
                <li key={permission} className="font-mono text-xs">
                  {permission}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-6">
        <h2 className="mb-4 text-sm font-semibold text-neutral-900 dark:text-neutral-100">Merchant assignments</h2>
        {merchantAssignments.length === 0 ? (
          <EmptyState compact title="No merchant assignments" description="This user has never been staffed at a merchant." />
        ) : (
          <DataTable columns={assignmentColumns} rows={merchantAssignments} />
        )}
      </div>

      <ConfirmDialog
        isOpen={Boolean(lifecycleAction)}
        onClose={() => setLifecycleAction(null)}
        onConfirm={handleLifecycleConfirm}
        title={lifecycleAction === 'activate' ? 'Activate user?' : 'Deactivate user?'}
        description={
          lifecycleAction === 'activate'
            ? `"${user.displayName || user.email}" will regain access to the platform.`
            : `"${user.displayName || user.email}" will lose access until reactivated.`
        }
        confirmLabel={lifecycleAction === 'activate' ? 'Activate' : 'Deactivate'}
        tone={lifecycleAction === 'activate' ? 'primary' : 'danger'}
        isLoading={isTransitioning}
      />
    </>
  )
}
