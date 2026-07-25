import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { ApiError } from '@/api/client'
import { getVisitLogs, deleteVisitLog, getVisitPhotosByUser, type VisitLog } from '@/api/visit'
import { getUsers } from '@/api/user'

const VISITS_KEY = ['admin', 'visits'] as const

export function VisitsPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: [...VISITS_KEY, page],
    queryFn: () => getVisitLogs({ page, limit: 10 }),
  })

  const [deleteTarget, setDeleteTarget] = useState<VisitLog | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleteError(null)
    setIsDeleting(true)
    try {
      await deleteVisitLog(deleteTarget.id)
      await queryClient.invalidateQueries({ queryKey: VISITS_KEY })
      setDeleteTarget(null)
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : 'Something went wrong')
    } finally {
      setIsDeleting(false)
    }
  }

  // ── Photos by staff member (the one place `date` filtering actually
  // works -- GET /api/visit's own date param is a known backend no-op). ──
  // Search by name, restricted to SUPERVISOR (the only role that creates
  // visit logs) -- the admin never sees or types a raw user id.
  const [supervisorQuery, setSupervisorQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [selectedSupervisor, setSelectedSupervisor] = useState<{ id: string; name: string } | null>(
    null
  )
  const [photoDate, setPhotoDate] = useState('')
  const [lookupUserId, setLookupUserId] = useState('')
  const [lookupDate, setLookupDate] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(supervisorQuery), 300)
    return () => clearTimeout(timer)
  }, [supervisorQuery])

  const { data: supervisorResults, isLoading: searchingSupervisors } = useQuery({
    queryKey: ['admin', 'users', 'search', debouncedQuery],
    queryFn: () => getUsers({ search: debouncedQuery, role: 'SUPERVISOR', limit: 10 }),
    enabled: debouncedQuery.length >= 2 && !selectedSupervisor,
  })

  const { data: userPhotos, isLoading: photosLoading } = useQuery({
    queryKey: ['admin', 'visits', 'photos', lookupUserId, lookupDate],
    queryFn: () => getVisitPhotosByUser(lookupUserId, lookupDate || undefined, { limit: 50 }),
    enabled: !!lookupUserId,
  })

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Visit Logs</h1>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Supervisor</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Visited at</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={5}>
                  <Skeleton className="h-5 w-full" />
                </TableCell>
              </TableRow>
            )}
            {!isLoading && data?.data.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No visit logs yet.
                </TableCell>
              </TableRow>
            )}
            {data?.data.map((log) => (
              <TableRow key={log.id}>
                <TableCell>{log.user.name}</TableCell>
                <TableCell>{log.company.name}</TableCell>
                <TableCell>{new Date(log.visited_at).toLocaleString()}</TableCell>
                <TableCell>{log.notes ?? '—'}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => {
                      setDeleteError(null)
                      setDeleteTarget(log)
                    }}
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {data.page} of {data.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= data.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}

      <div className="mt-4 flex flex-col gap-3">
        <h2 className="text-lg font-medium">Photos by staff member</h2>
        <div className="flex flex-wrap items-end gap-3">
          <div className="relative flex flex-col gap-1.5">
            <Label htmlFor="supervisorSearch">Supervisor</Label>
            <Input
              id="supervisorSearch"
              value={supervisorQuery}
              onChange={(e) => {
                setSupervisorQuery(e.target.value)
                setSelectedSupervisor(null)
                setLookupUserId('')
              }}
              placeholder="Search by name…"
              className="w-72"
              autoComplete="off"
            />
            {supervisorQuery.length >= 2 && !selectedSupervisor && (
              <div className="absolute top-full z-10 mt-1 w-72 rounded-lg border border-border bg-popover shadow-md">
                {searchingSupervisors && (
                  <p className="p-2 text-sm text-muted-foreground">Searching…</p>
                )}
                {!searchingSupervisors && supervisorResults?.data.length === 0 && (
                  <p className="p-2 text-sm text-muted-foreground">No supervisors found.</p>
                )}
                {supervisorResults?.data.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    className="block w-full px-3 py-1.5 text-left text-sm hover:bg-muted"
                    onClick={() => {
                      setSelectedSupervisor({ id: u.id, name: u.name })
                      setSupervisorQuery(u.name)
                    }}
                  >
                    {u.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="photoDate">Date</Label>
            <Input
              id="photoDate"
              type="date"
              value={photoDate}
              onChange={(e) => setPhotoDate(e.target.value)}
              className="w-40"
            />
          </div>
          <Button
            variant="outline"
            disabled={!selectedSupervisor}
            onClick={() => {
              if (!selectedSupervisor) return
              setLookupUserId(selectedSupervisor.id)
              setLookupDate(photoDate)
            }}
          >
            Look up
          </Button>
        </div>

        {lookupUserId && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {photosLoading && <Skeleton className="h-32 w-full" />}
            {!photosLoading && userPhotos?.data.length === 0 && (
              <p className="col-span-full text-sm text-muted-foreground">No visit photos found.</p>
            )}
            {userPhotos?.data.map((photo, i) => (
              <div key={i} className="flex flex-col gap-2 rounded-lg border border-border p-2">
                <img src={photo.visit_photo} alt="Visit" className="h-32 w-full rounded object-cover" />
                <p className="text-xs font-medium">{photo.company.name}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(photo.visited_at).toLocaleString()}
                </p>
                {photo.notes && <p className="text-xs">{photo.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete this visit log?"
        onConfirm={handleDelete}
        isConfirming={isDeleting}
        error={deleteError}
      />
    </div>
  )
}
