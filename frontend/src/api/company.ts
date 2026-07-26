import { apiFetch } from './client'
import { paginationQuery, type PaginatedResult, type PaginationParams } from './pagination'

export interface Company {
  id: number
  name: string
  code: string
  address: string | null
  phone: string | null
  email: string | null
  logo_url: string | null
  is_active: boolean
}

// Mirrors backend/src/modules/company/company.validation.ts. `code` is
// auto-generated server-side from `name` when omitted (an alias like "PT
// Sanjaya Abadi" -> "PTSA"), so it's never sent from this form.
export interface CompanyInput {
  name: string
  address?: string
  phone?: string
  email?: string
  logo_url?: string
}

export function getCompanies(params?: PaginationParams) {
  return apiFetch<PaginatedResult<Company>>(`/api/company${paginationQuery(params)}`)
}

export function getCompany(id: number) {
  return apiFetch<Company>(`/api/company/${id}`)
}

export function createCompany(input: CompanyInput) {
  return apiFetch<Company>('/api/company', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function updateCompany(id: number, input: Partial<CompanyInput> & { is_active?: boolean }) {
  return apiFetch<Company>(`/api/company/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  })
}

export function deleteCompany(id: number) {
  return apiFetch<Company>(`/api/company/${id}`, { method: 'DELETE' })
}
