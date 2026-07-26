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
  getDivisionsByCompany,
  createDivision,
  updateDivision,
  deleteDivision,
  type Division,
  type DivisionInput,
} from '@/api/division'
import { DivisionFormDialog } from './DivisionFormDialog'

// Reused by CompanyDetailPage.tsx -- kept parameterized by companyId
// (rather than reading it from the route itself) since a prior version of
// the admin nav also had a top-level Divisions page rendering this.
export function DivisionsList({ companyId }: { companyId: number }) {
  const queryClient = useQueryClient()

  const divisionsKey = ['admin', 'companies', companyId, 'divisions'] as const
  const { data: divisions, isLoading } = useQuery({
    queryKey: divisionsKey,
    queryFn: () => getDivisionsByCompany(companyId, { limit: 100 }),
  })

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Division | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Division | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const invalidate = () => queryClient.invalidateQueries({ queryKey: divisionsKey })

  const handleSubmit = async (input: Omit<DivisionInput, 'company_id'>) => {
    if (editing) {
      await updateDivision(editing.id, input)
    } else {
      await createDivision({ ...input, company_id: companyId })
    }
    await invalidate()
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleteError(null)
    setIsDeleting(true)
    try {
      await deleteDivision(deleteTarget.id)
      await invalidate()
      setDeleteTarget(null)
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : 'Something went wrong')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Divisions</h2>
        <Button
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
        >
          New Division
        </Button>
      </div>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Late tolerance</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={4}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              ))}

            {!isLoading && divisions?.data.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  No divisions yet.
                </TableCell>
              </TableRow>
            )}

            {divisions?.data.map((division) => (
              <TableRow key={division.id}>
                <TableCell className="font-medium">{division.name}</TableCell>
                <TableCell>{division.late_tolerance_minutes} min</TableCell>
                <TableCell>
                  <Badge variant={division.is_active ? 'default' : 'secondary'}>
                    {division.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    render={<Link to={`/admin/companies/${companyId}/divisions/${division.id}`} />}
                  >
                    See more detail →
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditing(division)
                      setFormOpen(true)
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => {
                      setDeleteError(null)
                      setDeleteTarget(division)
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

      <DivisionFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        division={editing}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Delete ${deleteTarget?.name}?`}
        description="This can't be undone. Divisions with active staff assigned can't be deleted."
        onConfirm={handleDelete}
        isConfirming={isDeleting}
        error={deleteError}
      />
    </div>
  )
}
