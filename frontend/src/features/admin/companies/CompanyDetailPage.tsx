import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { getCompany } from '@/api/company'
import { DivisionsList } from './DivisionsList'

export function CompanyDetailPage() {
  const { companyId } = useParams<{ companyId: string }>()
  const id = Number(companyId)
  const navigate = useNavigate()

  const { data: company } = useQuery({
    queryKey: ['admin', 'companies', id],
    queryFn: () => getCompany(id),
  })

  return (
    <div className="flex flex-col gap-4">
      <Button variant="ghost" size="sm" className="w-fit" onClick={() => navigate('/admin/companies')}>
        ← Back to companies
      </Button>

      <div>
        <h1 className="text-xl font-semibold">{company?.name ?? 'Loading…'}</h1>
        <p className="text-sm text-muted-foreground">{company?.code}</p>
      </div>

      <DivisionsList companyId={id} />
    </div>
  )
}
