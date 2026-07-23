import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { logout } from '@/api/auth'
import { ME_QUERY_KEY } from '@/hooks/useMe'

export function useLogout() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  return async () => {
    await logout()
    // setQueryData(key, undefined) is a no-op in TanStack Query (undefined
    // means "don't update"), so removeQueries is what actually clears it.
    queryClient.removeQueries({ queryKey: ME_QUERY_KEY })
    navigate('/login', { replace: true })
  }
}
