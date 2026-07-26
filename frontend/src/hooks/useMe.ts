import { useQuery } from '@tanstack/react-query'
import { ApiError } from '@/api/client'
import { getMe } from '@/api/auth'

export const ME_QUERY_KEY = ['me'] as const

export function useMe() {
  const query = useQuery({
    queryKey: ME_QUERY_KEY,
    queryFn: getMe,
    // A 401 here just means "not logged in" — not a transient failure worth
    // retrying, and not something to surface as an error banner.
    retry: false,
  })

  const isUnauthenticated = query.error instanceof ApiError && query.error.status === 401

  return {
    user: query.data,
    isLoading: query.isLoading,
    isAuthenticated: !!query.data,
    isUnauthenticated,
  }
}
