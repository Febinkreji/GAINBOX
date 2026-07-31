import { useCallback, useEffect, useState } from 'react'
import { Pencil, Plus, Search, Tablet, Trash2 } from 'lucide-react'
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
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { useDisclosure } from '@/hooks/useDisclosure'
import { listDevices, createDevice, updateDevice, deleteDevice } from '@/services/deviceService'
import { listBranches } from '@/services/storeService'

const STATUS_TONE = { active: 'success', registered: 'brand', offline: 'danger', deactivated: 'neutral' }
const PAGE_SIZE = 10

const EMPTY_FORM = { label: '', branchId: '' }

export default function Devices() {
  const { merchant, roles } = useAuth()
  const toast = useToast()
  const canWrite = roles.includes('merchant-owner') || roles.includes('merchant-staff')

  const [state, setState] = useState({ status: 'loading', items: [], meta: null })
  const [branches, setBranches] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)

  const [formValues, setFormValues] = useState(EMPTY_FORM)
  const [formErrors, setFormErrors] = useState({})
  const [editingDevice, setEditingDevice] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const formModal = useDisclosure()

  const [pendingDelete, setPendingDelete] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, status: 'loading' }))

    try {
      const [devicesRes, branchesRes] = await Promise.all([
        listDevices({
          page,
          pageSize: PAGE_SIZE,
          search: search || undefined,
          status: statusFilter || undefined,
          sortBy: 'createdAt',
          sortOrder: 'desc',
        }),
        listBranches({ merchantId: merchant.merchantId, pageSize: 100 }),
      ])
      setState({ status: 'ready', items: devicesRes.data, meta: devicesRes.meta })
      setBranches(branchesRes.data)
    } catch (error) {
      setState({ status: 'error', items: [], meta: null })
      toast.error(error.message)
    }
  }, [merchant.merchantId, page, search, statusFilter, toast])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  const branchNameById = Object.fromEntries(branches.map((branch) => [branch.id, branch.name]))

  function openCreateModal() {
    setEditingDevice(null)
    setFormValues({ ...EMPTY_FORM, branchId: branches[0]?.id ?? '' })
    setFormErrors({})
    formModal.open()
  }

  function openEditModal(device) {
    setEditingDevice(device)
    setFormValues({ label: device.label, branchId: device.branchId, status: device.status })
    setFormErrors({})
    formModal.open()
  }

  function validateForm() {
    const errors = {}
    if (!formValues.label.trim()) errors.label = 'Device label is required'
    if (!editingDevice && !formValues.branchId) errors.branchId = 'Select a branch'
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!validateForm()) return

    setIsSaving(true)

    try {
      if (editingDevice) {
        await updateDevice(editingDevice.id, { label: formValues.label.trim(), status: formValues.status })
        toast.success('Device updated')
      } else {
        await createDevice({ label: formValues.label.trim(), branchId: formValues.branchId })
        toast.success('Device registered')
      }
      formModal.close()
      load()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete() {
    setIsDeleting(true)
    try {
      await deleteDevice(pendingDelete.id)
      toast.success('Device deleted')
      setPendingDelete(null)
      load()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setIsDeleting(false)
    }
  }

  const columns = [
    { key: 'label', header: 'Label' },
    { key: 'branch', header: 'Branch', render: (row) => branchNameById[row.branchId] ?? '—' },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge tone={STATUS_TONE[row.status] ?? 'neutral'}>{row.status}</Badge>,
    },
    ...(canWrite
      ? [
          {
            key: 'actions',
            header: '',
            render: (row) => (
              <div className="flex items-center justify-end gap-1">
                <button
                  type="button"
                  onClick={() => openEditModal(row)}
                  className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                >
                  <Pencil size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setPendingDelete(row)}
                  className="rounded-md p-1.5 text-neutral-500 hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ),
          },
        ]
      : []),
  ]

  return (
    <>
      <PageHeader
        title="Devices"
        description="Register and manage payment terminals across your branches."
        actions={
          canWrite && (
            <Button type="button" onClick={openCreateModal} disabled={branches.length === 0}>
              <Plus size={16} />
              Register Device
            </Button>
          )
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-100/60 dark:bg-neutral-900/60 px-3 py-2 sm:max-w-sm sm:flex-1">
          <Search size={16} className="text-neutral-500" />
          <input
            value={search}
            onChange={(event) => {
              setPage(1)
              setSearch(event.target.value)
            }}
            placeholder="Search devices…"
            className="w-full bg-transparent text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none"
          />
        </div>
        <Select
          value={statusFilter}
          onChange={(event) => {
            setPage(1)
            setStatusFilter(event.target.value)
          }}
          className="sm:w-48"
        >
          <option value="">All statuses</option>
          <option value="registered">Registered</option>
          <option value="active">Active</option>
          <option value="offline">Offline</option>
          <option value="deactivated">Deactivated</option>
        </Select>
      </div>

      {state.status === 'error' ? (
        <ErrorState description="We couldn't load your devices." onRetry={load} />
      ) : state.status === 'ready' && state.items.length === 0 ? (
        <EmptyState
          icon={Tablet}
          title="No devices registered yet"
          description={
            branches.length === 0
              ? 'Add a branch first, then register a device to it.'
              : 'Register your first payment terminal to get started.'
          }
          action={
            canWrite &&
            branches.length > 0 && (
              <Button type="button" size="sm" onClick={openCreateModal}>
                <Plus size={16} />
                Register Device
              </Button>
            )
          }
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={state.status === 'loading' ? [] : state.items}
            emptyMessage="Loading…"
          />
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

      <Modal
        isOpen={formModal.isOpen}
        onClose={formModal.close}
        title={editingDevice ? 'Edit Device' : 'Register Device'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Label" htmlFor="device-label" error={formErrors.label}>
            <Input
              id="device-label"
              value={formValues.label}
              onChange={(event) => setFormValues((prev) => ({ ...prev, label: event.target.value }))}
              placeholder="Front Desk Terminal"
            />
          </FormField>

          {!editingDevice && (
            <FormField label="Branch" htmlFor="device-branch" error={formErrors.branchId}>
              <Select
                id="device-branch"
                value={formValues.branchId}
                onChange={(event) => setFormValues((prev) => ({ ...prev, branchId: event.target.value }))}
              >
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </Select>
            </FormField>
          )}

          {editingDevice && (
            <FormField label="Status" htmlFor="device-status">
              <Select
                id="device-status"
                value={formValues.status}
                onChange={(event) => setFormValues((prev) => ({ ...prev, status: event.target.value }))}
              >
                <option value="registered">Registered</option>
                <option value="active">Active</option>
                <option value="offline">Offline</option>
                <option value="deactivated">Deactivated</option>
              </Select>
            </FormField>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={formModal.close} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Saving…' : editingDevice ? 'Save changes' : 'Register device'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={handleDelete}
        title="Delete device?"
        description={`"${pendingDelete?.label}" will be soft-deleted and can be restored by support if needed.`}
        confirmLabel="Delete"
        isLoading={isDeleting}
      />
    </>
  )
}
