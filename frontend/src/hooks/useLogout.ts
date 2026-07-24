import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { logout } from '@/api/auth'
import { ME_QUERY_KEY } from '@/hooks/useMe'

export function useLogout() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  return async () => {
    // The backend call can fail for reasons that have nothing to do with
    // whether the user should still be able to leave this screen (rate
    // limiting, a dropped connection, session already expired server-side).
    // Clear local state and navigate regardless -- getting the user stuck
    // on a page with no way out is worse than an occasional session that
    // doesn't get explicitly invalidated server-side (it still expires on
    // its own after 2 hours either way).
    try {
      await logout()
    } catch (err) {
      console.error('Logout request failed, clearing local session anyway:', err)
    }
    // setQueryData(key, undefined) is a no-op in TanStack Query (undefined
    // means "don't update"), so removeQueries is what actually clears it.
    queryClient.removeQueries({ queryKey: ME_QUERY_KEY })
    navigate('/login', { replace: true })
  }
}
