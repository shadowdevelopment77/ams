import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { useMe } from '@/hooks/useMe'
import { useLogout } from '@/hooks/useLogout'
import { getMyVisits } from '@/api/visit'

// SUPERVISOR's landing page -- mirrors attendance/Dashboard.tsx's shape
// (identity line, primary action, logout), but SUPERVISOR has no
// one-visit-per-day limit (see CLAUDE.md), so this shows a list of
// today's visits logged so far rather than a single status.
export function VisitDashboard() {
  const { user } = useMe()
  const logout = useLogout()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const { data: visits, isLoading } = useQuery({
    queryKey: ['visits', 'my-visits'],
    queryFn: () => getMyVisits({ limit: 50 }),
  })

  const handleLogout = async () => {
    setIsLoggingOut(true)
    await logout()
  }

  return (
    <div className="flex min-h-svh flex-col items-center gap-4 p-4">
      <p>
        Logged in as <strong>{user?.name}</strong> ({user?.role})
      </p>

      <Button render={<Link to="/visits/new" />}>Log a Visit</Button>

      <div className="flex w-full max-w-sm flex-col gap-2">
        <h2 className="text-sm font-medium text-muted-foreground">Today's visits</h2>
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && visits?.data.length === 0 && (
          <p className="text-sm text-muted-foreground">No visits logged yet today.</p>
        )}
        {visits?.data.map((visit) => (
          <div key={visit.id} className="rounded-lg border border-border p-3">
            <p className="font-medium">{visit.company.name}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(visit.visited_at).toLocaleTimeString()}
            </p>
            {visit.notes && <p className="mt-1 text-sm">{visit.notes}</p>}
          </div>
        ))}
      </div>

      <Button onClick={handleLogout} variant="ghost" disabled={isLoggingOut}>
        Logout
      </Button>
    </div>
  )
}
