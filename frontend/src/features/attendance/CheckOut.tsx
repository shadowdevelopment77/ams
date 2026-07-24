import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PhotoInput } from '@/components/PhotoInput'
import { ApiError } from '@/api/client'
import { checkOut } from '@/api/attendance'
import { useTodayAttendance, useInvalidateTodayAttendance } from '@/hooks/useTodayAttendance'

export function CheckOut() {
  const navigate = useNavigate()
  const invalidateToday = useInvalidateTodayAttendance()
  const { attendance, isLoading } = useTodayAttendance()

  const [photo, setPhoto] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isLoading && !attendance) {
    return <Navigate to="/checkin" replace />
  }
  if (!isLoading && attendance?.check_out_at) {
    return <Navigate to="/" replace />
  }

  const onSubmit = async () => {
    if (!attendance) return
    setError(null)
    if (!photo) {
      setError('Please take a photo')
      return
    }
    setIsSubmitting(true)
    try {
      await checkOut(attendance.id, photo)
      await invalidateToday()
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Check Out</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <PhotoInput value={photo} onChange={setPhoto} />

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button onClick={onSubmit} disabled={isSubmitting || isLoading}>
            {isSubmitting ? 'Checking out…' : 'Check Out'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
