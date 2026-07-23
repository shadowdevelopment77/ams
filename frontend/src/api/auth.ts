import { apiFetch } from './client'

export type Role = 'ADMIN' | 'SUPERVISOR' | 'STAFF'

// Shape returned by both POST /login (nested under `user`) and GET /me (flat).
export interface CurrentUser {
  id: string
  name: string
  email: string
  role: Role
  // /me returns Prisma's raw `null` for an unset phone, not undefined.
  phone?: string | null
  companyId?: number
  divisionId?: number
}

export function login(email: string, password: string) {
  return apiFetch<{ user: CurrentUser }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export function logout() {
  return apiFetch<null>('/api/auth/logout', { method: 'POST' })
}

export function getMe() {
  return apiFetch<CurrentUser>('/api/auth/me')
}
