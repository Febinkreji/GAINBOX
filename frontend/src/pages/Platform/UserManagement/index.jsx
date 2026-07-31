import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, UserCog } from 'lucide-react'
import PageHeader from '@/components/common/PageHeader'
import EmptyState from '@/components/common/EmptyState'
import ErrorState from '@/components/common/ErrorState'
import DataTable from '@/components/tables/DataTable'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Select from '@/components/forms/Select'
import { useToast } from '@/hooks/useToast'
import { listUsers } from '@/services/platformService'
import { platformUserDetailsPath } from '@/constants/routes'

const STATUS_TONE = { active: 'success', invited: 'warning', disabled: 'danger' }
const ROLE_OPTIONS = ['platform-admin', 'merchant-owner', 'merchant-staff', 'viewer', 'customer']
const PAGE_SIZE = 10

export default function UserManagement() {
  const navigate = useNavigate()
  const toast = useToast()

  const [state, setState] = useState({ status: 'loading', items: [], meta: null })
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [role, setRole] = useState('')
  const [page, setPage] = useState(1)

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, status: 'loading' }))
    try {
      const res = await listUsers({
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

  const columns = [
    { key: 'displayName', header: 'Name', render: (row) => row.displayName || '—' },
    { key: 'email', header: 'Email' },
    { key: 'status', header: 'Status', render: (row) => <Badge tone={STATUS_TONE[row.status] ?? 'neutral'}>{row.status}</Badge> },
    {
      key: 'roles',
      header: 'Roles',
      render: (row) => (row.roles.length ? row.roles.join(', ') : '—'),
    },
    { key: 'merchantCount', header: 'Merchants' },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <Button type="button" variant="secondary" size="sm" onClick={() => navigate(platformUserDetailsPath(row.id))}>
          View
        </Button>
      ),
    },
  ]

  return (
    <>
      <PageHeader title="User Management" description="Browse every user on the platform and manage account access." />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-100/60 dark:bg-neutral-900/60 px-3 py-2 sm:max-w-sm sm:flex-1">
          <Search size={16} className="text-neutral-500" />
          <input
            value={search}
            onChange={(event) => {
              setPage(1)
              setSearch(event.target.value)
            }}
            placeholder="Search by name or email…"
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
          <option value="active">Active</option>
          <option value="invited">Invited</option>
          <option value="disabled">Disabled</option>
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
        <ErrorState description="We couldn't load users." onRetry={load} />
      ) : state.status === 'ready' && state.items.length === 0 ? (
        <EmptyState icon={UserCog} title="No users found" description="Try adjusting your search or filters." />
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
    </>
  )
}
