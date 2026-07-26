// Nested under the envelope's `data` -- a paginated endpoint's full response
// is `data.data`. Not every list endpoint uses this (e.g. checklist templates
// return a plain array), so check the specific endpoint before assuming it.
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
