import { apiFetch } from './client'

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

export function checkIn(shiftId: number, photo: File) {
  const form = new FormData()
  form.append('shift_id', String(shiftId))
  form.append('photo', photo)
  return apiFetch<Attendance>('/api/attendance/checkin', { method: 'POST', body: form })
}

export function checkOut(attendanceId: string, photo: File) {
  const form = new FormData()
  form.append('checkout_photo', photo)
  return apiFetch<Attendance>(`/api/attendance/checkout/${attendanceId}`, {
    method: 'PATCH',
    body: form,
  })
}
