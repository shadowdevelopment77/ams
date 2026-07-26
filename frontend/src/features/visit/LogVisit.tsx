import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { PhotoInput } from '@/components/PhotoInput'
import { ApiError } from '@/api/client'
import { getCompanies } from '@/api/company'
import { createVisitLog } from '@/api/visit'
import { getCurrentPosition } from '@/lib/geolocation'

// Mirrors attendance/CheckIn.tsx's shape (a native select + PhotoInput +
// submit), but for SUPERVISOR: pick a client company instead of a shift,
// no shift concept applies here. No one-visit-per-day limit (CLAUDE.md),
// so this can be submitted repeatedly, including to the same company.
export function LogVisit() {
  const navigate = useNavigate()

  const { data: companies, isLoading: companiesLoading } = useQuery({
    queryKey: ['companies', 'all'],
    queryFn: () => getCompanies({ limit: 100 }),
  })

  const [companyId, setCompanyId] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const onSubmit = async () => {
    setError(null)
    if (!companyId) {
      setError('Please select a company')
      return
    }
    if (!photo) {
      setError('Please take a photo')
      return
    }
    setIsSubmitting(true)
    try {
      const { latitude, longitude } = await getCurrentPosition()
      await createVisitLog(Number(companyId), photo, latitude, longitude, notes || undefined)
      navigate('/visits', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Log a Visit</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="company">Company</Label>
            <select
              id="company"
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              disabled={companiesLoading}
            >
              <option value="">
                {companiesLoading ? 'Loading companies…' : 'Select a company'}
              </option>
              {companies?.data.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>

          <PhotoInput value={photo} onChange={setPhoto} />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button onClick={onSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Logging visit…' : 'Log Visit'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
