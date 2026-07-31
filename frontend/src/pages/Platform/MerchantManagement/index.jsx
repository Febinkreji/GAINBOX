import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, Plus, Search } from 'lucide-react'
import PageHeader from '@/components/common/PageHeader'
import EmptyState from '@/components/common/EmptyState'
import ErrorState from '@/components/common/ErrorState'
import InvitationSuccessModal from '@/components/common/InvitationSuccessModal'
import DataTable from '@/components/tables/DataTable'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import FormField from '@/components/forms/FormField'
import Input from '@/components/forms/Input'
import Select from '@/components/forms/Select'
import { useToast } from '@/hooks/useToast'
import { useDisclosure } from '@/hooks/useDisclosure'
import { listMerchants, createMerchant } from '@/services/platformService'
import { platformMerchantDetailsPath } from '@/constants/routes'

// Keyed by onboardingStage, not the raw status field — "pending" collapses
// two meaningfully different situations (no owner yet vs. owner invited but
// not accepted) into one value; onboardingStage (computed server-side, see
// platform.service.js) tells them apart without changing what Activate/
// Deactivate actually write.
const STAGE_TONE = { draft: 'neutral', invited: 'warning', active: 'success', suspended: 'danger' }
const BUSINESS_TYPES = [
  'gym',
  'meal-provider',
  'wellness-center',
  'yoga-studio',
  'physio-clinic',
  'nutrition-center',
  'fitness-chain',
  'other',
]
const PAGE_SIZE = 10

const EMPTY_FORM = { businessName: '', businessType: 'gym', contactEmail: '', ownerEmail: '' }

export default function MerchantManagement() {
  const navigate = useNavigate()
  const toast = useToast()

  const [state, setState] = useState({ status: 'loading', items: [], meta: null })
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)

  const [formValues, setFormValues] = useState(EMPTY_FORM)
  const [formErrors, setFormErrors] = useState({})
  const [isSaving, setIsSaving] = useState(false)
  const [lastInvitation, setLastInvitation] = useState(null)
  const createModal = useDisclosure()
  const invitationModal = useDisclosure()

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, status: 'loading' }))
    try {
      const res = await listMerchants({
        page,
        pageSize: PAGE_SIZE,
        search: search || undefined,
        status: status || undefined,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      })
      setState({ status: 'ready', items: res.data, meta: res.meta })
    } catch (error) {
      setState({ status: 'error', items: [], meta: null })
      toast.error(error.message)
    }
  }, [page, search, status, toast])

  useEffect(() => {
    // Standard fetch-on-mount/refetch-on-filter-change pattern — see
    // Dashboard/index.jsx's note; no data-fetching library exists here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  function openCreateModal() {
    setFormValues(EMPTY_FORM)
    setFormErrors({})
    createModal.open()
  }

  function validateForm() {
    const errors = {}
    if (!formValues.businessName.trim()) errors.businessName = 'Business name is required'
    if (formValues.ownerEmail && !/^\S+@\S+\.\S+$/.test(formValues.ownerEmail.trim())) {
      errors.ownerEmail = 'Enter a valid email address'
    }
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!validateForm()) return

    setIsSaving(true)
    try {
      const result = await createMerchant({
        merchant: {
          businessName: formValues.businessName.trim(),
          businessType: formValues.businessType,
          contactEmail: formValues.contactEmail.trim() || undefined,
        },
        ownerEmail: formValues.ownerEmail.trim() || undefined,
        ownerDisplayName: undefined,
      })

      load()
      createModal.close()

      if (result.invitation?.token) {
        // ownerEmail was given but that person has no account yet — the
        // backend already generated a real invitation (same as MerchantDetails'
        // own "Invite Owner" flow), so show it the same way that flow does
        // instead of discarding it: without it, the admin has no way to
        // actually get the invited owner into their merchant.
        toast.success('Merchant created and owner invited')
        setLastInvitation(result.invitation)
        invitationModal.open()
      } else {
        toast.success(result.ownerLinked ? 'Merchant created and owner linked' : 'Merchant created')
      }
    } catch (error) {
      toast.error(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const columns = [
    { key: 'businessName', header: 'Business', render: (row) => row.merchant.businessName },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge tone={STAGE_TONE[row.onboardingStage] ?? 'neutral'}>{row.onboardingStage}</Badge>,
    },
    { key: 'branchCount', header: 'Branches' },
    { key: 'deviceCount', header: 'Devices' },
    { key: 'staffCount', header: 'Staff' },
    {
      key: 'createdAt',
      header: 'Created',
      render: (row) => new Date(row.createdAt).toLocaleDateString(),
    },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => navigate(platformMerchantDetailsPath(row.merchant.id))}
        >
          View
        </Button>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Merchant Management"
        description="Onboard, edit, and manage the lifecycle of every merchant on the platform."
        actions={
          <Button type="button" onClick={openCreateModal}>
            <Plus size={16} />
            Create Merchant
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-100/60 dark:bg-neutral-900/60 px-3 py-2 sm:max-w-sm sm:flex-1">
          <Search size={16} className="text-neutral-500" />
          <input
            value={search}
            onChange={(event) => {
              setPage(1)
              setSearch(event.target.value)
            }}
            placeholder="Search merchants…"
            className="w-full bg-transparent text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none"
          />
        </div>
        <Select
          value={status}
          onChange={(event) => {
            setPage(1)
            setStatus(event.target.value)
          }}
          className="sm:w-48"
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </Select>
      </div>

      {state.status === 'error' ? (
        <ErrorState description="We couldn't load merchants." onRetry={load} />
      ) : state.status === 'ready' && state.items.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No merchants yet"
          description="Create your first merchant to get started."
          action={
            <Button type="button" size="sm" onClick={openCreateModal}>
              <Plus size={16} />
              Create Merchant
            </Button>
          }
        />
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

      <Modal isOpen={createModal.isOpen} onClose={createModal.close} title="Create Merchant">
        <form onSubmit={handleSubmit} className="space-y-4">
            <FormField label="Business name" htmlFor="merchant-name" error={formErrors.businessName}>
              <Input
                id="merchant-name"
                value={formValues.businessName}
                onChange={(event) => setFormValues((prev) => ({ ...prev, businessName: event.target.value }))}
                placeholder="Iron Forge Fitness"
              />
            </FormField>
            <FormField label="Business type" htmlFor="merchant-type">
              <Select
                id="merchant-type"
                value={formValues.businessType}
                onChange={(event) => setFormValues((prev) => ({ ...prev, businessType: event.target.value }))}
              >
                {BUSINESS_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Contact email" htmlFor="merchant-contact-email">
              <Input
                id="merchant-contact-email"
                type="email"
                value={formValues.contactEmail}
                onChange={(event) => setFormValues((prev) => ({ ...prev, contactEmail: event.target.value }))}
              />
            </FormField>
            <FormField
              label="Owner email (optional)"
              htmlFor="merchant-owner-email"
              hint="Leave blank to invite an owner later from the merchant's details page."
              error={formErrors.ownerEmail}
            >
              <Input
                id="merchant-owner-email"
                type="email"
                value={formValues.ownerEmail}
                onChange={(event) => setFormValues((prev) => ({ ...prev, ownerEmail: event.target.value }))}
                placeholder="owner@example.com"
              />
            </FormField>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={createModal.close} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Creating…' : 'Create merchant'}
              </Button>
            </div>
        </form>
      </Modal>

      <InvitationSuccessModal
        isOpen={invitationModal.isOpen}
        onClose={invitationModal.close}
        invitation={lastInvitation}
      />
    </>
  )
}
