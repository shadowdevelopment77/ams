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

export interface UserListParams extends PaginationParams {
  search?: string
  role?: Role
}

export function getUsers(params?: UserListParams) {
  const search = new URLSearchParams()
  if (params?.page) search.set('page', String(params.page))
  if (params?.limit) search.set('limit', String(params.limit))
  if (params?.search) search.set('search', params.search)
  if (params?.role) search.set('role', params.role)
  const qs = search.toString()
  return apiFetch<PaginatedResult<User>>(`/api/users${qs ? `?${qs}` : ''}`)
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

// Backend only allows moving STAFF -- ADMIN/SUPERVISOR are rejected with a
// 400, by design (they're never assigned a company/division).
export function moveUserCompany(id: string, companyId: number, divisionId: number) {
  return apiFetch<unknown>(`/api/users/${id}/move-company`, {
    method: 'PUT',
    body: JSON.stringify({ company_id: companyId, division_id: divisionId }),
  })
}

export function deleteUser(id: string) {
  return apiFetch<User>(`/api/users/${id}`, { method: 'DELETE' })
}
