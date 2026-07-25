import { apiFetch } from './client'
import { paginationQuery, type PaginatedResult, type PaginationParams } from './pagination'

export interface VisitLog {
  id: number
  user_id: string
  company_id: number
  date: string
  photo_url: string
  latitude: number | null
  longitude: number | null
  location_address: string | null
  notes: string | null
  visited_at: string
}

// GET /api/visit returns raw rows with no user/company join (findAll, the
// plain base repository method -- no custom query for this one). Names
// aren't available without a separate lookup, so the UI shows IDs.
export function getVisitLogs(params?: PaginationParams) {
  return apiFetch<PaginatedResult<VisitLog>>(`/api/visit${paginationQuery(params)}`)
}

export function deleteVisitLog(id: number) {
  return apiFetch<VisitLog>(`/api/visit/${id}`, { method: 'DELETE' })
}

export interface VisitPhotoRecord {
  company_id: number
  visit_photo: string
  visited_at: string
  notes: string | null
}

// Unlike GET /api/visit, this one's `date` query param genuinely works
// (findByUser filters on it server-side).
export function getVisitPhotosByUser(userId: string, date?: string, params?: PaginationParams) {
  const search = new URLSearchParams()
  if (date) search.set('date', date)
  if (params?.page) search.set('page', String(params.page))
  if (params?.limit) search.set('limit', String(params.limit))
  const qs = search.toString()
  return apiFetch<PaginatedResult<VisitPhotoRecord>>(`/api/visit/user/${userId}/photos${qs ? `?${qs}` : ''}`)
}
