const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 100

/**
 * Normalizes `?page=&pageSize=` query params into a safe { page, pageSize,
 * offset } shape. Repositories will use `offset`/`pageSize` once real queries
 * exist; for now this just gives every module a shared, consistent contract.
 */
export function parsePagination(query = {}) {
  const page = Math.max(DEFAULT_PAGE, Number.parseInt(query.page, 10) || DEFAULT_PAGE)
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number.parseInt(query.pageSize, 10) || DEFAULT_PAGE_SIZE))

  return {
    page,
    pageSize,
    offset: (page - 1) * pageSize,
  }
}

export function buildPaginationMeta({ page, pageSize, total }) {
  return {
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  }
}
