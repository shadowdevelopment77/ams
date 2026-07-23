import { Button } from '@/components/ui/button'
import { useMe } from '@/hooks/useMe'
import { useLogout } from '@/hooks/useLogout'

// Placeholder — proves the login -> protected route -> logout loop works.
// Replaced by the real check-in/checklist/check-out dashboard in Phase 4.
export function DashboardStub() {
  const { user } = useMe()
  const handleLogout = useLogout()

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
