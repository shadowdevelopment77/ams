// Mirrors backend/src/repositories/interfaces/base.interface.ts's
// PaginatedResult<T>, nested under the envelope's `data` (so a paginated
// endpoint's full response is `data.data`). NOT every list endpoint uses
// this -- GET /api/checklist/templates returns a plain array instead, so
// don't assume this shape without checking the specific endpoint first.
export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface PaginationParams {
  page?: number
  limit?: number
}

export function paginationQuery(params?: PaginationParams): string {
  if (!params) return ''
  const search = new URLSearchParams()
  if (params.page) search.set('page', String(params.page))
  if (params.limit) search.set('limit', String(params.limit))
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}
