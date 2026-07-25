import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
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
import { getDivision } from '@/api/division'
import {
  getShifts,
  createShift,
  updateShift,
  deleteShift,
  type Shift,
  type ShiftInput,
} from '@/api/shift'
import {
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  type ChecklistTemplate,
} from '@/api/checklist'
import { ShiftFormDialog } from './ShiftFormDialog'
import { TemplateFormDialog } from './TemplateFormDialog'

export function DivisionDetailPage() {
  const { companyId, divisionId } = useParams<{ companyId: string; divisionId: string }>()
  const companyIdNum = Number(companyId)
  const divisionIdNum = Number(divisionId)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: division } = useQuery({
    queryKey: ['admin', 'divisions', divisionIdNum],
    queryFn: () => getDivision(divisionIdNum),
  })

  // ── Shifts ──
  const shiftsKey = ['admin', 'divisions', divisionIdNum, 'shifts'] as const
  const { data: shifts, isLoading: shiftsLoading } = useQuery({
    queryKey: shiftsKey,
    queryFn: () => getShifts(companyIdNum, divisionIdNum),
  })

  const [shiftFormOpen, setShiftFormOpen] = useState(false)
  const [editingShift, setEditingShift] = useState<Shift | null>(null)
  const [shiftDeleteTarget, setShiftDeleteTarget] = useState<Shift | null>(null)
  const [shiftDeleteError, setShiftDeleteError] = useState<string | null>(null)
  const [isDeletingShift, setIsDeletingShift] = useState(false)

  const invalidateShifts = () => queryClient.invalidateQueries({ queryKey: shiftsKey })

  const handleShiftSubmit = async (input: Omit<ShiftInput, 'company_id' | 'division_id'>) => {
    if (editingShift) {
      await updateShift(editingShift.id, input)
    } else {
      await createShift({ ...input, company_id: companyIdNum, division_id: divisionIdNum })
    }
    await invalidateShifts()
  }

  const handleShiftDelete = async () => {
    if (!shiftDeleteTarget) return
    setShiftDeleteError(null)
    setIsDeletingShift(true)
    try {
      await deleteShift(shiftDeleteTarget.id)
      await invalidateShifts()
      setShiftDeleteTarget(null)
    } catch (err) {
      setShiftDeleteError(err instanceof ApiError ? err.message : 'Something went wrong')
    } finally {
      setIsDeletingShift(false)
    }
  }

  // ── Checklist templates ──
  const templatesKey = ['admin', 'divisions', divisionIdNum, 'templates'] as const
  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: templatesKey,
    queryFn: () => getTemplates(companyIdNum, divisionIdNum),
  })

  const [templateFormOpen, setTemplateFormOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<ChecklistTemplate | null>(null)
  const [templateDeleteTarget, setTemplateDeleteTarget] = useState<ChecklistTemplate | null>(null)
  const [templateDeleteError, setTemplateDeleteError] = useState<string | null>(null)
  const [isDeletingTemplate, setIsDeletingTemplate] = useState(false)

  const invalidateTemplates = () => queryClient.invalidateQueries({ queryKey: templatesKey })

  const handleTemplateSubmit = async (input: { title: string }) => {
    if (editingTemplate) {
      await updateTemplate(editingTemplate.id, input)
    } else {
      await createTemplate({ ...input, company_id: companyIdNum, division_id: divisionIdNum })
    }
    await invalidateTemplates()
  }

  const handleTemplateDelete = async () => {
    if (!templateDeleteTarget) return
    setTemplateDeleteError(null)
    setIsDeletingTemplate(true)
    try {
      await deleteTemplate(templateDeleteTarget.id)
      await invalidateTemplates()
      setTemplateDeleteTarget(null)
    } catch (err) {
      setTemplateDeleteError(err instanceof ApiError ? err.message : 'Something went wrong')
    } finally {
      setIsDeletingTemplate(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Button
        variant="ghost"
        size="sm"
        className="w-fit"
        onClick={() => navigate(`/admin/companies/${companyIdNum}`)}
      >
        ← Back to divisions
      </Button>

      <div>
        <h1 className="text-xl font-semibold">{division?.name ?? 'Loading…'}</h1>
        <p className="text-sm text-muted-foreground">
          Late tolerance: {division?.late_tolerance_minutes ?? 0} min
        </p>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Shifts</h2>
        <Button
          onClick={() => {
            setEditingShift(null)
            setShiftFormOpen(true)
          }}
        >
          New Shift
        </Button>
      </div>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Start</TableHead>
              <TableHead>End</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shiftsLoading &&
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={5}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              ))}

            {!shiftsLoading && shifts?.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No shifts yet.
                </TableCell>
              </TableRow>
            )}

            {shifts?.map((shift) => (
              <TableRow key={shift.id}>
                <TableCell className="font-medium">{shift.name}</TableCell>
                <TableCell>{shift.start_time}</TableCell>
                <TableCell>{shift.end_time}</TableCell>
                <TableCell>
                  <Badge variant={shift.is_active ? 'default' : 'secondary'}>
                    {shift.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingShift(shift)
                      setShiftFormOpen(true)
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => {
                      setShiftDeleteError(null)
                      setShiftDeleteTarget(shift)
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

      <div className="mt-4 flex items-center justify-between">
        <h2 className="text-lg font-medium">Checklist Templates</h2>
        <Button
          onClick={() => {
            setEditingTemplate(null)
            setTemplateFormOpen(true)
          }}
        >
          New Template
        </Button>
      </div>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templatesLoading &&
              Array.from({ length: 2 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={3}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              ))}

            {!templatesLoading && templates?.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  No checklist templates yet.
                </TableCell>
              </TableRow>
            )}

            {templates?.map((template) => (
              <TableRow key={template.id}>
                <TableCell className="font-medium">
                  <Link
                    to={`/admin/companies/${companyIdNum}/divisions/${divisionIdNum}/checklists/${template.id}`}
                    className="hover:underline"
                  >
                    {template.title}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant={template.is_active ? 'default' : 'secondary'}>
                    {template.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingTemplate(template)
                      setTemplateFormOpen(true)
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => {
                      setTemplateDeleteError(null)
                      setTemplateDeleteTarget(template)
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

      <ShiftFormDialog
        open={shiftFormOpen}
        onOpenChange={setShiftFormOpen}
        shift={editingShift}
        onSubmit={handleShiftSubmit}
      />

      <ConfirmDialog
        open={!!shiftDeleteTarget}
        onOpenChange={(open) => !open && setShiftDeleteTarget(null)}
        title={`Delete ${shiftDeleteTarget?.name}?`}
        onConfirm={handleShiftDelete}
        isConfirming={isDeletingShift}
        error={shiftDeleteError}
      />

      <TemplateFormDialog
        open={templateFormOpen}
        onOpenChange={setTemplateFormOpen}
        template={editingTemplate}
        onSubmit={handleTemplateSubmit}
      />

      <ConfirmDialog
        open={!!templateDeleteTarget}
        onOpenChange={(open) => !open && setTemplateDeleteTarget(null)}
        title={`Delete ${templateDeleteTarget?.title}?`}
        description="Items under this template will be removed too."
        onConfirm={handleTemplateDelete}
        isConfirming={isDeletingTemplate}
        error={templateDeleteError}
      />
    </div>
  )
}
