export default function DataTable({ columns, rows, emptyMessage = 'No records yet.' }) {
  if (!rows.length) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-6 py-16 text-center text-sm text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900/20">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
      <table className="min-w-full divide-y divide-neutral-200 text-left text-sm dark:divide-neutral-800">
        <thead className="bg-neutral-100/60 dark:bg-neutral-900/60">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className="whitespace-nowrap px-4 py-3 font-medium text-neutral-500 dark:text-neutral-400">
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-900">
          {rows.map((row, index) => (
            <tr key={row.id ?? index} className="hover:bg-neutral-100/40 dark:hover:bg-neutral-900/40">
              {columns.map((column) => (
                <td key={column.key} className="whitespace-nowrap px-4 py-3 text-neutral-800 dark:text-neutral-200">
                  {column.render ? column.render(row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
