import { useCallback, useEffect, useMemo, useState } from 'react'
import { ThemeContext } from '@/context/ThemeContext'
import { THEME_STORAGE_KEY, applyResolvedTheme, readStoredTheme, resolveTheme, watchSystemTheme } from '@/utils/theme'

/**
 * `theme` is the user's raw preference (light/dark/system); `resolvedTheme`
 * is what's actually applied (system collapses to light or dark). The
 * index.html bootstrap script already applied the correct class before this
 * ever mounts (see THEME_STORAGE_KEY's no-flash comment there) — the
 * initial state here just mirrors that so React and the DOM agree from the
 * first render, it doesn't cause a second visible flip.
 */
export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => readStoredTheme())
  // Only real external state: the OS preference, updated solely by its own
  // change event (see watchSystemTheme below). `resolvedTheme` itself is a
  // pure derivation of theme + systemTheme, computed at render time — never
  // its own useState — so there's nothing to synchronize in an effect.
  const [systemTheme, setSystemTheme] = useState(() => resolveTheme('system'))

  const resolvedTheme = theme === 'system' ? systemTheme : theme

  useEffect(() => {
    applyResolvedTheme(resolvedTheme)
  }, [resolvedTheme])

  useEffect(() => {
    // Always subscribed, not just while "system" is selected — cheap to
    // leave running, and avoids a subscribe/unsubscribe churn on every
    // theme switch; an explicit Light/Dark choice simply ignores
    // `systemTheme` via the ternary above.
    return watchSystemTheme(setSystemTheme)
  }, [])

  const setTheme = useCallback((next) => {
    setThemeState(next)
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next)
    } catch {
      // Storage blocked — the selection still applies for this session,
      // it just won't survive a refresh.
    }
  }, [])

  const value = useMemo(() => ({ theme, resolvedTheme, setTheme }), [theme, resolvedTheme, setTheme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
