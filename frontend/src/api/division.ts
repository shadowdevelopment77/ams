import { apiFetch } from './client'
import { paginationQuery, type PaginatedResult, type PaginationParams } from './pagination'

export interface Division {
  id: number
  company_id: number
  name: string
  late_tolerance_minutes: number
  is_active: boolean
}

// Mirrors backend/src/modules/division/division.validation.ts.
export interface DivisionInput {
  company_id: number
  name: string
  late_tolerance_minutes?: number
}

export function getDivisionsByCompany(companyId: number, params?: PaginationParams) {
  return apiFetch<PaginatedResult<Division>>(
    `/api/divisions/company/${companyId}${paginationQuery(params)}`
  )
}

export function getDivision(id: number) {
  return apiFetch<Division>(`/api/divisions/${id}`)
}

export function createDivision(input: DivisionInput) {
  return apiFetch<Division>('/api/divisions', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function updateDivision(
  id: number,
  input: Partial<Omit<DivisionInput, 'company_id'>> & { is_active?: boolean }
) {
  return apiFetch<Division>(`/api/divisions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  })
}

export function deleteDivision(id: number) {
  return apiFetch<Division>(`/api/divisions/${id}`, { method: 'DELETE' })
}
