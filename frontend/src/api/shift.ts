import { apiFetch } from './client'

export interface Shift {
  id: number
  company_id: number
  division_id: number
  name: string
  start_time: string
  end_time: string
  is_active: boolean
}

// Mirrors backend/src/modules/shift/shift.validation.ts.
export interface ShiftInput {
  company_id: number
  division_id: number
  name: string
  start_time: string
  end_time: string
}

export function getMyDivisionShifts() {
  return apiFetch<Shift[]>('/api/shift/my-division')
}

// Not paginated -- shiftRepository.findShift returns a plain array (a
// division realistically has a handful of shifts, not pages of them).
export function getShifts(companyId: number, divisionId: number) {
  return apiFetch<Shift[]>(`/api/shift/company/${companyId}/division/${divisionId}`)
}

export function createShift(input: ShiftInput) {
  return apiFetch<Shift>('/api/shift', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function updateShift(
  id: number,
  input: Partial<Omit<ShiftInput, 'company_id' | 'division_id'>> & { is_active?: boolean }
) {
  return apiFetch<Shift>(`/api/shift/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  })
}

export function deleteShift(id: number) {
  return apiFetch<Shift>(`/api/shift/${id}`, { method: 'DELETE' })
}
