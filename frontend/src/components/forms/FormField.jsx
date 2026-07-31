export default function FormField({ label, htmlFor, hint, error, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={htmlFor} className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
          {label}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      ) : (
        hint && <p className="text-xs text-neutral-500">{hint}</p>
      )}
    </div>
  )
}
