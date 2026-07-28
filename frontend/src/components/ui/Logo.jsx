import lockupLight from '@/assets/branding/gainbox-lockup-light.svg'
import lockupDark from '@/assets/branding/gainbox-lockup-dark.svg'
import markViolet from '@/assets/branding/gainbox-mark-violet.svg'

// "light"/"dark" describe the LOCKUP's own ink, matched to the background
// it's placed on: lockup-light (light ink) goes on dark backgrounds,
// lockup-dark (dark ink) goes on light backgrounds. The `theme` prop below
// names it after the background instead, since that's what call sites know.
const LOCKUP_SRC = {
  dark: lockupLight,
  light: lockupDark,
}

/**
 * Official GainBox brand mark.
 *
 * - variant="lockup" — mark + wordmark, for navigation/headers. Pick `theme`
 *   to match the background it sits on ("dark" background -> light lockup).
 * - variant="mark" — icon-only, for compact contexts (collapsed sidebar,
 *   favicons, loading states, small avatars).
 */
export default function Logo({ variant = 'lockup', theme = 'dark', alt = 'GainBox', className }) {
  const src = variant === 'mark' ? markViolet : LOCKUP_SRC[theme]

  return <img src={src} alt={alt} className={className} draggable={false} />
}
