import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { useMe, ME_QUERY_KEY } from '@/hooks/useMe'
import { logout } from '@/api/auth'

// Placeholder — proves the login -> protected route -> logout loop works.
// Replaced by the real check-in/checklist/check-out dashboard in Phase 4.
export function DashboardStub() {
  const { user } = useMe()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const handleLogout = async () => {
    await logout()
    // setQueryData(key, undefined) is a no-op in TanStack Query (undefined
    // means "don't update"), so removeQueries is what actually clears it.
    queryClient.removeQueries({ queryKey: ME_QUERY_KEY })
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4">
      <p>
        Logged in as <strong>{user?.name}</strong> ({user?.role})
      </p>
      <Button onClick={handleLogout} variant="outline">
        Logout
      </Button>
    </div>
  )
}
