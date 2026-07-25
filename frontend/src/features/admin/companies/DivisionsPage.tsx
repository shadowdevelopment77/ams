import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getCompanies } from '@/api/company'
import { DivisionsList } from './DivisionsList'

// Top-level entry point for Divisions -- previously the only way in was
// Companies -> a specific company's detail page, which made Division
// management hard to find. This mirrors the company-picker pattern
// AttendancePage/VisitsPage already use for company-scoped views.
export function DivisionsPage() {
  const [companyId, setCompanyId] = useState('')

  const { data: companies } = useQuery({
    queryKey: ['admin', 'companies', 'all'],
    queryFn: () => getCompanies({ limit: 100 }),
  })

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Divisions</h1>

      <div className="flex flex-col gap-1.5">
        <Label>Company</Label>
        <Select value={companyId} onValueChange={(v) => setCompanyId(v ?? '')}>
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

      {companyId && <DivisionsList companyId={Number(companyId)} />}
    </div>
  )
}
