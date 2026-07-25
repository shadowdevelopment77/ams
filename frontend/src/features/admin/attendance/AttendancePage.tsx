import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { getCompanies } from '@/api/company'
import { getDivisionsByCompany } from '@/api/division'
import {
  getAttendanceByDate,
  getLateAttendance,
  getAttendancePhotos,
  type AdminAttendanceRecord,
} from '@/api/attendance'

type ViewMode = 'all' | 'late' | 'photos'

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

export function AttendancePage() {
  const [companyId, setCompanyId] = useState('')
  const [divisionId, setDivisionId] = useState('')
  const [date, setDate] = useState(todayIso())
  const [view, setView] = useState<ViewMode>('all')

  const { data: companies } = useQuery({
    queryKey: ['admin', 'companies', 'all'],
    queryFn: () => getCompanies({ limit: 100 }),
  })

  const { data: divisions } = useQuery({
    queryKey: ['admin', 'companies', companyId, 'divisions', 'all'],
    queryFn: () => getDivisionsByCompany(Number(companyId), { limit: 100 }),
    enabled: !!companyId,
  })

  const queryParams = {
    companyId: Number(companyId),
    divisionId: Number(divisionId),
    date,
  }
  const enabled = !!companyId && !!divisionId

  const { data: records, isLoading: recordsLoading } = useQuery({
    queryKey: ['admin', 'attendance', view === 'late' ? 'late' : 'all', queryParams],
    queryFn: () => (view === 'late' ? getLateAttendance(queryParams) : getAttendanceByDate(queryParams)),
    enabled: enabled && view !== 'photos',
  })

  const { data: photos, isLoading: photosLoading } = useQuery({
    queryKey: ['admin', 'attendance', 'photos', queryParams],
    queryFn: () => getAttendancePhotos(queryParams),
    enabled: enabled && view === 'photos',
  })

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Attendance</h1>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label>Company</Label>
          <Select
            value={companyId}
            onValueChange={(v) => {
              setCompanyId(v ?? '')
              setDivisionId('')
            }}
          >
            <SelectTrigger className="w-56">
              <SelectValue>
                {(value: string | null) =>
                  value ? companies?.data.find((c) => String(c.id) === value)?.name : 'Select a company'
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {companies?.data.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Division</Label>
          <Select value={divisionId} onValueChange={(v) => setDivisionId(v ?? '')} disabled={!companyId}>
            <SelectTrigger className="w-56">
              <SelectValue>
                {(value: string | null) =>
                  value ? divisions?.data.find((d) => String(d.id) === value)?.name : 'Select a division'
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {divisions?.data.map((d) => (
                <SelectItem key={d.id} value={String(d.id)}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="date">Date</Label>
          <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-40" />
        </div>
      </div>

      <div className="flex w-fit rounded-lg border border-border p-1">
        {(['all', 'late', 'photos'] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setView(mode)}
            className={cn(
              'rounded-md px-3 py-1 text-sm font-medium capitalize',
              view === mode ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
            )}
          >
            {mode === 'all' ? 'All' : mode === 'late' ? 'Late only' : 'Photos'}
          </button>
        ))}
      </div>

      {!enabled && (
        <p className="text-sm text-muted-foreground">Select a company and division to view attendance.</p>
      )}

      {enabled && view !== 'photos' && (
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff</TableHead>
                <TableHead>Shift</TableHead>
                <TableHead>Check in</TableHead>
                <TableHead>Check out</TableHead>
                <TableHead>Late</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recordsLoading && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              )}
              {!recordsLoading && records?.data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No records for this date.
                  </TableCell>
                </TableRow>
              )}
              {records?.data.map((record: AdminAttendanceRecord) => (
                <TableRow key={record.id}>
                  <TableCell className="font-medium">{record.user.name}</TableCell>
                  <TableCell>{record.shift.name}</TableCell>
                  <TableCell>{new Date(record.check_in_at).toLocaleTimeString()}</TableCell>
                  <TableCell>
                    {record.check_out_at ? new Date(record.check_out_at).toLocaleTimeString() : '—'}
                  </TableCell>
                  <TableCell>
                    {record.is_late ? (
                      <Badge variant="destructive">{record.late_minutes} min late</Badge>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell>{record.status.name}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {enabled && view === 'photos' && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {photosLoading && <Skeleton className="h-40 w-full" />}
          {!photosLoading && photos?.data.length === 0 && (
            <p className="col-span-full text-center text-muted-foreground">No photos for this date.</p>
          )}
          {photos?.data.map((photo, i) => (
            <div key={i} className="flex flex-col gap-2 rounded-lg border border-border p-2">
              <img src={photo.checkin_photo} alt="Check-in" className="h-32 w-full rounded object-cover" />
              <p className="text-xs text-muted-foreground">
                In: {new Date(photo.checkin_at).toLocaleTimeString()}
              </p>
              {photo.checkout_photo && (
                <>
                  <img
                    src={photo.checkout_photo}
                    alt="Check-out"
                    className="h-32 w-full rounded object-cover"
                  />
                  <p className="text-xs text-muted-foreground">
                    Out: {photo.checkout_at && new Date(photo.checkout_at).toLocaleTimeString()}
                  </p>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
