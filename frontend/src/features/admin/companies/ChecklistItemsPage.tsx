import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
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
  getItemsByTemplate,
  createItem,
  updateItem,
  deleteItem,
  type ChecklistItem,
} from '@/api/checklist'
import { ItemFormDialog } from './ItemFormDialog'

export function ChecklistItemsPage() {
  const { companyId, divisionId, templateId } = useParams<{
    companyId: string
    divisionId: string
    templateId: string
  }>()
  const templateIdNum = Number(templateId)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const itemsKey = ['admin', 'templates', templateIdNum, 'items'] as const
  const { data: items, isLoading } = useQuery({
    queryKey: itemsKey,
    queryFn: () => getItemsByTemplate(templateIdNum, { limit: 100 }),
  })

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ChecklistItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ChecklistItem | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const invalidate = () => queryClient.invalidateQueries({ queryKey: itemsKey })

  const nextOrderNo = (items?.data.length ?? 0) + 1

  const handleSubmit = async (input: { description: string; order_no: number }) => {
    if (editing) {
      await updateItem(editing.id, { description: input.description, order_no: input.order_no })
    } else {
      await createItem({ ...input, template_id: templateIdNum })
    }
    await invalidate()
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleteError(null)
    setIsDeleting(true)
    try {
      await deleteItem(deleteTarget.id)
      await invalidate()
      setDeleteTarget(null)
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : 'Something went wrong')
    } finally {
      setIsDeleting(false)
    }
  }

  const sortedItems = items?.data.slice().sort((a, b) => a.order_no - b.order_no)

  return (
    <div className="flex flex-col gap-4">
      <Button
        variant="ghost"
        size="sm"
        className="w-fit"
        onClick={() => navigate(`/admin/companies/${companyId}/divisions/${divisionId}`)}
      >
        ← Back to division
      </Button>

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Checklist Items</h1>
        <Button
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
        >
          New Item
        </Button>
      </div>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Order</TableHead>
              <TableHead>Description</TableHead>
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

            {!isLoading && sortedItems?.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  No checklist items yet.
                </TableCell>
              </TableRow>
            )}

            {sortedItems?.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.order_no}</TableCell>
                <TableCell className="font-medium">{item.description}</TableCell>
                <TableCell>
                  <Badge variant={item.is_active ? 'default' : 'secondary'}>
                    {item.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditing(item)
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
                      setDeleteTarget(item)
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

      <ItemFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        item={editing}
        nextOrderNo={nextOrderNo}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Delete "${deleteTarget?.description}"?`}
        onConfirm={handleDelete}
        isConfirming={isDeleting}
        error={deleteError}
      />
    </div>
  )
}
