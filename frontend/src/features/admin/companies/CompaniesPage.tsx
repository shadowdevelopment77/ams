import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import {
  getCompanies,
  createCompany,
  updateCompany,
  deleteCompany,
  type Company,
  type CompanyInput,
} from '@/api/company'
import { CompanyFormDialog } from './CompanyFormDialog'

const COMPANIES_QUERY_KEY = ['admin', 'companies'] as const

export function CompaniesPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: [...COMPANIES_QUERY_KEY, page],
    queryFn: () => getCompanies({ page, limit: 10 }),
  })

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Company | null>(null)

  const [deleteTarget, setDeleteTarget] = useState<Company | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const invalidate = () => queryClient.invalidateQueries({ queryKey: COMPANIES_QUERY_KEY })

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (company: Company) => {
    setEditing(company)
    setFormOpen(true)
  }

  const handleSubmit = async (input: CompanyInput) => {
    if (editing) {
      await updateCompany(editing.id, input)
    } else {
      await createCompany(input)
    }
    await invalidate()
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleteError(null)
    setIsDeleting(true)
    try {
      await deleteCompany(deleteTarget.id)
      await invalidate()
      setDeleteTarget(null)
    } catch (err) {
      // 409 here means the company still has active staff assigned --
      // surface that exact backend message rather than a generic failure.
      setDeleteError(err instanceof ApiError ? err.message : 'Something went wrong')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Companies</h1>
        <Button onClick={openCreate}>New Company</Button>
      </div>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={5}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              ))}

            {!isLoading && data?.data.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No companies yet.
                </TableCell>
              </TableRow>
            )}

            {data?.data.map((company) => (
              <TableRow key={company.id}>
                <TableCell className="font-medium">{company.name}</TableCell>
                <TableCell>{company.code}</TableCell>
                <TableCell>{company.email ?? '—'}</TableCell>
                <TableCell>
                  <Badge variant={company.is_active ? 'default' : 'secondary'}>
                    {company.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" render={<Link to={`/admin/companies/${company.id}`} />}>
                    See more detail →
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(company)}>
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => {
                      setDeleteError(null)
                      setDeleteTarget(company)
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
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
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

      <CompanyFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        company={editing}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Delete ${deleteTarget?.name}?`}
        description="This can't be undone. Companies with active staff assigned can't be deleted."
        onConfirm={handleDelete}
        isConfirming={isDeleting}
        error={deleteError}
      />
    </div>
  )
}
