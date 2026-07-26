import { apiFetch } from './client'
import type { PaginatedResult, PaginationParams } from './pagination'

export interface Attendance {
  id: string
  user_id: string
  company_id: number
  division_id: number
  shift_id: number
  date: string
  check_in_at: string
  check_out_at: string | null
  photo_url: string
  checkout_photo_url: string | null
  is_late: boolean
  late_minutes: number
  early_leave: boolean
  early_leave_reason: string | null
  status_id: number
}

export function getTodayAttendance() {
  return apiFetch<Attendance | null>('/api/attendance/today')
}

// Joins shift/status (see attendance.repository.ts's findHistoryByUser) --
// no `user` field, unlike AdminAttendanceRecord below, since the caller is
// always looking at their own history.
export interface MyAttendanceRecord extends Attendance {
  shift: { id: number; name: string; start_time: string; end_time: string }
  status: { id: number; name: string }
}

export function getMyAttendanceHistory(params?: PaginationParams) {
  const search = new URLSearchParams()
  if (params?.page) search.set('page', String(params.page))
  if (params?.limit) search.set('limit', String(params.limit))
  const qs = search.toString()
  return apiFetch<PaginatedResult<MyAttendanceRecord>>(`/api/attendance/history${qs ? `?${qs}` : ''}`)
}

export function checkIn(shiftId: number, photo: File, latitude: number, longitude: number) {
  const form = new FormData()
  form.append('shift_id', String(shiftId))
  form.append('latitude', String(latitude))
  form.append('longitude', String(longitude))
  form.append('photo', photo)
  return apiFetch<Attendance>('/api/attendance/checkin', { method: 'POST', body: form })
}

export function checkOut(attendanceId: string, photo: File, latitude: number, longitude: number) {
  const form = new FormData()
  form.append('checkout_latitude', String(latitude))
  form.append('checkout_longitude', String(longitude))
  form.append('checkout_photo', photo)
  return apiFetch<Attendance>(`/api/attendance/checkout/${attendanceId}`, {
    method: 'PATCH',
    body: form,
  })
}

// ─── Admin: attendance records ─────────────────────────────────────────────

// Wider than STAFF's own Attendance record -- getByDate/getLate join
// user/shift/status (see backend/src/modules/attendance/attendance.service.ts).
export interface AdminAttendanceRecord extends Attendance {
  user: { id: string; name: string; email: string }
  shift: { id: number; name: string; start_time: string; end_time: string }
  status: { id: number; name: string }
}

export interface AttendanceQuery extends PaginationParams {
  companyId: number
  divisionId: number
  date?: string
}

function attendanceQuery(params: AttendanceQuery): string {
  const search = new URLSearchParams()
  search.set('companyId', String(params.companyId))
  search.set('divisionId', String(params.divisionId))
  if (params.date) search.set('date', params.date)
  if (params.page) search.set('page', String(params.page))
  if (params.limit) search.set('limit', String(params.limit))
  return `?${search.toString()}`
}

export function getAttendanceByDate(params: AttendanceQuery) {
  return apiFetch<PaginatedResult<AdminAttendanceRecord>>(`/api/attendance${attendanceQuery(params)}`)
}

export function getLateAttendance(params: AttendanceQuery) {
  return apiFetch<PaginatedResult<AdminAttendanceRecord>>(`/api/attendance/late${attendanceQuery(params)}`)
}

export interface AttendancePhotoRecord {
  user: { id: string; name: string }
  checkin_photo: string
  checkin_at: string
  checkin_address: string | null
  checkout_photo: string | null
  checkout_at: string | null
  checkout_address: string | null
}

export function getAttendancePhotos(params: AttendanceQuery) {
  return apiFetch<PaginatedResult<AttendancePhotoRecord>>(
    `/api/attendance/attendance-photos${attendanceQuery(params)}`
  )
}
