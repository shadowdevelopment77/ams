import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { mapApiError } from '@/lib/formErrors'
import { getCompanies } from '@/api/company'
import { getDivisionsByCompany } from '@/api/division'

const moveSchema = z.object({
  company_id: z.string().min(1, 'Company is required'),
  division_id: z.string().min(1, 'Division is required'),
})

type MoveFormInput = z.infer<typeof moveSchema>

interface MoveCompanyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: { id: string; name: string } | null
  onSubmit: (companyId: number, divisionId: number) => Promise<void>
}

export function MoveCompanyDialog({ open, onOpenChange, user, onSubmit }: MoveCompanyDialogProps) {
  const [formError, setFormError] = useState<string | null>(null)

  const {
    handleSubmit,
    reset,
    watch,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<MoveFormInput>({
    resolver: zodResolver(moveSchema),
    defaultValues: { company_id: '', division_id: '' },
  })

  const selectedCompanyId = watch('company_id')

  useEffect(() => {
    if (open) {
      setFormError(null)
      reset({ company_id: '', division_id: '' })
    }
  }, [open, reset])

  const { data: companies } = useQuery({
    queryKey: ['admin', 'companies', 'all'],
    queryFn: () => getCompanies({ limit: 100 }),
    enabled: open,
  })

  const { data: divisions } = useQuery({
    queryKey: ['admin', 'companies', selectedCompanyId, 'divisions', 'all'],
    queryFn: () => getDivisionsByCompany(Number(selectedCompanyId), { limit: 100 }),
    enabled: open && !!selectedCompanyId,
  })

  const submit = async (data: MoveFormInput) => {
    setFormError(null)
    try {
      await onSubmit(Number(data.company_id), Number(data.division_id))
      onOpenChange(false)
    } catch (err) {
      const { fieldErrors, formError: topError } = mapApiError(err)
      for (const [field, message] of Object.entries(fieldErrors)) {
        setError(field as keyof MoveFormInput, { message })
      }
      if (topError) setFormError(topError)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move {user?.name} to a different company</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(submit)} noValidate className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="move_company_id">Company</Label>
            <Controller
              name="company_id"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(v) => {
                    field.onChange(v)
                    reset({ company_id: v ?? '', division_id: '' })
                  }}
                >
                  <SelectTrigger id="move_company_id" className="w-full">
                    {/* Base UI's SelectValue shows the raw value, not the
                        selected item's rendered label, unless told how to
                        map one to the other -- unlike Radix's version. */}
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
              )}
            />
            {errors.company_id && <p className="text-sm text-destructive">{errors.company_id.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="move_division_id">Division</Label>
            <Controller
              name="division_id"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={!selectedCompanyId}>
                  <SelectTrigger id="move_division_id" className="w-full">
                    <SelectValue>
                      {(value: string | null) =>
                        value ? divisions?.data.find((d) => String(d.id) === value)?.name : 'Select a division'
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {divisions?.data.map((d) => (
                      <SelectItem key={d.id} value={String(d.id)}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.division_id && <p className="text-sm text-destructive">{errors.division_id.message}</p>}
          </div>

          {formError && <p className="text-sm text-destructive">{formError}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Moving…' : 'Move'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
