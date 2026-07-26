import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { logout } from '@/api/auth'

export function useLogout() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  return async () => {
    // Clear local state and navigate regardless of whether the backend call
    // succeeds -- a stuck user is worse than a session that expires on its own.
    try {
      await logout()
    } catch (err) {
      console.error('Logout request failed, clearing local session anyway:', err)
    }
    // Full clear, not just ME_QUERY_KEY -- every per-user query (attendance,
    // checklist, visits, ...) must be wiped at the identity boundary, or the
    // next account logged into on this browser can see the previous
    // account's cached data until its staleTime happens to lapse.
    queryClient.clear()
    navigate('/login', { replace: true })
  }
}
