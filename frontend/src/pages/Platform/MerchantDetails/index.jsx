import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  AlertCircle,
  ArrowLeft,
  Clock,
  Copy,
  ExternalLink,
  Link2,
  Pencil,
  PowerOff,
  Power as PowerIcon,
  RefreshCw,
  Trash2,
  UserPlus,
  XCircle,
} from 'lucide-react'
import PageHeader from '@/components/common/PageHeader'
import ErrorState from '@/components/common/ErrorState'
import EmptyState from '@/components/common/EmptyState'
import InvitationSuccessModal from '@/components/common/InvitationSuccessModal'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Skeleton from '@/components/ui/Skeleton'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import DataTable from '@/components/tables/DataTable'
import FormField from '@/components/forms/FormField'
import Input from '@/components/forms/Input'
import Select from '@/components/forms/Select'
import { useToast } from '@/hooks/useToast'
import { useDisclosure } from '@/hooks/useDisclosure'
import { ROUTES, invitationAcceptanceLink } from '@/constants/routes'
import { ENTITY_SYNC_TONE, ENTITY_SYNC_LABEL, deriveEntitySyncState } from '@/utils/surfboardSyncStatus'
import {
  getMerchantDetails,
  updateMerchant,
  activateMerchant,
  deactivateMerchant,
  deleteMerchant,
  createInvitation,
  listInvitations,
  resendInvitation,
  revokeInvitation,
  getMerchantSyncStatus,
  triggerMerchantSync,
  getMerchantSyncHistory,
  getBranchSyncStatus,
  triggerBranchSync,
  getDeviceSyncStatus,
  triggerDeviceSync,
} from '@/services/platformService'

const INVITATION_STATUS_TONE = { pending: 'brand', accepted: 'success', expired: 'neutral', revoked: 'danger' }
// Backs only the Sync History list's per-entry badges below — the top-level
// summary badges use CONNECTION_STATUS_TONE/APPLICATION_STATUS_TONE instead
// (a raw sync_history status like "skipped" isn't informative on its own,
// which is exactly what those replace).
const SYNC_STATUS_TONE = {
  never_started: 'neutral',
  pending: 'brand',
  running: 'brand',
  completed: 'success',
  failed: 'danger',
  skipped: 'neutral',
}
// Presentation-only relabeling — `skipped` reflects Duplicate Prevention
// (a mapping already existed, so nothing needed to change), which reads to
// an admin as "already up to date," not as something being skipped over.
// No change to the underlying sync_history status values themselves.
const SYNC_STATUS_LABEL = {
  never_started: 'Never Started',
  pending: 'Pending',
  running: 'Running',
  completed: 'Completed',
  failed: 'Failed',
  skipped: 'Already Up-to-date',
}

// Connection Status is deliberately just these three values — distinct
// from `syncStatus` above (which reflects the last *sync attempt's* own
// outcome, e.g. "skipped" because a mapping already existed). "Connected"
// means a provider_link exists at all, regardless of which onboarding
// stage the application is at; "Failed" means the most recent attempt to
// create one failed; "Pending" covers everything before either of those.
const CONNECTION_STATUS_TONE = { connected: 'success', pending: 'brand', failed: 'danger' }
const CONNECTION_STATUS_LABEL = { connected: 'Connected', pending: 'Pending', failed: 'Failed' }

function deriveConnectionStatus(sync) {
  if (!sync) return 'pending'
  if (sync.connected) return 'connected'
  if (sync.syncStatus === 'failed') return 'failed'
  return 'pending'
}

// Surfboard's own KYB application status enum (Check Application Status).
const APPLICATION_STATUS_LABEL = {
  APPLICATION_INITIATED: 'Application Initiated',
  APPLICATION_SUBMITTED: 'Application Submitted',
  APPLICATION_PENDING_INFORMATION: 'Pending Information',
  APPLICATION_SIGNED: 'Application Signed',
  APPLICATION_COMPLETED: 'Application Completed',
  MERCHANT_CREATED: 'Merchant Created',
  APPLICATION_REJECTED: 'Application Rejected',
  APPLICATION_EXPIRED: 'Application Expired',
}
const APPLICATION_STATUS_TONE = {
  APPLICATION_INITIATED: 'neutral',
  APPLICATION_SUBMITTED: 'brand',
  APPLICATION_PENDING_INFORMATION: 'warning',
  APPLICATION_SIGNED: 'brand',
  APPLICATION_COMPLETED: 'brand',
  MERCHANT_CREATED: 'success',
  APPLICATION_REJECTED: 'danger',
  APPLICATION_EXPIRED: 'danger',
}
// A plain-English restatement of applicationStatus for admins who don't
// have Surfboard's own status enum memorized.
const ONBOARDING_STAGE_DESCRIPTION = {
  APPLICATION_INITIATED: 'Waiting for the merchant to complete the hosted KYB form.',
  APPLICATION_SUBMITTED: 'KYB form submitted — awaiting signatory/UBO signatures.',
  APPLICATION_PENDING_INFORMATION: 'Surfboard needs additional information from the merchant.',
  APPLICATION_SIGNED: 'All signatories have signed — awaiting compliance review.',
  APPLICATION_COMPLETED: 'Compliance review passed — merchant account is being provisioned.',
  MERCHANT_CREATED: 'Onboarding complete — merchant and store are live on Surfboard.',
  APPLICATION_REJECTED: 'The application was rejected by Surfboard.',
  APPLICATION_EXPIRED: 'The application expired before completion.',
}

