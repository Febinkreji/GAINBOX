import PortalLayout from '@/layouts/PortalLayout'
import PlatformSidebar from '@/components/layout/PlatformSidebar'
import PlatformBreadcrumbs from '@/components/layout/PlatformBreadcrumbs'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

export default function PlatformLayout() {
  useDocumentTitle('GainBox — Platform Portal')

  return (
    <PortalLayout
      sidebar={<PlatformSidebar />}
      searchPlaceholder="Search merchants, users…"
      breadcrumbs={<PlatformBreadcrumbs />}
    />
  )
}
