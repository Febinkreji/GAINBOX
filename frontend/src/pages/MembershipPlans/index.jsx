import { useCallback, useEffect, useState } from 'react'
import { Plus, Ticket, XCircle } from 'lucide-react'
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
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { useDisclosure } from '@/hooks/useDisclosure'
import {
  listMembershipPlans,
  createMembershipPlan,
  updateMembershipPlan,
  deleteMembershipPlan,
  listSubscriptions,
  createSubscription,
  cancelSubscription,
} from '@/services/membershipService'

const PLAN_STATUS_TONE = { active: 'success', archived: 'neutral' }
const SUBSCRIPTION_STATUS_TONE = { active: 'success', cancelled: 'neutral', expired: 'danger' }
const BILLING_CYCLES = ['one-time', 'monthly', 'quarterly', 'yearly']
const PAGE_SIZE = 10

function PlansTab({ canWrite }) {
  const { merchant } = useAuth()
  const toast = useToast()
  const [state, setState] = useState({ status: 'loading', items: [], meta: null })
  const [page, setPage] = useState(1)

  const [formValues, setFormValues] = useState({ name: '', description: '', price: '', currency: 'INR', billingCycle: 'monthly' })
  const [formErrors, setFormErrors] = useState({})
  const [editingPlan, setEditingPlan] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const formModal = useDisclosure()
  const [pendingDelete, setPendingDelete] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, status: 'loading' }))
    try {
      const res = await listMembershipPlans({
        merchantId: merchant.merchantId,
        page,
        pageSize: PAGE_SIZE,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      })
      setState({ status: 'ready', items: res.data, meta: res.meta })
    } catch (error) {
      setState({ status: 'error', items: [], meta: null })
      toast.error(error.message)
    }
  }, [merchant.merchantId, page, toast])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  function openCreateModal() {
    setEditingPlan(null)
    setFormValues({ name: '', description: '', price: '', currency: 'INR', billingCycle: 'monthly' })
    setFormErrors({})
    formModal.open()
  }

  function openEditModal(plan) {
    setEditingPlan(plan)
    setFormValues({
      name: plan.name,
      description: plan.description ?? '',
      price: plan.price,
      currency: plan.currency,
      billingCycle: plan.billingCycle,
      status: plan.status,
    })
    setFormErrors({})
    formModal.open()
  }

  function validateForm() {
    const errors = {}
    if (!formValues.name.trim()) errors.name = 'Plan name is required'
    if (!formValues.price || Number(formValues.price) < 0) errors.price = 'Enter a valid price'
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!validateForm()) return

    setIsSaving(true)
    try {
      if (editingPlan) {
        await updateMembershipPlan(editingPlan.id, {
          name: formValues.name.trim(),
          description: formValues.description.trim() || undefined,
          price: Number(formValues.price),
          currency: formValues.currency,
          billingCycle: formValues.billingCycle,
          status: formValues.status,
        })
        toast.success('Plan updated')
      } else {
        await createMembershipPlan({
          merchantId: merchant.merchantId,
          name: formValues.name.trim(),
          description: formValues.description.trim() || undefined,
          price: Number(formValues.price),
          currency: formValues.currency,
          billingCycle: formValues.billingCycle,
        })
        toast.success('Plan created')
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
      await deleteMembershipPlan(pendingDelete.id)
      toast.success('Plan deleted')
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
    { key: 'price', header: 'Price', render: (row) => `${row.currency} ${row.price}` },
    { key: 'billingCycle', header: 'Billing' },
    { key: 'status', header: 'Status', render: (row) => <Badge tone={PLAN_STATUS_TONE[row.status]}>{row.status}</Badge> },
    ...(canWrite
      ? [
          {
            key: 'actions',
            header: '',
            render: (row) => (
              <div className="flex items-center justify-end gap-2">
                <button type="button" onClick={() => openEditModal(row)} className="text-sm text-brand-400 hover:text-brand-300">
                  Edit
                </button>
                <button type="button" onClick={() => setPendingDelete(row)} className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300">
                  Delete
                </button>
              </div>
            ),
          },
        ]
      : []),
  ]

  return (
    <>
      {canWrite && (
        <div className="mb-4 flex justify-end">
          <Button type="button" onClick={openCreateModal}>
            <Plus size={16} />
            Create Plan
          </Button>
        </div>
      )}

      {state.status === 'error' ? (
        <ErrorState description="We couldn't load your membership plans." onRetry={load} />
      ) : state.status === 'ready' && state.items.length === 0 ? (
        <EmptyState
          icon={Ticket}
          title="No membership plans created yet"
          description="Build your first package to start offering memberships."
          action={
            canWrite && (
              <Button type="button" size="sm" onClick={openCreateModal}>
                <Plus size={16} />
                Create Plan
              </Button>
            )
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
                <Button type="button" variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((prev) => prev - 1)}>
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

      <Modal isOpen={formModal.isOpen} onClose={formModal.close} title={editingPlan ? 'Edit Plan' : 'Create Plan'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Plan name" htmlFor="plan-name" error={formErrors.name}>
            <Input
              id="plan-name"
              value={formValues.name}
              onChange={(event) => setFormValues((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Muscle Gain Package"
            />
          </FormField>
          <FormField label="Description" htmlFor="plan-description">
            <Input
              id="plan-description"
              value={formValues.description}
              onChange={(event) => setFormValues((prev) => ({ ...prev, description: event.target.value }))}
            />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Price" htmlFor="plan-price" error={formErrors.price}>
              <Input
                id="plan-price"
                type="number"
                min="0"
                step="0.01"
                value={formValues.price}
                onChange={(event) => setFormValues((prev) => ({ ...prev, price: event.target.value }))}
              />
            </FormField>
            <FormField label="Currency" htmlFor="plan-currency">
              <Input
                id="plan-currency"
                value={formValues.currency}
                onChange={(event) => setFormValues((prev) => ({ ...prev, currency: event.target.value.toUpperCase() }))}
                maxLength={3}
              />
            </FormField>
          </div>
          <FormField label="Billing cycle" htmlFor="plan-billing">
            <Select
              id="plan-billing"
              value={formValues.billingCycle}
              onChange={(event) => setFormValues((prev) => ({ ...prev, billingCycle: event.target.value }))}
            >
              {BILLING_CYCLES.map((cycle) => (
                <option key={cycle} value={cycle}>
                  {cycle}
                </option>
              ))}
            </Select>
          </FormField>
          {editingPlan && (
            <FormField label="Status" htmlFor="plan-status">
              <Select
                id="plan-status"
                value={formValues.status}
                onChange={(event) => setFormValues((prev) => ({ ...prev, status: event.target.value }))}
              >
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </Select>
            </FormField>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={formModal.close} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Saving…' : editingPlan ? 'Save changes' : 'Create plan'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={handleDelete}
        title="Delete plan?"
        description={`"${pendingDelete?.name}" will be soft-deleted.`}
        confirmLabel="Delete"
        isLoading={isDeleting}
      />
    </>
  )
}

function SubscriptionsTab({ canWrite }) {
  const toast = useToast()
  const [state, setState] = useState({ status: 'loading', items: [], meta: null })
  const [plans, setPlans] = useState([])
  const [page, setPage] = useState(1)
  const { merchant } = useAuth()

  const [formValues, setFormValues] = useState({ membershipPlanId: '', customerId: '' })
  const [formErrors, setFormErrors] = useState({})
  const [isSaving, setIsSaving] = useState(false)
  const createModal = useDisclosure()
  const [pendingCancel, setPendingCancel] = useState(null)
  const [isCancelling, setIsCancelling] = useState(false)

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, status: 'loading' }))
    try {
      const [subscriptionsRes, plansRes] = await Promise.all([
        listSubscriptions({ page, pageSize: PAGE_SIZE, sortBy: 'createdAt', sortOrder: 'desc' }),
        listMembershipPlans({ merchantId: merchant.merchantId, pageSize: 100, status: 'active' }),
      ])
      setState({ status: 'ready', items: subscriptionsRes.data, meta: subscriptionsRes.meta })
      setPlans(plansRes.data)
    } catch (error) {
      setState({ status: 'error', items: [], meta: null })
      toast.error(error.message)
    }
  }, [merchant.merchantId, page, toast])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  const planNameById = Object.fromEntries(plans.map((plan) => [plan.id, plan.name]))

  function openCreateModal() {
    setFormValues({ membershipPlanId: plans[0]?.id ?? '', customerId: '' })
    setFormErrors({})
    createModal.open()
  }

  function validateForm() {
    const errors = {}
    if (!formValues.membershipPlanId) errors.membershipPlanId = 'Select a plan'
    if (!/^[0-9a-f-]{36}$/i.test(formValues.customerId.trim())) errors.customerId = 'Enter a valid customer id (UUID)'
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!validateForm()) return

    setIsSaving(true)
    try {
      await createSubscription({ membershipPlanId: formValues.membershipPlanId, customerId: formValues.customerId.trim() })
      toast.success('Subscription created')
      createModal.close()
      load()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleCancel() {
    setIsCancelling(true)
    try {
      await cancelSubscription(pendingCancel.id)
      toast.success('Subscription cancelled')
      setPendingCancel(null)
      load()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setIsCancelling(false)
    }
  }

  const columns = [
    { key: 'plan', header: 'Plan', render: (row) => planNameById[row.membershipPlanId] ?? row.membershipPlanId },
    { key: 'customerId', header: 'Customer' },
    { key: 'status', header: 'Status', render: (row) => <Badge tone={SUBSCRIPTION_STATUS_TONE[row.status]}>{row.status}</Badge> },
    {
      key: 'startedAt',
      header: 'Started',
      render: (row) => new Date(row.startedAt).toLocaleDateString(),
    },
    ...(canWrite
      ? [
          {
            key: 'actions',
            header: '',
            render: (row) =>
              row.status === 'active' && (
                <button
                  type="button"
                  onClick={() => setPendingCancel(row)}
                  className="flex items-center gap-1 text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                >
                  <XCircle size={14} />
                  Cancel
                </button>
              ),
          },
        ]
      : []),
  ]

  return (
    <>
      {canWrite && (
        <div className="mb-4 flex justify-end">
          <Button type="button" onClick={openCreateModal} disabled={plans.length === 0}>
            <Plus size={16} />
            New Subscription
          </Button>
        </div>
      )}

      {state.status === 'error' ? (
        <ErrorState description="We couldn't load subscriptions." onRetry={load} />
      ) : state.status === 'ready' && state.items.length === 0 ? (
        <EmptyState
          icon={Ticket}
          compact
          title="No subscriptions yet"
          description="Subscriptions created for your membership plans will appear here."
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
                <Button type="button" variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((prev) => prev - 1)}>
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

      <Modal isOpen={createModal.isOpen} onClose={createModal.close} title="New Subscription">
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Membership plan" htmlFor="sub-plan" error={formErrors.membershipPlanId}>
            <Select
              id="sub-plan"
              value={formValues.membershipPlanId}
              onChange={(event) => setFormValues((prev) => ({ ...prev, membershipPlanId: event.target.value }))}
            >
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField
            label="Customer ID"
            htmlFor="sub-customer"
            error={formErrors.customerId}
            hint="No customer directory exists yet — paste the customer's user id."
          >
            <Input
              id="sub-customer"
              value={formValues.customerId}
              onChange={(event) => setFormValues((prev) => ({ ...prev, customerId: event.target.value }))}
              placeholder="00000000-0000-0000-0000-000000000000"
            />
          </FormField>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={createModal.close} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Saving…' : 'Create subscription'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(pendingCancel)}
        onClose={() => setPendingCancel(null)}
        onConfirm={handleCancel}
        title="Cancel subscription?"
        description="This subscription will be marked cancelled immediately."
        confirmLabel="Cancel subscription"
        isLoading={isCancelling}
      />
    </>
  )
}

export default function MembershipPlans() {
  const { roles } = useAuth()
  const canWrite = roles.includes('merchant-owner') || roles.includes('merchant-staff')
  const [tab, setTab] = useState('plans')

  return (
    <>
      <PageHeader title="Membership Plans" description="Configure the fitness and wellness packages you offer customers." />

      <div className="mb-6 inline-flex rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-100/60 dark:bg-neutral-900/60 p-1">
        {[
          { key: 'plans', label: 'Plans' },
          { key: 'subscriptions', label: 'Subscriptions' },
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

      {tab === 'plans' ? <PlansTab canWrite={canWrite} /> : <SubscriptionsTab canWrite={canWrite} />}
    </>
  )
}
