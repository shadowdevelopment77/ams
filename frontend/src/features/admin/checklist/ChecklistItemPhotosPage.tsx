import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { getChecklistPhotosByDivision, getChecklistPhotosByUser } from '@/api/checklist'
import { CHECKLIST_PHOTOS_LIMIT, PhotoCard, groupRecordsByItem } from './PhotoCard'

// Dedicated page for a single checklist item's full photo set, reached via
// "…see more" on ChecklistsPage. Renders a wrapping grid that scrolls
// vertically -- the whole point is to avoid cramming a heavy item's photos
// (now routinely 20+) into a horizontally-scrolling row.
export function ChecklistItemPhotosPage() {
  const { itemId } = useParams<{ itemId: string }>()
  const itemIdNum = Number(itemId)
  const [searchParams] = useSearchParams()

  const mode = searchParams.get('mode') === 'staff' ? 'staff' : 'division'
  const companyId = searchParams.get('companyId') ?? ''
  const divisionId = searchParams.get('divisionId') ?? ''
  const divisionDate = searchParams.get('date') ?? ''
  const userId = searchParams.get('userId') ?? ''
  const staffDate = searchParams.get('staffDate') ?? ''

  // Same queryKey/queryFn shape as ChecklistsPage so a cache hit here means
  // the identical limit was actually used to fetch the data.
  const { data: divisionPhotos, isLoading: divisionLoading } = useQuery({
    queryKey: ['admin', 'checklist', 'photos', 'division', companyId, divisionId, divisionDate],
    queryFn: () =>
      getChecklistPhotosByDivision(Number(companyId), Number(divisionId), divisionDate, {
        limit: CHECKLIST_PHOTOS_LIMIT,
      }),
    enabled: mode === 'division' && !!companyId && !!divisionId,
  })

  const { data: staffPhotos, isLoading: staffLoading } = useQuery({
    queryKey: ['admin', 'checklist', 'photos', 'user', userId, staffDate],
    queryFn: () => getChecklistPhotosByUser(userId, staffDate || undefined, { limit: CHECKLIST_PHOTOS_LIMIT }),
    enabled: mode === 'staff' && !!userId,
  })

  const records = mode === 'division' ? divisionPhotos?.data : staffPhotos?.data
  const isLoading = mode === 'division' ? divisionLoading : staffLoading

  const group = records ? groupRecordsByItem(records).get(itemIdNum) : undefined
  const backTo = `/admin/checklists?${searchParams.toString()}`

  return (
    <div className="flex flex-col gap-4">
      <Button variant="ghost" size="sm" className="w-fit" render={<Link to={backTo} />}>
        ← Back
      </Button>

      {isLoading && <Skeleton className="h-40 w-full" />}

      {!isLoading && !group && (
        <p className="text-center text-muted-foreground">No photos found for this checklist item.</p>
      )}

      {!isLoading && group && (
        <>
          <div>
            <h1 className="text-xl font-semibold">{group.description}</h1>
            <p className="text-sm text-muted-foreground">{group.entries.length} photos</p>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {group.entries.map(({ photo, record }) => (
              <PhotoCard key={photo.id} photo={photo} record={record} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
