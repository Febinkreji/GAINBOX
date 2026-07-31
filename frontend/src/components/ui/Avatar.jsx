function getInitials(name) {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export default function Avatar({ name, size = 36 }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full bg-brand-500/15 font-semibold text-brand-700 dark:bg-brand-500/20 dark:text-brand-300"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {getInitials(name)}
    </span>
  )
}
