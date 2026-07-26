import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { getCompanies } from '@/api/company'
import { getDivisionsByCompany } from '@/api/division'
import { getUsers } from '@/api/user'
import { getChecklistPhotosByDivision, getChecklistPhotosByUser, type ChecklistPhotoRecord } from '@/api/checklist'
import { CHECKLIST_PHOTOS_LIMIT, PhotoCard, groupRecordsByItem } from './PhotoCard'

type BrowseMode = 'division' | 'staff'

// Photos shown per item group before "…see more" -- clicking through goes
// to a dedicated page (ChecklistItemPhotosPage) rather than expanding this
// row in place, so a heavy item (dozens of photos from many staff) never
// has to render/scroll horizontally on this page.
const VISIBLE_PER_GROUP = 5

function PhotoGrid({
  records,
  isLoading,
  linkSearchParams,
}: {
  records?: ChecklistPhotoRecord[]
  isLoading: boolean
  linkSearchParams: URLSearchParams
}) {
  if (isLoading) return <Skeleton className="h-40 w-full" />
  if (!records || records.length === 0) {
    return <p className="text-center text-muted-foreground">No checklist photos for this date.</p>
  }

  const groups = groupRecordsByItem(records)

  return (
    <div className="flex flex-col gap-6">
      {Array.from(groups.entries()).map(([itemId, group]) => {
        const visibleEntries = group.entries.slice(0, VISIBLE_PER_GROUP)
        const hiddenCount = group.entries.length - visibleEntries.length

        return (
          <div key={itemId} className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">{group.description}</h3>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {visibleEntries.map(({ photo, record }) => (
                <PhotoCard key={photo.id} photo={photo} record={record} className="w-40 shrink-0" />
              ))}
              {hiddenCount > 0 && (
                <Link
                  to={`/admin/checklists/item/${itemId}?${linkSearchParams.toString()}`}
                  className="flex w-40 shrink-0 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  …see more ({hiddenCount})
                </Link>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

export function ChecklistsPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  const mode: BrowseMode = searchParams.get('mode') === 'staff' ? 'staff' : 'division'

  const setMode = (next: BrowseMode) => {
    const params = new URLSearchParams(searchParams)
    params.set('mode', next)
    setSearchParams(params, { replace: true })
  }

  // ── By division ── (all persisted to the URL so "…see more" -> back
  // restores the exact same filter instead of resetting to defaults)
  const companyId = searchParams.get('companyId') ?? ''
  const divisionId = searchParams.get('divisionId') ?? ''
  const divisionDate = searchParams.get('date') || todayIso()

  const { data: companies } = useQuery({
    queryKey: ['admin', 'companies', 'all'],
    queryFn: () => getCompanies({ limit: 100 }),
  })

  const { data: divisions } = useQuery({
    queryKey: ['admin', 'companies', companyId, 'divisions', 'all'],
    queryFn: () => getDivisionsByCompany(Number(companyId), { limit: 100 }),
    enabled: !!companyId,
  })

  const byDivisionEnabled = !!companyId && !!divisionId

  const { data: divisionPhotos, isLoading: divisionPhotosLoading } = useQuery({
    queryKey: ['admin', 'checklist', 'photos', 'division', companyId, divisionId, divisionDate],
    queryFn: () =>
      getChecklistPhotosByDivision(Number(companyId), Number(divisionId), divisionDate, {
        limit: CHECKLIST_PHOTOS_LIMIT,
      }),
    enabled: byDivisionEnabled,
  })

  // ── By staff member ──
  const [staffQuery, setStaffQuery] = useState(() => searchParams.get('userName') ?? '')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [selectedStaff, setSelectedStaff] = useState<{ id: string; name: string } | null>(() => {
    const uid = searchParams.get('userId')
    const uname = searchParams.get('userName')
    return uid && uname ? { id: uid, name: uname } : null
  })
  const [staffDate, setStaffDate] = useState(() => searchParams.get('staffDate') ?? '')

  const lookupUserId = searchParams.get('userId') ?? ''
  const lookupDate = searchParams.get('staffDate') ?? ''

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(staffQuery), 300)
    return () => clearTimeout(timer)
  }, [staffQuery])

  const { data: staffResults, isLoading: searchingStaff } = useQuery({
    queryKey: ['admin', 'users', 'search', 'staff', debouncedQuery],
    queryFn: () => getUsers({ search: debouncedQuery, role: 'STAFF', limit: 10 }),
    enabled: debouncedQuery.length >= 1 && !selectedStaff,
  })

  const { data: staffPhotos, isLoading: staffPhotosLoading } = useQuery({
    queryKey: ['admin', 'checklist', 'photos', 'user', lookupUserId, lookupDate],
    queryFn: () =>
      getChecklistPhotosByUser(lookupUserId, lookupDate || undefined, { limit: CHECKLIST_PHOTOS_LIMIT }),
    enabled: !!lookupUserId,
  })

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Checklists</h1>

      <div className="flex w-fit rounded-lg border border-border p-1">
        {(['division', 'staff'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={cn(
              'rounded-md px-3 py-1 text-sm font-medium',
              mode === m ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
            )}
          >
            {m === 'division' ? 'By Division' : 'By Staff Member'}
          </button>
        ))}
      </div>

      {mode === 'division' && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Company</Label>
              <Select
                value={companyId}
                onValueChange={(v) => {
                  const params = new URLSearchParams(searchParams)
                  if (v) params.set('companyId', v)
                  else params.delete('companyId')
                  params.delete('divisionId')
                  setSearchParams(params, { replace: true })
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
              <Select
                value={divisionId}
                onValueChange={(v) => {
                  const params = new URLSearchParams(searchParams)
                  if (v) params.set('divisionId', v)
                  else params.delete('divisionId')
                  setSearchParams(params, { replace: true })
                }}
                disabled={!companyId}
              >
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
              <Label htmlFor="divisionDate">Date</Label>
              <Input
                id="divisionDate"
                type="date"
                value={divisionDate}
                onChange={(e) => {
                  const params = new URLSearchParams(searchParams)
                  params.set('date', e.target.value)
                  setSearchParams(params, { replace: true })
                }}
                className="w-40"
              />
            </div>
          </div>

          {!byDivisionEnabled && (
            <p className="text-sm text-muted-foreground">Select a company and division to view checklist photos.</p>
          )}
          {byDivisionEnabled && (
            <PhotoGrid
              records={divisionPhotos?.data}
              isLoading={divisionPhotosLoading}
              linkSearchParams={searchParams}
            />
          )}
        </div>
      )}

      {mode === 'staff' && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="relative flex flex-col gap-1.5">
              <Label htmlFor="staffSearch">Staff member</Label>
              <Input
                id="staffSearch"
                value={staffQuery}
                onChange={(e) => {
                  setStaffQuery(e.target.value)
                  setSelectedStaff(null)
                }}
                placeholder="Search by name…"
                className="w-72"
                autoComplete="off"
              />
              {staffQuery.length >= 1 && !selectedStaff && (
                <div className="absolute top-full z-10 mt-1 w-72 rounded-lg border border-border bg-popover shadow-md">
                  {searchingStaff && <p className="p-2 text-sm text-muted-foreground">Searching…</p>}
                  {!searchingStaff && staffResults?.data.length === 0 && (
                    <p className="p-2 text-sm text-muted-foreground">No staff found.</p>
                  )}
                  {staffResults?.data.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      className="block w-full px-3 py-1.5 text-left text-sm hover:bg-muted"
                      onClick={() => {
                        setSelectedStaff({ id: u.id, name: u.name })
                        setStaffQuery(u.name)
                      }}
                    >
                      {u.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="staffDate">Date</Label>
              <Input
                id="staffDate"
                type="date"
                value={staffDate}
                onChange={(e) => setStaffDate(e.target.value)}
                className="w-40"
              />
            </div>

            <Button
              variant="outline"
              disabled={!selectedStaff}
              onClick={() => {
                if (!selectedStaff) return
                const params = new URLSearchParams(searchParams)
                params.set('userId', selectedStaff.id)
                params.set('userName', selectedStaff.name)
                if (staffDate) params.set('staffDate', staffDate)
                else params.delete('staffDate')
                setSearchParams(params, { replace: true })
              }}
            >
              Look up
            </Button>
          </div>

          {!lookupUserId && (
            <p className="text-sm text-muted-foreground">Search for a staff member to view checklist photos.</p>
          )}
          {lookupUserId && (
            <PhotoGrid records={staffPhotos?.data} isLoading={staffPhotosLoading} linkSearchParams={searchParams} />
          )}
        </div>
      )}
    </div>
  )
}
