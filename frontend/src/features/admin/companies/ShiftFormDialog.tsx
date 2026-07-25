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
import type { Shift, ShiftInput } from '@/api/shift'

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/

// Mirrors backend/src/modules/shift/shift.validation.ts.
const shiftSchema = z.object({
  name: z.string().min(1, 'Shift name is required'),
  start_time: z.string().regex(timeRegex, 'Start time must be HH:mm format'),
  end_time: z.string().regex(timeRegex, 'End time must be HH:mm format'),
})

type ShiftFormInput = z.infer<typeof shiftSchema>

interface ShiftFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  shift?: Shift | null
  onSubmit: (input: Omit<ShiftInput, 'company_id' | 'division_id'>) => Promise<void>
}

export function ShiftFormDialog({ open, onOpenChange, shift, onSubmit }: ShiftFormDialogProps) {
  const [formError, setFormError] = useState<string | null>(null)
  const isEdit = !!shift

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ShiftFormInput>({ resolver: zodResolver(shiftSchema) })

  useEffect(() => {
    if (open) {
      setFormError(null)
      reset({
        name: shift?.name ?? '',
        start_time: shift?.start_time ?? '',
        end_time: shift?.end_time ?? '',
      })
    }
  }, [open, shift, reset])

  const submit = async (data: ShiftFormInput) => {
    setFormError(null)
    try {
      await onSubmit(data)
      onOpenChange(false)
    } catch (err) {
      const { fieldErrors, formError: topError } = mapApiError(err)
      for (const [field, message] of Object.entries(fieldErrors)) {
        setError(field as keyof ShiftFormInput, { message })
      }
      if (topError) setFormError(topError)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Shift' : 'New Shift'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(submit)} noValidate className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="start_time">Start time</Label>
            <Input id="start_time" placeholder="07:00" {...register('start_time')} />
            {errors.start_time && (
              <p className="text-sm text-destructive">{errors.start_time.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="end_time">End time</Label>
            <Input id="end_time" placeholder="15:00" {...register('end_time')} />
            {errors.end_time && <p className="text-sm text-destructive">{errors.end_time.message}</p>}
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