// Phase 3 — Payment Infrastructure. Derived server-side (merchantSync
// .service.js's derivePaymentStatus) — this is just the badge presentation.
const PAYMENT_STATUS_TONE = { active: 'success', incomplete: 'warning', not_configured: 'neutral' }
const PAYMENT_STATUS_LABEL = { active: 'Payments Active', incomplete: 'Payments Incomplete', not_configured: 'Not Configured' }

// Presentation-only — Surfboard's raw payment-method codes, relabeled for
// an admin audience. Falls back to the raw code for anything not listed
// here rather than hiding it.
const PAYMENT_METHOD_LABEL = { CARD: 'Card', CASH: 'Cash', CPOC: 'SoftPOS (CPOC)' }
function formatPaymentMethod(method) {
  return PAYMENT_METHOD_LABEL[method] ?? method
}

// Presentation-only. The one device-registration failure confirmed during
// Phase 2 live sandbox testing is Surfboard's own "TM_0014: Invalid
// registration code" — expected because the sandbox has no real terminal
// hardware to generate a live registration code, not a bug in this
// integration. Shown as a distinct, less alarming label than a generic
// "Failed" so an admin doesn't mistake a known sandbox limitation for a
// real integration problem — the underlying syncStatus/lastError are
// unchanged.
function isSandboxRegistrationLimitation(lastError) {
  return typeof lastError === 'string' && /invalid registration code/i.test(lastError)
}

// Presentation-only. Surfboard's billing plan objects carry a free-text
// `description` (the closest thing to a human title) alongside their
// machine `id` — this composes a readable title when description is
// missing rather than showing raw plan internals.
function getBillingPlanTitle(plan) {
  return (
    plan.description ||
    [formatPaymentMethod(plan.paymentMethod), plan.cardBrand, plan.planType].filter(Boolean).join(' · ') ||
    'Billing Plan'
  )
}

// Keyed by onboardingStage — see MerchantManagement/index.jsx's note.
const STAGE_TONE = { draft: 'neutral', invited: 'warning', active: 'success', suspended: 'danger' }
const STAFF_STATUS_TONE = { active: 'success', removed: 'neutral' }
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

