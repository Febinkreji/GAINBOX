import { useCallback, useEffect, useState } from 'react'
import PageHeader from '@/components/common/PageHeader'
import ErrorState from '@/components/common/ErrorState'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import FormField from '@/components/forms/FormField'
import Input from '@/components/forms/Input'
import Select from '@/components/forms/Select'
import Skeleton from '@/components/ui/Skeleton'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { getMerchantProfile, updateMerchantProfile } from '@/services/merchantService'

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

const STATUS_TONE = { active: 'success', pending: 'warning', suspended: 'danger' }

export default function MerchantProfile() {
  const { roles } = useAuth()
  const toast = useToast()
  const canEdit = roles.includes('merchant-owner')

  const [state, setState] = useState({ status: 'loading', profile: null })
  const [formValues, setFormValues] = useState(null)
  const [formErrors, setFormErrors] = useState({})
  const [isSaving, setIsSaving] = useState(false)

  const load = useCallback(async () => {
    setState({ status: 'loading', profile: null })
    try {
      const profile = await getMerchantProfile()
      setState({ status: 'ready', profile })
      setFormValues({
        businessName: profile.businessName,
        legalName: profile.legalName ?? '',
        businessType: profile.businessType,
        contactEmail: profile.contactEmail ?? '',
        contactPhone: profile.contactPhone ?? '',
        address: profile.address ?? '',
        timezone: profile.timezone ?? '',
        currency: profile.currency,
        country: profile.country ?? '',
        corporateId: profile.corporateId ?? '',
      })
    } catch (error) {
      setState({ status: 'error', profile: null })
      toast.error(error.message)
    }
  }, [toast])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  function validateForm() {
    const errors = {}
    if (!formValues.businessName.trim()) errors.businessName = 'Business name is required'
    if (formValues.contactEmail && !/^\S+@\S+\.\S+$/.test(formValues.contactEmail.trim())) {
      errors.contactEmail = 'Enter a valid email address'
    }
    if (formValues.currency && formValues.currency.trim().length !== 3) {
      errors.currency = 'Use a 3-letter currency code, e.g. INR'
    }
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!validateForm()) return

    setIsSaving(true)
    try {
      const updated = await updateMerchantProfile({
        businessName: formValues.businessName.trim(),
        legalName: formValues.legalName.trim() || undefined,
        businessType: formValues.businessType,
        contactEmail: formValues.contactEmail.trim() || undefined,
        contactPhone: formValues.contactPhone.trim() || undefined,
        address: formValues.address.trim() || undefined,
        timezone: formValues.timezone.trim() || undefined,
        currency: formValues.currency.trim().toUpperCase(),
        country: formValues.country.trim() || undefined,
        corporateId: formValues.corporateId.trim() || undefined,
      })
      setState({ status: 'ready', profile: updated })
      toast.success('Merchant profile updated')
    } catch (error) {
      toast.error(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  if (state.status === 'error') {
    return (
      <>
        <PageHeader title="Merchant Profile" description="Manage your business identity, contact details, and branding." />
        <ErrorState description="We couldn't load your merchant profile." onRetry={load} />
      </>
    )
  }

  const isLoading = state.status === 'loading'

  return (
    <>
      <PageHeader
        title="Merchant Profile"
        description="Manage your business identity, contact details, and branding."
        actions={
          !isLoading && <Badge tone={STATUS_TONE[state.profile.status] ?? 'neutral'}>{state.profile.status}</Badge>
        }
      />

      <Card>
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Business name" htmlFor="profile-name" error={formErrors.businessName}>
                <Input
                  id="profile-name"
                  value={formValues.businessName}
                  onChange={(event) => setFormValues((prev) => ({ ...prev, businessName: event.target.value }))}
                  disabled={!canEdit}
                />
              </FormField>
              <FormField label="Legal name" htmlFor="profile-legal-name">
                <Input
                  id="profile-legal-name"
                  value={formValues.legalName}
                  onChange={(event) => setFormValues((prev) => ({ ...prev, legalName: event.target.value }))}
                  disabled={!canEdit}
                />
              </FormField>
            </div>

            <FormField label="Business type" htmlFor="profile-type">
              <Select
                id="profile-type"
                value={formValues.businessType}
                onChange={(event) => setFormValues((prev) => ({ ...prev, businessType: event.target.value }))}
                disabled={!canEdit}
              >
                {BUSINESS_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </Select>
            </FormField>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Contact email" htmlFor="profile-email" error={formErrors.contactEmail}>
                <Input
                  id="profile-email"
                  type="email"
                  value={formValues.contactEmail}
                  onChange={(event) => setFormValues((prev) => ({ ...prev, contactEmail: event.target.value }))}
                  disabled={!canEdit}
                />
              </FormField>
              <FormField label="Contact phone" htmlFor="profile-phone">
                <Input
                  id="profile-phone"
                  value={formValues.contactPhone}
                  onChange={(event) => setFormValues((prev) => ({ ...prev, contactPhone: event.target.value }))}
                  disabled={!canEdit}
                />
              </FormField>
            </div>

            <FormField label="Address" htmlFor="profile-address">
              <Input
                id="profile-address"
                value={formValues.address}
                onChange={(event) => setFormValues((prev) => ({ ...prev, address: event.target.value }))}
                disabled={!canEdit}
              />
            </FormField>

            <FormField
              label="Corporate ID"
              htmlFor="profile-corporate-id"
              hint="Business registration number, required to enable Surfboard payments"
            >
              <Input
                id="profile-corporate-id"
                value={formValues.corporateId}
                onChange={(event) => setFormValues((prev) => ({ ...prev, corporateId: event.target.value }))}
                disabled={!canEdit}
              />
            </FormField>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <FormField label="Timezone" htmlFor="profile-timezone" hint="e.g. Asia/Kolkata">
                <Input
                  id="profile-timezone"
                  value={formValues.timezone}
                  onChange={(event) => setFormValues((prev) => ({ ...prev, timezone: event.target.value }))}
                  disabled={!canEdit}
                />
              </FormField>
              <FormField label="Currency" htmlFor="profile-currency" error={formErrors.currency}>
                <Input
                  id="profile-currency"
                  value={formValues.currency}
                  maxLength={3}
                  onChange={(event) => setFormValues((prev) => ({ ...prev, currency: event.target.value.toUpperCase() }))}
                  disabled={!canEdit}
                />
              </FormField>
              <FormField label="Country" htmlFor="profile-country">
                <Input
                  id="profile-country"
                  value={formValues.country}
                  onChange={(event) => setFormValues((prev) => ({ ...prev, country: event.target.value }))}
                  disabled={!canEdit}
                />
              </FormField>
            </div>

            {canEdit && (
              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? 'Saving…' : 'Save changes'}
                </Button>
              </div>
            )}
          </form>
        )}
      </Card>
    </>
  )
}
