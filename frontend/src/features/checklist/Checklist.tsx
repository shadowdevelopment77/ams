import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { PhotoInput } from '@/components/PhotoInput'
import { ApiError } from '@/api/client'
import { getMyChecklist, uploadChecklistPhoto, submitChecklist } from '@/api/checklist'
import { useTodayAttendance } from '@/hooks/useTodayAttendance'

const CHECKLIST_QUERY_KEY = ['checklist', 'my-checklist'] as const
const MAX_PHOTOS_PER_ITEM = 3

export function Checklist() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { attendance, isLoading: attendanceLoading } = useTodayAttendance()
  const [pendingPhotos, setPendingPhotos] = useState<Record<number, File | null>>({})
  const [uploadingItemId, setUploadingItemId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { data: submissions, isLoading: checklistLoading } = useQuery({
    queryKey: CHECKLIST_QUERY_KEY,
    queryFn: getMyChecklist,
    enabled: !!attendance,
  })

  // No attendance today -> nothing to check a checklist against yet.
  if (!attendanceLoading && !attendance) {
    return <Navigate to="/checkin" replace />
  }

  const handleUpload = async (itemId: number) => {
    const photo = pendingPhotos[itemId]
    if (!photo || !attendance) return
    setError(null)
    setUploadingItemId(itemId)
    try {
      await uploadChecklistPhoto(attendance.id, itemId, photo)
      await queryClient.invalidateQueries({ queryKey: CHECKLIST_QUERY_KEY })
      setPendingPhotos((prev) => ({ ...prev, [itemId]: null }))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong')
    } finally {
      setUploadingItemId(null)
    }
  }

  const handleSubmit = async () => {
    if (!attendance) return
    setError(null)
    setIsSubmitting(true)
    try {
      await submitChecklist(attendance.id)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (attendanceLoading || checklistLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <p className="text-muted-foreground">Loading checklist…</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-svh flex-col items-center gap-4 p-4">
      <h1 className="mt-4 text-xl font-semibold">Today's Checklist</h1>

      <div className="flex w-full max-w-sm flex-col gap-4">
        {submissions?.map((submission) => (
          <div key={submission.id} className="rounded-lg border border-border p-3">
            <p className="mb-2 text-sm font-medium">{submission.item.description}</p>
            {submission.photos.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {submission.photos.map((photo) => (
                  <img
                    key={photo.id}
                    src={photo.photo_url}
                    alt=""
                    className="h-16 w-16 rounded object-cover"
                  />
                ))}
              </div>
            )}
            {/* At least 1 photo is required to submit, up to MAX_PHOTOS_PER_ITEM --
                keep offering the upload control until the cap is hit rather than
                locking out after the first photo. */}
            {submission.photos.length < MAX_PHOTOS_PER_ITEM && (
              <div className="flex flex-col gap-2">
                <PhotoInput
                  value={pendingPhotos[submission.item_id] ?? null}
                  onChange={(file) =>
                    setPendingPhotos((prev) => ({ ...prev, [submission.item_id]: file }))
                  }
                />
                <Button
                  size="sm"
                  disabled={!pendingPhotos[submission.item_id] || uploadingItemId === submission.item_id}
                  onClick={() => handleUpload(submission.item_id)}
                >
                  {uploadingItemId === submission.item_id
                    ? 'Uploading…'
                    : `Add photo (${submission.photos.length}/${MAX_PHOTOS_PER_ITEM})`}
                </Button>
              </div>
            )}
          </div>
        ))}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? 'Submitting…' : 'Submit Checklist'}
        </Button>
        <Button variant="outline" onClick={() => navigate('/')}>
          Back to Dashboard
        </Button>
      </div>
    </div>
  )
}
