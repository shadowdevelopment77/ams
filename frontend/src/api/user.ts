import { apiFetch } from './client'
import { paginationQuery, type PaginatedResult, type PaginationParams } from './pagination'
import type { Role } from './auth'

export interface User {
  id: string
  name: string
  email: string
  phone: string | null
  is_active: boolean
}

// Mirrors backend/src/modules/auth/auth.validation.ts's registerSchema --
// company_id/division_id only apply to (and are required for) STAFF.
export interface RegisterUserInput {
  name: string
  email: string
  password: string
  phone?: string
  role: Role
  company_id?: number
  division_id?: number
}

export interface UserCompanyRoleWithUser {
  id: number
  user_id: string
  company_id: number | null
  division_id: number | null
  user: {
    id: string
    name: string
    email: string
    phone: string | null
    is_active: boolean
  }
  userRole: {
    id: number
    name: Role
  }
}

export function getUsers(params?: PaginationParams) {
  return apiFetch<PaginatedResult<User>>(`/api/users${paginationQuery(params)}`)
}

// Only ever returns STAFF -- ADMIN/SUPERVISOR are never assigned a
// company/division (enforced by registerSchema's cross-field rule).
export function getUsersByCompanyDivision(
  companyId: number,
  divisionId: number,
  params?: PaginationParams
) {
  return apiFetch<PaginatedResult<UserCompanyRoleWithUser>>(
    `/api/users/company/${companyId}/division/${divisionId}${paginationQuery(params)}`
  )
}

export function registerUser(input: RegisterUserInput) {
  return apiFetch<{ id: string; name: string; email: string }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function updateUser(id: string, input: { name?: string; email?: string; phone?: string }) {
  return apiFetch<User>(`/api/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  })
}

// STAFF-only on the backend -- moving an ADMIN/SUPERVISOR isn't supported
// (see the Phase 5 plan's noted backend gap).
export function moveUserCompany(id: string, companyId: number, divisionId: number) {
  return apiFetch<unknown>(`/api/users/${id}/move-company`, {
    method: 'PUT',
    body: JSON.stringify({ company_id: companyId, division_id: divisionId }),
  })
}

export function deleteUser(id: string) {
  return apiFetch<User>(`/api/users/${id}`, { method: 'DELETE' })
}
