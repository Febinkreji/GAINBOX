import { useCallback, useEffect, useState } from 'react'
import { MapPin, Pencil, Plus, Search, Trash2 } from 'lucide-react'
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
import { listBranches, createBranch, updateBranch, deleteBranch, getBranchSyncStatus } from '@/services/storeService'
import { ENTITY_SYNC_TONE, ENTITY_SYNC_LABEL, deriveEntitySyncState } from '@/utils/surfboardSyncStatus'

const STATUS_TONE = { active: 'success', inactive: 'neutral' }
const PAGE_SIZE = 10

const EMPTY_FORM = { name: '', address: '', city: '', state: '', country: '', postalCode: '' }

export default function Branches() {
  const { merchant, roles } = useAuth()
  const toast = useToast()
  const canWrite = roles.includes('merchant-owner') || roles.includes('merchant-staff')

  const [state, setState] = useState({ status: 'loading', items: [], meta: null })
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  // Phase 2 — Store & Device Integration. Read-only Surfboard sync badge
  // per row, keyed by branch id — no admin/sync action here (that stays
  // Platform Admin only, see MerchantDetails/index.jsx). Independent of
  // the main `load()` below via Promise.allSettled, same reasoning as
  // MerchantDetails' loadEntitySyncStatuses(): one branch's status fetch
  // failing shouldn't block the rest of the page or hide another row's.
  const [syncMap, setSyncMap] = useState({})

  const [formValues, setFormValues] = useState(EMPTY_FORM)
  const [formErrors, setFormErrors] = useState({})
  const [editingBranch, setEditingBranch] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const formModal = useDisclosure()

  const [pendingDelete, setPendingDelete] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, status: 'loading' }))

    try {
      const res = await listBranches({
        merchantId: merchant.merchantId,
        page,
        pageSize: PAGE_SIZE,
        search: search || undefined,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      })
      setState({ status: 'ready', items: res.data, meta: res.meta })

      const results = await Promise.allSettled(res.data.map((branch) => getBranchSyncStatus(branch.id)))
      setSyncMap(
        Object.fromEntries(
          res.data.map((branch, index) => [branch.id, results[index].status === 'fulfilled' ? results[index].value : null]),
        ),
      )
    } catch (error) {
      setState({ status: 'error', items: [], meta: null })
      toast.error(error.message)
    }
  }, [merchant.merchantId, page, search, toast])

  useEffect(() => {
    // Standard fetch-on-mount/refetch-on-filter-change pattern — see
    // hooks note in Dashboard/index.jsx; no data-fetching library exists
    // in this project.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  function openCreateModal() {
    setEditingBranch(null)
    setFormValues(EMPTY_FORM)
    setFormErrors({})
    formModal.open()
  }

  function openEditModal(branch) {
    setEditingBranch(branch)
    setFormValues({
      name: branch.name,
      address: branch.address ?? '',
      city: branch.city,
      state: branch.state ?? '',
      country: branch.country ?? '',
      postalCode: branch.postalCode ?? '',
      status: branch.status,
    })
    setFormErrors({})
    formModal.open()
  }

  function validateForm() {
    const errors = {}
    if (!formValues.name.trim()) errors.name = 'Branch name is required'
    if (!formValues.city.trim()) errors.city = 'City is required'
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!validateForm()) return

    setIsSaving(true)
    const payload = {
      name: formValues.name.trim(),
      address: formValues.address.trim() || undefined,
      city: formValues.city.trim(),
      state: formValues.state.trim() || undefined,
      country: formValues.country.trim() || undefined,
      postalCode: formValues.postalCode.trim() || undefined,
    }

    try {
      if (editingBranch) {
        await updateBranch(editingBranch.id, { ...payload, status: formValues.status })
        toast.success('Branch updated')
      } else {
        await createBranch({ ...payload, merchantId: merchant.merchantId })
        toast.success('Branch created')
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
      await deleteBranch(pendingDelete.id)
      toast.success('Branch deleted')
      setPendingDelete(null)
      load()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setIsDeleting(false)
    }
  }

  const columns = [
    { key: 'name', header: 'Name' },
    { key: 'city', header: 'City', render: (row) => row.city || '—' },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge tone={STATUS_TONE[row.status] ?? 'neutral'}>{row.status}</Badge>,
    },
    {
      key: 'paymentSync',
      header: 'Payment Sync',
      render: (row) => {
        const syncStatus = deriveEntitySyncState(syncMap[row.id])
        return <Badge tone={ENTITY_SYNC_TONE[syncStatus]}>{ENTITY_SYNC_LABEL[syncStatus]}</Badge>
      },
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
        title="Branches"
        description="Manage gym and outlet locations connected to your merchant account."
        actions={
          canWrite && (
            <Button type="button" onClick={openCreateModal}>
              <Plus size={16} />
              Add Branch
            </Button>
          )
        }
      />

      <div className="mb-4 flex items-center gap-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-100/60 dark:bg-neutral-900/60 px-3 py-2 sm:max-w-sm">
        <Search size={16} className="text-neutral-500" />
        <input
          value={search}
          onChange={(event) => {
            setPage(1)
            setSearch(event.target.value)
          }}
          placeholder="Search branches…"
          className="w-full bg-transparent text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none"
        />
      </div>

      {state.status === 'error' ? (
        <ErrorState description="We couldn't load your branches." onRetry={load} />
      ) : state.status === 'ready' && state.items.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="No branches yet"
          description="Create your first branch location to get started."
          action={
            canWrite && (
              <Button type="button" size="sm" onClick={openCreateModal}>
                <Plus size={16} />
                Add Branch
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
        title={editingBranch ? 'Edit Branch' : 'Add Branch'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Branch name" htmlFor="branch-name" error={formErrors.name}>
            <Input
              id="branch-name"
              value={formValues.name}
              onChange={(event) => setFormValues((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Anna Nagar"
            />
          </FormField>
          <FormField label="City" htmlFor="branch-city" error={formErrors.city}>
            <Input
              id="branch-city"
              value={formValues.city}
              onChange={(event) => setFormValues((prev) => ({ ...prev, city: event.target.value }))}
              placeholder="Chennai"
            />
          </FormField>
          <FormField label="Address" htmlFor="branch-address">
            <Input
              id="branch-address"
              value={formValues.address}
              onChange={(event) => setFormValues((prev) => ({ ...prev, address: event.target.value }))}
            />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="State" htmlFor="branch-state">
              <Input
                id="branch-state"
                value={formValues.state}
                onChange={(event) => setFormValues((prev) => ({ ...prev, state: event.target.value }))}
              />
            </FormField>
            <FormField label="Postal code" htmlFor="branch-postal">
              <Input
                id="branch-postal"
                value={formValues.postalCode}
                onChange={(event) => setFormValues((prev) => ({ ...prev, postalCode: event.target.value }))}
              />
            </FormField>
          </div>
          <FormField label="Country" htmlFor="branch-country">
            <Input
              id="branch-country"
              value={formValues.country}
              onChange={(event) => setFormValues((prev) => ({ ...prev, country: event.target.value }))}
            />
          </FormField>

          {editingBranch && (
            <FormField label="Status" htmlFor="branch-status">
              <Select
                id="branch-status"
                value={formValues.status ?? editingBranch.status}
                onChange={(event) => setFormValues((prev) => ({ ...prev, status: event.target.value }))}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
            </FormField>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={formModal.close} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Saving…' : editingBranch ? 'Save changes' : 'Create branch'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={handleDelete}
        title="Delete branch?"
        description={`"${pendingDelete?.name}" will be soft-deleted and can be restored by support if needed.`}
        confirmLabel="Delete"
        isLoading={isDeleting}
      />
    </>
  )
}
