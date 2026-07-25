import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useMe } from '@/hooks/useMe'
import { useLogout } from '@/hooks/useLogout'
import { useTodayAttendance } from '@/hooks/useTodayAttendance'

export function Dashboard() {
  const { user } = useMe()
  const logout = useLogout()
  const { attendance, isLoading } = useTodayAttendance()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    await logout()
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-4">
      <p>
        Logged in as <strong>{user?.name}</strong> ({user?.role})
      </p>

      {isLoading ? (
        <p className="text-muted-foreground">Loading today's attendance…</p>
      ) : !attendance ? (
        <div className="flex flex-col items-center gap-2">
          <p className="text-muted-foreground">You haven't checked in today.</p>
          <Button render={<Link to="/checkin" />}>Check In</Button>
        </div>
      ) : !attendance.check_out_at ? (
        <div className="flex flex-col items-center gap-2">
          <p className="text-muted-foreground">
            Checked in at {new Date(attendance.check_in_at).toLocaleTimeString()}
            {attendance.is_late ? ' (late)' : ''}.
          </p>
          <Button render={<Link to="/checklist" />}>View Checklist</Button>
          <Button render={<Link to="/checkout" />} variant="outline">
            Check Out
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <p className="text-muted-foreground">
            You're done for today — checked out at{' '}
            {new Date(attendance.check_out_at).toLocaleTimeString()}.
          </p>
        </div>
      )}

      <Button onClick={handleLogout} variant="ghost" disabled={isLoggingOut}>
        Logout
      </Button>
    </div>
  )
}
