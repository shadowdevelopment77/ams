import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { PhotoInput } from '@/components/PhotoInput'
import { ApiError } from '@/api/client'
import { getMyDivisionShifts } from '@/api/shift'
import { checkIn } from '@/api/attendance'
import { useInvalidateTodayAttendance } from '@/hooks/useTodayAttendance'

export function CheckIn() {
  const navigate = useNavigate()
  const invalidateToday = useInvalidateTodayAttendance()

  const { data: shifts, isLoading: shiftsLoading } = useQuery({
    queryKey: ['shifts', 'my-division'],
    queryFn: getMyDivisionShifts,
  })

  const [shiftId, setShiftId] = useState<string>('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const onSubmit = async () => {
    setError(null)
    if (!shiftId) {
      setError('Please select a shift')
      return
    }
    if (!photo) {
      setError('Please take a photo')
      return
    }
    setIsSubmitting(true)
    try {
      await checkIn(Number(shiftId), photo)
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
          <CardTitle>Check In</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="shift">Shift</Label>
            <select
              id="shift"
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
              value={shiftId}
              onChange={(e) => setShiftId(e.target.value)}
              disabled={shiftsLoading}
            >
              <option value="">
                {shiftsLoading ? 'Loading shifts…' : 'Select a shift'}
              </option>
              {shifts?.map((shift) => (
                <option key={shift.id} value={shift.id}>
                  {shift.name} ({shift.start_time}–{shift.end_time})
                </option>
              ))}
            </select>
            {shifts && shifts.length === 0 && (
              <p className="text-sm text-destructive">
                No shifts found for your division — contact your admin.
              </p>
            )}
          </div>

          <PhotoInput value={photo} onChange={setPhoto} />

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button onClick={onSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Checking in…' : 'Check In'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
