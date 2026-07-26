import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { downloadImage } from '@/lib/downloadImage'
import type { ChecklistPhoto, ChecklistPhotoRecord } from '@/api/checklist'

export interface PhotoEntry {
  photo: ChecklistPhoto
  record: ChecklistPhotoRecord
}

export interface ItemPhotoGroup {
  description: string
  entries: PhotoEntry[]
}

// Both the divisiond/staff list queries and the per-item detail page fetch
// the same shape of data by item -- shared here so a cache hit on one page
// is guaranteed to mean the same limit was actually used.
export const CHECKLIST_PHOTOS_LIMIT = 50

export function groupRecordsByItem(records: ChecklistPhotoRecord[]) {
  const groups = new Map<number, ItemPhotoGroup>()
  for (const record of records) {
    const group = groups.get(record.item.id) ?? { description: record.item.description, entries: [] }
    for (const photo of record.photos) {
      group.entries.push({ photo, record })
    }
    groups.set(record.item.id, group)
  }
  return groups
}

export function PhotoCard({ photo, record, className }: PhotoEntry & { className?: string }) {
  return (
    <div className={cn('flex flex-col gap-2 rounded-lg border border-border p-2', className)}>
      <img
        src={photo.photo_url}
        alt="Checklist evidence"
        className="h-32 w-full rounded object-cover"
      />
      <p className="text-xs text-muted-foreground">
        {record.user.name} · {record.company.name} / {record.division.name}
      </p>
      {record.submitted_at && (
        <p className="text-xs text-muted-foreground">
          {new Date(record.submitted_at).toLocaleString()}
        </p>
      )}
      {record.location_address && (
        <p className="text-xs text-muted-foreground">{record.location_address}</p>
      )}
      <Button
        variant="ghost"
        size="xs"
        onClick={() =>
          downloadImage(photo.photo_url, `checklist-${record.item.description}-${record.user.name}.jpg`)
        }
      >
        Download
      </Button>
    </div>
  )
}
