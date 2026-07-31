export const THEME_STORAGE_KEY = 'gainbox-theme'
export const THEMES = ['light', 'dark', 'system']

const DARK_MEDIA_QUERY = '(prefers-color-scheme: dark)'

/**
 * The single source of truth for "what does this preference actually look
 * like right now" — shared by the no-flash bootstrap script in index.html
 * (which can't import this module, since it must run before any script tag
 * loads) and ThemeProvider. Keep the two in sync by hand if this logic ever
 * changes; everything else in the app goes through ThemeProvider/useTheme,
 * never re-deriving this itself.
 */
export function resolveTheme(theme) {
  if (theme === 'system') {
    return window.matchMedia(DARK_MEDIA_QUERY).matches ? 'dark' : 'light'
  }
  return theme
}

export function readStoredTheme() {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    return THEMES.includes(stored) ? stored : 'system'
  } catch {
    // Storage blocked (private browsing, disabled cookies) — fall back to
    // "system" rather than throwing; theme selection just won't persist.
    return 'system'
  }
}

export function applyResolvedTheme(resolved) {
  document.documentElement.classList.toggle('dark', resolved === 'dark')
}

export function watchSystemTheme(onChange) {
  const media = window.matchMedia(DARK_MEDIA_QUERY)
  const listener = (event) => onChange(event.matches ? 'dark' : 'light')
  media.addEventListener('change', listener)
  return () => media.removeEventListener('change', listener)
}
