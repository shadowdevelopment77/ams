import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { mapApiError } from '@/lib/formErrors'
import type { Division, DivisionInput } from '@/api/division'

// Mirrors backend/src/modules/division/division.validation.ts. Kept as a
// string at the form layer (react-hook-form inputs are always strings) and
// converted to a number in submit -- z.coerce here creates an input/output
// type mismatch that useForm's generics don't reconcile cleanly.
const divisionSchema = z.object({
  name: z.string().min(2, 'Division name is required'),
  late_tolerance_minutes: z
    .string()
    .refine((v) => v === '' || (!isNaN(Number(v)) && Number(v) >= 0), {
      message: 'Late tolerance must be 0 or greater',
    }),
})

type DivisionFormInput = z.infer<typeof divisionSchema>

interface DivisionFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  division?: Division | null
  onSubmit: (input: Omit<DivisionInput, 'company_id'>) => Promise<void>
}

export function DivisionFormDialog({ open, onOpenChange, division, onSubmit }: DivisionFormDialogProps) {
  const [formError, setFormError] = useState<string | null>(null)
  const isEdit = !!division

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<DivisionFormInput>({ resolver: zodResolver(divisionSchema) })

  useEffect(() => {
    if (open) {
      setFormError(null)
      reset({
        name: division?.name ?? '',
        late_tolerance_minutes: String(division?.late_tolerance_minutes ?? 0),
      })
    }
  }, [open, division, reset])

  const submit = async (data: DivisionFormInput) => {
    setFormError(null)
    try {
      await onSubmit({
        name: data.name,
        late_tolerance_minutes: data.late_tolerance_minutes === '' ? undefined : Number(data.late_tolerance_minutes),
      })
      onOpenChange(false)
    } catch (err) {
      const { fieldErrors, formError: topError } = mapApiError(err)
      for (const [field, message] of Object.entries(fieldErrors)) {
        setError(field as keyof DivisionFormInput, { message })
      }
      if (topError) setFormError(topError)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Division' : 'New Division'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(submit)} noValidate className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="late_tolerance_minutes">Late tolerance (minutes)</Label>
            <Input
              id="late_tolerance_minutes"
              type="number"
              min={0}
              {...register('late_tolerance_minutes')}
            />
            {errors.late_tolerance_minutes && (
              <p className="text-sm text-destructive">{errors.late_tolerance_minutes.message}</p>
            )}
          </div>

          {formError && <p className="text-sm text-destructive">{formError}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