export default function MerchantDetails() {
  const { merchantId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()

  const [state, setState] = useState({ status: 'loading', details: null })
  const [latestInvitation, setLatestInvitation] = useState(null)

  const [formValues, setFormValues] = useState(null)
  const [formErrors, setFormErrors] = useState({})
  const [isSaving, setIsSaving] = useState(false)
  const editModal = useDisclosure()

  const [lifecycleAction, setLifecycleAction] = useState(null) // 'activate' | 'deactivate' | null
  const [isTransitioning, setIsTransitioning] = useState(false)

  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const [inviteValues, setInviteValues] = useState({ email: '', displayName: '' })
  const [inviteErrors, setInviteErrors] = useState({})
  const [isInviting, setIsInviting] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [pendingRevoke, setPendingRevoke] = useState(false)
  const [isRevoking, setIsRevoking] = useState(false)
  const [lastInvitation, setLastInvitation] = useState(null)
  const inviteModal = useDisclosure()
  const invitationModal = useDisclosure()

  const [syncState, setSyncState] = useState({ status: 'loading', sync: null, history: [] })
  const [isSyncing, setIsSyncing] = useState(false)

  // Phase 2 — Store & Device Integration: per-branch/per-device Surfboard
  // sync status, keyed by id. `null` means "fetched but this row has no
  // sync info to show" (or the fetch failed) — distinct from "not yet
  // fetched" (key absent), so a row's badge can render "Pending" instead
  // of a permanent skeleton if its individual status call errors.
  const [branchSyncMap, setBranchSyncMap] = useState({})
  const [deviceSyncMap, setDeviceSyncMap] = useState({})
  const [refreshingBranchId, setRefreshingBranchId] = useState(null)
  const [refreshingDeviceId, setRefreshingDeviceId] = useState(null)

  const loadSyncStatus = useCallback(async () => {
    // Independent of the main merchant load — a failure here (or the
    // framework simply not having synced yet) shouldn't block the rest of
    // Merchant Details from rendering.
    try {
      const [sync, historyRes] = await Promise.all([
        getMerchantSyncStatus(merchantId),
        getMerchantSyncHistory(merchantId, { pageSize: 5 }),
      ])
      setSyncState({ status: 'ready', sync, history: historyRes.data })
    } catch (error) {
      setSyncState({ status: 'error', sync: null, history: [] })
      toast.error(error.message)
    }
  }, [merchantId, toast])

  async function handleManualSync() {
    setIsSyncing(true)
    try {
      const result = await triggerMerchantSync(merchantId)
      if (result.status === 'completed') {
        toast.success('Merchant synced with Surfboard')
      } else if (result.status === 'skipped') {
        toast.info(result.message || 'Sync skipped — already mapped')
      } else {
        toast.error(result.errorMessage || 'Sync failed')
      }
      loadSyncStatus()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setIsSyncing(false)
    }
  }

  // Surfboard's own hosted KYB form — opened directly in a new tab, never
  // embedded (Surfboard's onboarding pages commonly block iframe embedding
  // as clickjacking protection on a KYC form, which silently breaks the
  // flow with no error — a plain new-tab open has no such restriction).
  function handleCompleteKyb() {
    window.open(syncState.sync.webKybUrl, '_blank', 'noopener,noreferrer')
  }

  // Independent of the main merchant load, same reasoning as
  // loadSyncStatus() above — a per-row status fetch failing shouldn't
  // block the rest of the page, and one branch's/device's failure
  // shouldn't hide another's (Promise.allSettled, not Promise.all).
  const loadEntitySyncStatuses = useCallback(async (branchList, deviceList) => {
    const [branchResults, deviceResults] = await Promise.all([
      Promise.allSettled(branchList.map((branch) => getBranchSyncStatus(branch.id))),
      Promise.allSettled(deviceList.map((device) => getDeviceSyncStatus(device.id))),
    ])

    setBranchSyncMap(
      Object.fromEntries(
        branchList.map((branch, index) => [
          branch.id,
          branchResults[index].status === 'fulfilled' ? branchResults[index].value : null,
        ]),
      ),
    )
    setDeviceSyncMap(
      Object.fromEntries(
        deviceList.map((device, index) => [
          device.id,
          deviceResults[index].status === 'fulfilled' ? deviceResults[index].value : null,
        ]),
      ),
    )
  }, [])

  const load = useCallback(async () => {
    setState({ status: 'loading', details: null })
    try {
      const [details, invitations] = await Promise.all([
        getMerchantDetails(merchantId),
        // The most recent invitation for this merchant, whatever its
        // status — the Owner Invitation card (below) always reflects the
        // latest one, same as the standalone Invitations page would show
        // for this merchant filtered down to one row.
        listInvitations({ merchantId, pageSize: 1, sortBy: 'createdAt', sortOrder: 'desc' }),
      ])
      setState({ status: 'ready', details })
      setLatestInvitation(invitations.data[0] ?? null)
      loadEntitySyncStatuses(details.branches, details.devices)
    } catch (error) {
      setState({ status: 'error', details: null })
      toast.error(error.message)
    }
  }, [merchantId, toast, loadEntitySyncStatuses])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
    loadSyncStatus()
  }, [load, loadSyncStatus])

  async function handleRefreshBranchSync(branchId) {
    setRefreshingBranchId(branchId)
    try {
      const result = await triggerBranchSync(branchId)
      if (result.status === 'completed') {
        toast.success('Branch synced with Surfboard')
      } else if (result.status === 'skipped') {
        toast.info(result.message || 'Sync skipped — already mapped')
      } else {
        toast.error(result.errorMessage || 'Sync failed')
      }
      const status = await getBranchSyncStatus(branchId)
      setBranchSyncMap((prev) => ({ ...prev, [branchId]: status }))
    } catch (error) {
      toast.error(error.message)
    } finally {
      setRefreshingBranchId(null)
    }
  }

  async function handleRefreshDeviceSync(deviceId) {
    setRefreshingDeviceId(deviceId)
    try {
      const result = await triggerDeviceSync(deviceId)
      if (result.status === 'completed') {
        toast.success('Device synced with Surfboard')
      } else if (result.status === 'skipped') {
        toast.info(result.message || 'Sync skipped — already mapped')
      } else {
        toast.error(result.errorMessage || 'Sync failed')
      }
      const status = await getDeviceSyncStatus(deviceId)
      setDeviceSyncMap((prev) => ({ ...prev, [deviceId]: status }))
    } catch (error) {
      toast.error(error.message)
    } finally {
      setRefreshingDeviceId(null)
    }
  }

  function openEditModal() {
    const merchant = state.details.merchant
    setFormValues({
      businessName: merchant.businessName,
      legalName: merchant.legalName ?? '',
      businessType: merchant.businessType,
      contactEmail: merchant.contactEmail ?? '',
      contactPhone: merchant.contactPhone ?? '',
      address: merchant.address ?? '',
      timezone: merchant.timezone ?? '',
      currency: merchant.currency,
      country: merchant.country ?? '',
    })
    setFormErrors({})
    editModal.open()
  }

  function validateEditForm() {
    const errors = {}
    if (!formValues.businessName.trim()) errors.businessName = 'Business name is required'
    if (formValues.contactEmail && !/^\S+@\S+\.\S+$/.test(formValues.contactEmail.trim())) {
      errors.contactEmail = 'Enter a valid email address'
    }
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleEditSubmit(event) {
    event.preventDefault()
    if (!validateEditForm()) return

    setIsSaving(true)
    try {
      await updateMerchant(merchantId, {
        businessName: formValues.businessName.trim(),
        legalName: formValues.legalName.trim() || undefined,
        businessType: formValues.businessType,
        contactEmail: formValues.contactEmail.trim() || undefined,
        contactPhone: formValues.contactPhone.trim() || undefined,
        address: formValues.address.trim() || undefined,
        timezone: formValues.timezone.trim() || undefined,
        currency: formValues.currency.trim().toUpperCase(),
        country: formValues.country.trim() || undefined,
      })
      toast.success('Merchant updated')
      editModal.close()
      load()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleLifecycleConfirm() {
    setIsTransitioning(true)
    try {
      if (lifecycleAction === 'activate') {
        await activateMerchant(merchantId)
        toast.success('Merchant activated')
      } else {
        await deactivateMerchant(merchantId)
        toast.success('Merchant deactivated')
      }
      setLifecycleAction(null)
      load()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setIsTransitioning(false)
    }
  }

  async function handleDeleteConfirm() {
    setIsDeleting(true)
    try {
      await deleteMerchant(merchantId)
      toast.success('Merchant deleted')
      setIsDeleteOpen(false)
      navigate(ROUTES.PLATFORM_MERCHANTS)
    } catch (error) {
      // Dialog stays open on failure (e.g. 409 — merchant still has
      // branches/devices/active memberships/pending onboarding) so the
      // admin sees the specific reason and can cancel or fix it first,
      // same pattern as handleLifecycleConfirm above.
      toast.error(error.message)
    } finally {
      setIsDeleting(false)
    }
  }

  function openInviteModal() {
    setInviteValues({ email: '', displayName: '' })
    setInviteErrors({})
    inviteModal.open()
  }

  function validateInviteForm() {
    const errors = {}
    if (!/^\S+@\S+\.\S+$/.test(inviteValues.email.trim())) errors.email = 'Enter a valid email address'
    setInviteErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleInviteSubmit(event) {
    event.preventDefault()
    if (!validateInviteForm()) return

    setIsInviting(true)
    try {
      const invitation = await createInvitation({
        merchantId,
        email: inviteValues.email.trim(),
        displayName: inviteValues.displayName.trim() || undefined,
        role: 'merchant-owner',
      })
      toast.success('Owner invitation created')
      inviteModal.close()
      load()
      setLastInvitation(invitation)
      invitationModal.open()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setIsInviting(false)
    }
  }

  async function handleResendInvitation() {
    setIsResending(true)
    try {
      const resent = await resendInvitation(latestInvitation.id)
      toast.success('Invitation resent')
      load()
      setLastInvitation(resent)
      invitationModal.open()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setIsResending(false)
    }
  }

  async function handleRevokeInvitation() {
    setIsRevoking(true)
    try {
      await revokeInvitation(latestInvitation.id)
      toast.success('Invitation revoked')
      setPendingRevoke(false)
      load()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setIsRevoking(false)
    }
  }

  function copyToClipboard(value, label) {
    navigator.clipboard?.writeText(value)
    toast.info(`${label} copied to clipboard`)
  }

  if (state.status === 'error') {
    return (
      <>
        <PageHeader title="Merchant Details" />
        <ErrorState description="We couldn't load this merchant." onRetry={load} />
      </>
    )
  }

  if (state.status === 'loading') {
    return (
      <>
        <PageHeader title="Merchant Details" />
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

  const { merchant, onboardingStage, branches, devices, membershipPlans, merchantStaff } = state.details
  const acceptedOwner = merchantStaff.find((entry) => entry.status === 'active' && entry.roleName === 'merchant-owner')
  const hasOwner = Boolean(acceptedOwner)
  // Only true immediately after this session created/resent this exact
  // invitation — the plaintext token is never persisted (see
  // invitationToken.js), so a previously-created invitation fetched via
  // listInvitations() never carries one, by design.
  const hasFreshToken = Boolean(lastInvitation) && lastInvitation.id === latestInvitation?.id

  const staffColumns = [
    { key: 'displayName', header: 'Name', render: (row) => row.displayName || '—' },
    { key: 'email', header: 'Email' },
    { key: 'roleName', header: 'Role' },
    { key: 'status', header: 'Status', render: (row) => <Badge tone={STAFF_STATUS_TONE[row.status] ?? 'neutral'}>{row.status}</Badge> },
  ]

  // Phase 2 — Store & Device Integration: renders a Surfboard id (copyable)
  // or an em dash, and a Latest Error cell — reused identically by both
  // the branches and devices tables below.
  function renderSurfboardId(id, label) {
    if (!id) return '—'
    return (
      <span className="flex items-center gap-1.5">
        <span className="truncate">{id}</span>
        <button
          type="button"
          onClick={() => copyToClipboard(id, label)}
          className="shrink-0 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
          title={`Copy ${label}`}
        >
          <Copy size={13} />
        </button>
      </span>
    )
  }

  function renderLatestError(sync) {
    if (!sync?.lastError) return '—'
    return (
      <span className="block max-w-[220px] truncate text-xs text-red-600 dark:text-red-400" title={sync.lastError}>
        {sync.lastError}
      </span>
    )
  }

  const branchColumns = [
    { key: 'name', header: 'Name' },
    { key: 'city', header: 'City', render: (row) => row.city || '—' },
    {
      key: 'syncStatus',
      header: 'Sync Status',
      render: (row) => {
        const state = deriveEntitySyncState(branchSyncMap[row.id])
        return <Badge tone={ENTITY_SYNC_TONE[state]}>{ENTITY_SYNC_LABEL[state]}</Badge>
      },
    },
    {
      key: 'surfboardStoreId',
      header: 'Surfboard Store ID',
      render: (row) => renderSurfboardId(branchSyncMap[row.id]?.surfboardStoreId, 'Store ID'),
    },
    { key: 'lastError', header: 'Latest Error', render: (row) => renderLatestError(branchSyncMap[row.id]) },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => handleRefreshBranchSync(row.id)}
          disabled={refreshingBranchId === row.id}
        >
          <RefreshCw size={13} className={refreshingBranchId === row.id ? 'animate-spin' : ''} />
          Refresh Sync
        </Button>
      ),
    },
  ]

  const deviceColumns = [
    { key: 'label', header: 'Name' },
    {
      key: 'branch',
      header: 'Branch',
      render: (row) => branches.find((branch) => branch.id === row.branchId)?.name || '—',
    },
    {
      key: 'syncStatus',
      header: 'Sync Status',
      render: (row) => {
        const sync = deviceSyncMap[row.id]
        const state = deriveEntitySyncState(sync)
        if (state === 'failed' && isSandboxRegistrationLimitation(sync?.lastError)) {
          return <Badge tone="warning">Registration Pending (Sandbox limitation)</Badge>
        }
        return <Badge tone={ENTITY_SYNC_TONE[state]}>{ENTITY_SYNC_LABEL[state]}</Badge>
      },
    },
    {
      key: 'surfboardTerminalId',
      header: 'Surfboard Terminal ID',
      render: (row) => renderSurfboardId(deviceSyncMap[row.id]?.surfboardTerminalId, 'Terminal ID'),
    },
    {
      key: 'capabilities',
      header: 'Capabilities',
      // Phase 3 — Payment Infrastructure. Already fetched by deviceSync's
      // getStatus() (Fetch Terminal by ID) — no new backend call, just
      // presenting what's already in deviceSyncMap.
      render: (row) => {
        const sync = deviceSyncMap[row.id]
        if (!sync?.terminalType && !sync?.terminalPaymentMethods?.length) return '—'
        return (
          <div className="flex flex-wrap items-center gap-1.5">
            {sync.terminalType && <Badge tone="neutral">{sync.terminalType}</Badge>}
            {sync.terminalPaymentMethods?.map((method) => (
              <Badge key={method} tone="brand">
                {formatPaymentMethod(method)}
              </Badge>
            ))}
          </div>
        )
      },
    },
    { key: 'lastError', header: 'Latest Error', render: (row) => renderLatestError(deviceSyncMap[row.id]) },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => handleRefreshDeviceSync(row.id)}
          disabled={refreshingDeviceId === row.id}
        >
          <RefreshCw size={13} className={refreshingDeviceId === row.id ? 'animate-spin' : ''} />
          Refresh Sync
        </Button>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title={merchant.businessName}
        description="Full merchant profile, staff roster, and lifecycle controls."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => navigate(ROUTES.PLATFORM_MERCHANTS)}>
              <ArrowLeft size={16} />
              Back
            </Button>
            <Button type="button" variant="secondary" onClick={openEditModal}>
              <Pencil size={16} />
              Edit
            </Button>
            {merchant.status === 'active' ? (
              <Button type="button" variant="danger" onClick={() => setLifecycleAction('deactivate')}>
                <PowerOff size={16} />
                Deactivate
              </Button>
            ) : (
              <Button type="button" onClick={() => setLifecycleAction('activate')}>
                <PowerIcon size={16} />
                Activate
              </Button>
            )}
            <Button type="button" variant="danger" onClick={() => setIsDeleteOpen(true)}>
              <Trash2 size={16} />
              Delete
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Merchant profile</h2>
            <Badge tone={STAGE_TONE[onboardingStage] ?? 'neutral'}>{onboardingStage}</Badge>
          </div>
          <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-neutral-500">Legal name</dt>
              <dd className="text-neutral-800 dark:text-neutral-200">{merchant.legalName || '—'}</dd>
            </div>
            <div>
              <dt className="text-neutral-500">Business type</dt>
              <dd className="text-neutral-800 dark:text-neutral-200">{merchant.businessType}</dd>
            </div>
            <div>
              <dt className="text-neutral-500">Contact email</dt>
              <dd className="text-neutral-800 dark:text-neutral-200">{merchant.contactEmail || '—'}</dd>
            </div>
            <div>
              <dt className="text-neutral-500">Contact phone</dt>
              <dd className="text-neutral-800 dark:text-neutral-200">{merchant.contactPhone || '—'}</dd>
            </div>
            <div>
              <dt className="text-neutral-500">Address</dt>
              <dd className="text-neutral-800 dark:text-neutral-200">{merchant.address || '—'}</dd>
            </div>
            <div>
              <dt className="text-neutral-500">Timezone</dt>
              <dd className="text-neutral-800 dark:text-neutral-200">{merchant.timezone || '—'}</dd>
            </div>
            <div>
              <dt className="text-neutral-500">Currency</dt>
              <dd className="text-neutral-800 dark:text-neutral-200">{merchant.currency}</dd>
            </div>
            <div>
              <dt className="text-neutral-500">Country</dt>
              <dd className="text-neutral-800 dark:text-neutral-200">{merchant.country || '—'}</dd>
            </div>
            <div>
              <dt className="text-neutral-500">Created</dt>
              <dd className="text-neutral-800 dark:text-neutral-200">{new Date(merchant.createdAt).toLocaleDateString()}</dd>
            </div>
          </dl>
        </Card>

        <Card>
          <h2 className="mb-4 text-sm font-semibold text-neutral-900 dark:text-neutral-100">At a glance</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-neutral-500">Branches</dt>
              <dd className="text-neutral-800 dark:text-neutral-200">{branches.length}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-neutral-500">Devices</dt>
              <dd className="text-neutral-800 dark:text-neutral-200">{devices.length}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-neutral-500">Membership plans</dt>
              <dd className="text-neutral-800 dark:text-neutral-200">{membershipPlans.length}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-neutral-500">Active staff</dt>
              <dd className="text-neutral-800 dark:text-neutral-200">{merchantStaff.filter((entry) => entry.status === 'active').length}</dd>
            </div>
          </dl>
        </Card>
      </div>

      <div className="mt-6">
        <h2 className="mb-4 text-sm font-semibold text-neutral-900 dark:text-neutral-100">Owner Invitation</h2>

        {!latestInvitation ? (
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-neutral-500">This merchant has no owner invitation yet.</p>
              <Button type="button" size="sm" onClick={openInviteModal}>
                <UserPlus size={16} />
                Invite Owner
              </Button>
            </div>
          </Card>
        ) : (
          <Card>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <dl className="grid flex-1 grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-neutral-500">Email</dt>
                  <dd className="text-neutral-800 dark:text-neutral-200">{latestInvitation.email}</dd>
                </div>
                <div>
                  <dt className="text-neutral-500">Status</dt>
                  <dd>
                    <Badge tone={INVITATION_STATUS_TONE[latestInvitation.status] ?? 'neutral'}>
                      {latestInvitation.status}
                    </Badge>
                  </dd>
                </div>
                {latestInvitation.status === 'accepted' ? (
                  <>
                    <div>
                      <dt className="text-neutral-500">Accepted On</dt>
                      <dd className="text-neutral-800 dark:text-neutral-200">
                        {latestInvitation.acceptedAt ? new Date(latestInvitation.acceptedAt).toLocaleDateString() : '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-neutral-500">Owner Name</dt>
                      <dd className="text-neutral-800 dark:text-neutral-200">{acceptedOwner?.displayName || '—'}</dd>
                    </div>
                  </>
                ) : (
                  <div>
                    <dt className="text-neutral-500">Expires</dt>
                    <dd className="text-neutral-800 dark:text-neutral-200">
                      {new Date(latestInvitation.expiresAt).toLocaleDateString()}
                    </dd>
                  </div>
                )}
              </dl>

              <div className="flex shrink-0 flex-wrap justify-end gap-2">
                {hasFreshToken && (
                  <>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => copyToClipboard(invitationAcceptanceLink(lastInvitation.token), 'Link')}
                    >
                      <Copy size={14} />
                      Copy Invitation Link
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => copyToClipboard(lastInvitation.token, 'Token')}
                    >
                      <Copy size={14} />
                      Copy Token
                    </Button>
                  </>
                )}
                {(latestInvitation.status === 'pending' || latestInvitation.status === 'expired') && (
                  <>
                    <Button type="button" variant="secondary" size="sm" onClick={handleResendInvitation} disabled={isResending}>
                      <RefreshCw size={14} className={isResending ? 'animate-spin' : ''} />
                      Resend Invitation
                    </Button>
                    <Button type="button" variant="danger" size="sm" onClick={() => setPendingRevoke(true)}>
                      <XCircle size={14} />
                      Revoke Invitation
                    </Button>
                  </>
                )}
                {latestInvitation.status === 'revoked' && !hasOwner && (
                  <Button type="button" size="sm" onClick={openInviteModal}>
                    <UserPlus size={16} />
                    Invite Owner
                  </Button>
                )}
              </div>
            </div>
          </Card>
        )}
      </div>

      <div className="mt-6">
        <h2 className="mb-4 text-sm font-semibold text-neutral-900 dark:text-neutral-100">Surfboard Integration</h2>

        {syncState.status === 'loading' ? (
          <Card>
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </Card>
        ) : syncState.status === 'error' ? (
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-neutral-500">We couldn't load Surfboard sync status.</p>
              <Button type="button" variant="secondary" size="sm" onClick={loadSyncStatus}>
                Try again
              </Button>
            </div>
          </Card>
        ) : (
          <Card>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={CONNECTION_STATUS_TONE[deriveConnectionStatus(syncState.sync)]}>
                  {CONNECTION_STATUS_LABEL[deriveConnectionStatus(syncState.sync)]}
                </Badge>
                {syncState.sync.applicationStatus && (
                  <Badge tone={APPLICATION_STATUS_TONE[syncState.sync.applicationStatus] ?? 'neutral'}>
                    {APPLICATION_STATUS_LABEL[syncState.sync.applicationStatus] ?? syncState.sync.applicationStatus}
                  </Badge>
                )}
                {syncState.sync.paymentStatus && (
                  <Badge tone={PAYMENT_STATUS_TONE[syncState.sync.paymentStatus] ?? 'neutral'}>
                    {PAYMENT_STATUS_LABEL[syncState.sync.paymentStatus] ?? syncState.sync.paymentStatus}
                  </Badge>
                )}
              </div>

              <div className="flex shrink-0 flex-wrap justify-end gap-2">
                {syncState.sync.webKybUrl && !syncState.sync.surfboardMerchantId && (
                  <Button type="button" variant="secondary" size="sm" onClick={handleCompleteKyb}>
                    <ExternalLink size={14} />
                    Complete KYB
                  </Button>
                )}
                <Button type="button" variant="secondary" size="sm" onClick={handleManualSync} disabled={isSyncing}>
                  <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
                  {isSyncing ? 'Syncing…' : syncState.sync.connected ? 'Refresh Surfboard Status' : 'Manual Sync'}
                </Button>
              </div>
            </div>

            <dl className="mt-4 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <dt className="text-neutral-500">Application ID</dt>
                <dd className="flex items-center gap-1.5 text-neutral-800 dark:text-neutral-200">
                  {renderSurfboardId(syncState.sync.externalId, 'Application ID')}
                </dd>
              </div>
              <div>
                <dt className="text-neutral-500">Provider</dt>
                <dd className="flex items-center gap-1.5 text-neutral-800 dark:text-neutral-200">
                  <Link2 size={13} className="text-neutral-500" />
                  {syncState.sync.provider}
                </dd>
              </div>
              <div>
                <dt className="text-neutral-500">Last Sync</dt>
                <dd className="flex items-center gap-1.5 text-neutral-800 dark:text-neutral-200">
                  <Clock size={13} className="text-neutral-500" />
                  {syncState.sync.lastSyncAt ? new Date(syncState.sync.lastSyncAt).toLocaleString() : 'Never'}
                </dd>
              </div>
              <div>
                <dt className="text-neutral-500">Surfboard Merchant ID</dt>
                <dd className="flex items-center gap-1.5 text-neutral-800 dark:text-neutral-200">
                  {renderSurfboardId(syncState.sync.surfboardMerchantId, 'Merchant ID')}
                </dd>
              </div>
              <div>
                <dt className="text-neutral-500">Surfboard Store ID</dt>
                <dd className="flex items-center gap-1.5 text-neutral-800 dark:text-neutral-200">
                  {renderSurfboardId(syncState.sync.surfboardStoreId, 'Store ID')}
                </dd>
              </div>
              <div>
                <dt className="text-neutral-500">Billing Plan</dt>
                <dd className="text-neutral-800 dark:text-neutral-200">
                  {syncState.sync.billingPlans?.length ? (
                    syncState.sync.billingPlans.map((plan) => (
                      <div key={plan.id} className="truncate">
                        {getBillingPlanTitle(plan)}{' '}
                        <span className="text-xs text-neutral-400">({plan.id})</span>
                      </div>
                    ))
                  ) : (
                    '—'
                  )}
                </dd>
              </div>
            </dl>

            {/* Phase 3 — Payment Infrastructure. `enabledPaymentMethods` (the
                dedicated List Payment Methods result) is preferred once
                available; falls back to the KYB-flow `paymentMethods`
                byproduct (which also carries per-method `status`) so a
                merchant that's only ever had the KYB refresh still shows
                something real, not a blank section. */}
            {(syncState.sync.enabledPaymentMethods?.length > 0 || syncState.sync.paymentMethods?.length > 0) && (
              <div className="mt-4">
                <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Enabled Payment Methods</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {syncState.sync.enabledPaymentMethods?.length > 0
                    ? syncState.sync.enabledPaymentMethods.map((method) => (
                        <Badge key={method.paymentMethodId ?? method.paymentMethod} tone="success">
                          {formatPaymentMethod(method.paymentMethod)}
                        </Badge>
                      ))
                    : syncState.sync.paymentMethods.map((method) => (
                        <Badge key={method.paymentMethod} tone={method.status === 'ACTIVATED' ? 'success' : 'neutral'}>
                          {formatPaymentMethod(method.paymentMethod)} · {method.status}
                        </Badge>
                      ))}
                </div>
              </div>
            )}

            {syncState.sync.paymentMethods?.find((method) => method.paymentMethod === 'CARD')?.enabledSchemes?.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Supported Card Schemes</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {syncState.sync.paymentMethods
                    .find((method) => method.paymentMethod === 'CARD')
                    .enabledSchemes.map((scheme) => (
                      <Badge key={scheme} tone="brand">
                        {scheme}
                      </Badge>
                    ))}
                </div>
              </div>
            )}

            <div className="mt-5 border-t border-neutral-200 pt-4 dark:border-neutral-800">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">Recent Payment Events</p>
              {syncState.sync.settlementReports?.length > 0 ? (
                <ul className="space-y-2">
                  {syncState.sync.settlementReports.map((report) => (
                    <li
                      key={report.payoutId}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-neutral-50 px-3 py-2 text-xs dark:bg-neutral-900/40"
                    >
                      <span className="text-neutral-600 dark:text-neutral-300">
                        {report.reportType} · {report.transactionStartDate} – {report.transactionEndDate}
                      </span>
                      <span className="flex items-center gap-3 text-neutral-500">
                        <span>Payout {report.payout}</span>
                        {report.url && (
                          <a
                            href={report.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
                          >
                            View report
                          </a>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-neutral-500">
                  No settlement reports available yet. Reports appear after completed and settled payments.
                </p>
              )}
            </div>

            <p className="mt-4 text-xs text-neutral-500">
              {syncState.sync.connected
                ? (ONBOARDING_STAGE_DESCRIPTION[syncState.sync.applicationStatus] ??
                  'Not yet checked — click "Refresh Surfboard Status" to fetch the current onboarding stage.')
                : 'Onboarding has not started for this merchant yet.'}
            </p>

            {syncState.sync.lastError && (
              <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-500/10 px-3 py-2.5 text-sm text-red-700 dark:border-red-900/40 dark:text-red-300">
                <AlertCircle size={15} className="mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">Latest Error</p>
                  <p className="mt-0.5 text-xs">{syncState.sync.lastError}</p>
                </div>
              </div>
            )}

            {syncState.history.length > 0 && (
              <div className="mt-5 border-t border-neutral-200 pt-4 dark:border-neutral-800">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">Sync History</p>
                <ul className="space-y-2">
                  {syncState.history.map((entry) => (
                    <li
                      key={entry.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-neutral-50 px-3 py-2 text-xs dark:bg-neutral-900/40"
                    >
                      <div className="flex items-center gap-2">
                        <Badge tone={SYNC_STATUS_TONE[entry.status] ?? 'neutral'}>
                          {SYNC_STATUS_LABEL[entry.status] ?? entry.status}
                        </Badge>
                        <span className="text-neutral-500">
                          {entry.triggeredBy === 'manual' ? 'Manual' : 'Automatic'} ·{' '}
                          {new Date(entry.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-neutral-500">
                        {entry.durationMs != null && <span>{entry.durationMs}ms</span>}
                        {entry.errorMessage && <span className="max-w-xs truncate text-red-600 dark:text-red-400">{entry.errorMessage}</span>}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        )}
      </div>

      <div className="mt-6">
        <h2 className="mb-4 text-sm font-semibold text-neutral-900 dark:text-neutral-100">Branches</h2>

        {branches.length === 0 ? (
          <EmptyState compact title="No branches yet" description="This merchant has no branches to sync with Surfboard." />
        ) : (
          <DataTable columns={branchColumns} rows={branches} />
        )}
      </div>

      <div className="mt-6">
        <h2 className="mb-4 text-sm font-semibold text-neutral-900 dark:text-neutral-100">Devices</h2>

        {devices.length === 0 ? (
          <EmptyState compact title="No devices yet" description="This merchant has no payment terminals to sync with Surfboard." />
        ) : (
          <DataTable columns={deviceColumns} rows={devices} />
        )}
      </div>

      <div className="mt-6">
        <h2 className="mb-4 text-sm font-semibold text-neutral-900 dark:text-neutral-100">Staff roster</h2>

        {merchantStaff.length === 0 ? (
          <EmptyState compact title="No staff yet" description="Invite this merchant's first owner to get started." />
        ) : (
          <DataTable columns={staffColumns} rows={merchantStaff} />
        )}
      </div>

      <Modal isOpen={editModal.isOpen} onClose={editModal.close} title="Edit Merchant">
        {formValues && (
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <FormField label="Business name" htmlFor="edit-name" error={formErrors.businessName}>
              <Input
                id="edit-name"
                value={formValues.businessName}
                onChange={(event) => setFormValues((prev) => ({ ...prev, businessName: event.target.value }))}
              />
            </FormField>
            <FormField label="Legal name" htmlFor="edit-legal-name">
              <Input
                id="edit-legal-name"
                value={formValues.legalName}
                onChange={(event) => setFormValues((prev) => ({ ...prev, legalName: event.target.value }))}
              />
            </FormField>
            <FormField label="Business type" htmlFor="edit-type">
              <Select
                id="edit-type"
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Contact email" htmlFor="edit-email" error={formErrors.contactEmail}>
                <Input
                  id="edit-email"
                  type="email"
                  value={formValues.contactEmail}
                  onChange={(event) => setFormValues((prev) => ({ ...prev, contactEmail: event.target.value }))}
                />
              </FormField>
              <FormField label="Contact phone" htmlFor="edit-phone">
                <Input
                  id="edit-phone"
                  value={formValues.contactPhone}
                  onChange={(event) => setFormValues((prev) => ({ ...prev, contactPhone: event.target.value }))}
                />
              </FormField>
            </div>
            <FormField label="Address" htmlFor="edit-address">
              <Input
                id="edit-address"
                value={formValues.address}
                onChange={(event) => setFormValues((prev) => ({ ...prev, address: event.target.value }))}
              />
            </FormField>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <FormField label="Timezone" htmlFor="edit-timezone">
                <Input
                  id="edit-timezone"
                  value={formValues.timezone}
                  onChange={(event) => setFormValues((prev) => ({ ...prev, timezone: event.target.value }))}
                />
              </FormField>
              <FormField label="Currency" htmlFor="edit-currency">
                <Input
                  id="edit-currency"
                  value={formValues.currency}
                  maxLength={3}
                  onChange={(event) => setFormValues((prev) => ({ ...prev, currency: event.target.value.toUpperCase() }))}
                />
              </FormField>
              <FormField label="Country" htmlFor="edit-country">
                <Input
                  id="edit-country"
                  value={formValues.country}
                  onChange={(event) => setFormValues((prev) => ({ ...prev, country: event.target.value }))}
                />
              </FormField>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={editModal.close} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal isOpen={inviteModal.isOpen} onClose={inviteModal.close} title="Invite Merchant Owner">
        <form onSubmit={handleInviteSubmit} className="space-y-4">
          <FormField label="Email" htmlFor="invite-owner-email" error={inviteErrors.email}>
            <Input
              id="invite-owner-email"
              type="email"
              value={inviteValues.email}
              onChange={(event) => setInviteValues((prev) => ({ ...prev, email: event.target.value }))}
              placeholder="owner@example.com"
            />
          </FormField>
          <FormField label="Display name" htmlFor="invite-owner-name">
            <Input
              id="invite-owner-name"
              value={inviteValues.displayName}
              onChange={(event) => setInviteValues((prev) => ({ ...prev, displayName: event.target.value }))}
            />
          </FormField>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={inviteModal.close} disabled={isInviting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isInviting}>
              {isInviting ? 'Sending…' : 'Send invitation'}
            </Button>
          </div>
        </form>
      </Modal>

      <InvitationSuccessModal
        isOpen={invitationModal.isOpen}
        onClose={invitationModal.close}
        invitation={lastInvitation}
      />

      <ConfirmDialog
        isOpen={Boolean(lifecycleAction)}
        onClose={() => setLifecycleAction(null)}
        onConfirm={handleLifecycleConfirm}
        title={lifecycleAction === 'activate' ? 'Activate merchant?' : 'Deactivate merchant?'}
        description={
          lifecycleAction === 'activate'
            ? `"${merchant.businessName}" will regain full access to the platform.`
            : `"${merchant.businessName}" will lose access until reactivated.`
        }
        confirmLabel={lifecycleAction === 'activate' ? 'Activate' : 'Deactivate'}
        tone={lifecycleAction === 'activate' ? 'primary' : 'danger'}
        isLoading={isTransitioning}
      />

      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete merchant?"
        description={`"${merchant.businessName}" will be soft-deleted (hidden from the merchant list, recoverable via direct database access) and only if it has no branches, devices, active memberships, or pending Surfboard onboarding — any of those will block this with an error.`}
        confirmLabel="Delete"
        tone="danger"
        isLoading={isDeleting}
      />

      <ConfirmDialog
        isOpen={pendingRevoke}
        onClose={() => setPendingRevoke(false)}
        onConfirm={handleRevokeInvitation}
        title="Revoke invitation?"
        description={`The invitation for "${latestInvitation?.email}" will no longer be acceptable.`}
        confirmLabel="Revoke"
        isLoading={isRevoking}
      />
    </>
  )
}
