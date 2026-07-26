import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getTodayAttendance } from '@/api/attendance'

export const TODAY_ATTENDANCE_QUERY_KEY = ['attendance', 'today'] as const

export function useTodayAttendance() {
  const query = useQuery({
    queryKey: TODAY_ATTENDANCE_QUERY_KEY,
    queryFn: getTodayAttendance,
  })
  return { attendance: query.data ?? null, isLoading: query.isLoading }
}

export function useInvalidateTodayAttendance() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: TODAY_ATTENDANCE_QUERY_KEY })
}
