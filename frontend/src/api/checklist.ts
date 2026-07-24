import { apiFetch } from './client'

export interface ChecklistItem {
  id: number
  template_id: number
  order_no: number
  description: string
  requires_photo: boolean
}

export interface ChecklistPhoto {
  id: number
  submission_id: number
  photo_url: string
  order: number
}

export interface ChecklistSubmission {
  id: number
  attendance_id: string
  item_id: number
  is_submitted: boolean
  submitted_at: string | null
  item: ChecklistItem
  photos: ChecklistPhoto[]
}

export function getMyChecklist() {
  return apiFetch<ChecklistSubmission[]>('/api/checklist/my-checklist')
}

export function uploadChecklistPhoto(attendanceId: string, itemId: number, photo: File) {
  const form = new FormData()
  form.append('photo', photo)
  return apiFetch<ChecklistPhoto>(`/api/checklist/${attendanceId}/items/${itemId}/photo`, {
    method: 'POST',
    body: form,
  })
}

export function submitChecklist(attendanceId: string) {
  return apiFetch<null>(`/api/checklist/${attendanceId}/submit`, { method: 'POST' })
}
