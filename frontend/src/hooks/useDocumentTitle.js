import { useEffect } from 'react'

/** Sets document.title for the lifetime of the calling layout — see
 * layouts/MerchantLayout.jsx / PlatformLayout.jsx, each with their own
 * static portal-level title (Part 6: branding). Not a per-page title
 * system — that's a bigger feature this sprint doesn't add. */
export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title
  }, [title])
}
