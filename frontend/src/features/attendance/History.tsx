import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getMyAttendanceHistory } from '@/api/attendance'

// STAFF's own attendance history -- Dashboard.tsx only ever shows today's
// status, this is the first place to see past days at all.
export function History() {
  const { data, isLoading } = useQuery({
    queryKey: ['attendance', 'my-history'],
    queryFn: () => getMyAttendanceHistory({ limit: 50 }),
  })

  return (
    <div className="flex min-h-svh flex-col items-center gap-4 p-4">
      <h1 className="text-lg font-semibold">Attendance History</h1>

      <div className="flex w-full max-w-sm flex-col gap-2">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && data?.data.length === 0 && (
          <p className="text-sm text-muted-foreground">No attendance history yet.</p>
        )}
        {data?.data.map((record) => (
          <div key={record.id} className="rounded-lg border border-border p-3">
            <div className="flex items-center justify-between">
              <p className="font-medium">{new Date(record.date).toLocaleDateString()}</p>
              <Badge variant="outline">{record.status.name}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">{record.shift.name}</p>
            <p className="text-sm">
              In: {new Date(record.check_in_at).toLocaleTimeString()}
              {record.is_late && ` (${record.late_minutes} min late)`}
            </p>
            {record.check_out_at && (
              <p className="text-sm">
                Out: {new Date(record.check_out_at).toLocaleTimeString()}
                {record.early_leave && ' (early leave)'}
              </p>
            )}
          </div>
        ))}
      </div>

      <Button render={<Link to="/" />} variant="ghost">
        Back to Dashboard
      </Button>
    </div>
  )
}
