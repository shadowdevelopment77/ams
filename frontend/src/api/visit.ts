import { apiFetch } from './client'
import { paginationQuery, type PaginatedResult, type PaginationParams } from './pagination'

export interface VisitLog {
  id: number
  user_id: string
  company_id: number
  user: { id: string; name: string }
  company: { id: number; name: string }
  date: string
  photo_url: string
  latitude: number | null
  longitude: number | null
  location_address: string | null
  notes: string | null
  visited_at: string
}

// GET /api/visit joins user/company (name only) via a custom findAll
// override on the repository -- see visit-log.repository.ts.
export function getVisitLogs(params?: PaginationParams) {
  return apiFetch<PaginatedResult<VisitLog>>(`/api/visit${paginationQuery(params)}`)
}

export function deleteVisitLog(id: number) {
  return apiFetch<VisitLog>(`/api/visit/${id}`, { method: 'DELETE' })
}

export interface VisitPhotoRecord {
  company: { id: number; name: string }
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
