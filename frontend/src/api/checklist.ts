import { apiFetch } from './client'
import { paginationQuery, type PaginatedResult, type PaginationParams } from './pagination'

export interface ChecklistTemplate {
  id: number
  company_id: number
  division_id: number
  title: string
  is_active: boolean
}

// Mirrors backend/src/modules/checklist/checklist.validation.ts's
// createTemplateSchema.
export interface ChecklistTemplateInput {
  company_id: number
  division_id: number
  title: string
}

export interface ChecklistItem {
  id: number
  template_id: number
  order_no: number
  description: string
  requires_photo: boolean
  is_active: boolean
}

// Mirrors createItemSchema.
export interface ChecklistItemInput {
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

// Backed by GET /api/checklist/photos/by-division and by-user/:userId --
// both join company/division/item/submitter context in one shot.
export interface ChecklistPhotoRecord {
  id: number
  submitted_at: string | null
  item: { id: number; description: string }
  company: { id: number; name: string }
  division: { id: number; name: string }
  user: { id: string; name: string }
  location_address: string | null
  photos: ChecklistPhoto[]
}

export function getChecklistPhotosByDivision(
  companyId: number,
  divisionId: number,
  date?: string,
  params?: PaginationParams
) {
  const search = new URLSearchParams()
  search.set('companyId', String(companyId))
  search.set('divisionId', String(divisionId))
  if (date) search.set('date', date)
  if (params?.page) search.set('page', String(params.page))
  if (params?.limit) search.set('limit', String(params.limit))
  return apiFetch<PaginatedResult<ChecklistPhotoRecord>>(
    `/api/checklist/photos/by-division?${search.toString()}`
  )
}

export function getChecklistPhotosByUser(userId: string, date?: string, params?: PaginationParams) {
  const search = new URLSearchParams()
  if (date) search.set('date', date)
  if (params?.page) search.set('page', String(params.page))
  if (params?.limit) search.set('limit', String(params.limit))
  return apiFetch<PaginatedResult<ChecklistPhotoRecord>>(
    `/api/checklist/photos/by-user/${userId}?${search.toString()}`
  )
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

// ─── Admin: templates ───────────────────────────────────────────────────────

// Not paginated -- findByDivision returns a plain array, unlike most other
// admin list endpoints (confirmed against checklist.service.ts).
export function getTemplates(companyId: number, divisionId: number) {
  return apiFetch<ChecklistTemplate[]>(
    `/api/checklist/templates?companyId=${companyId}&divisionId=${divisionId}`
  )
}

export function createTemplate(input: ChecklistTemplateInput) {
  return apiFetch<ChecklistTemplate>('/api/checklist/templates', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function updateTemplate(id: number, input: { title?: string; is_active?: boolean }) {
  return apiFetch<ChecklistTemplate>(`/api/checklist/templates/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  })
}

export function deleteTemplate(id: number) {
  return apiFetch<ChecklistTemplate>(`/api/checklist/templates/${id}`, { method: 'DELETE' })
}

// ─── Admin: items ───────────────────────────────────────────────────────────

export function getItemsByTemplate(templateId: number, params?: PaginationParams) {
  return apiFetch<PaginatedResult<ChecklistItem>>(
    `/api/checklist/items/template/${templateId}${paginationQuery(params)}`
  )
}

export function createItem(input: ChecklistItemInput) {
  return apiFetch<ChecklistItem>('/api/checklist/items', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function updateItem(
  id: number,
  input: { description?: string; order_no?: number; is_active?: boolean }
) {
  return apiFetch<ChecklistItem>(`/api/checklist/items/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  })
}

export function deleteItem(id: number) {
  return apiFetch<ChecklistItem>(`/api/checklist/items/${id}`, { method: 'DELETE' })
}
