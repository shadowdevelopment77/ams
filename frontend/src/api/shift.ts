import { apiFetch } from './client'

export interface Shift {
  id: number
  company_id: number
  division_id: number
  name: string
  start_time: string
  end_time: string
}

export function getMyDivisionShifts() {
  return apiFetch<Shift[]>('/api/shift/my-division')
}
