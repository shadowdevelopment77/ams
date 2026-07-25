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
import type { ChecklistItem } from '@/api/checklist'

// order_no/requires_photo kept as strings/checkbox at the form layer;
// converted on submit -- same reasoning as DivisionFormDialog's
// late_tolerance_minutes (avoids a z.coerce input/output generic mismatch
// with react-hook-form's resolver types).
const itemSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  order_no: z.string().refine((v) => v !== '' && !isNaN(Number(v)), {
    message: 'Order is required',
  }),
  requires_photo: z.boolean(),
})

type ItemFormInput = z.infer<typeof itemSchema>

interface ItemFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item?: ChecklistItem | null
  nextOrderNo: number
  onSubmit: (input: { description: string; order_no: number; requires_photo: boolean }) => Promise<void>
}

export function ItemFormDialog({ open, onOpenChange, item, nextOrderNo, onSubmit }: ItemFormDialogProps) {
  const [formError, setFormError] = useState<string | null>(null)
  const isEdit = !!item

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ItemFormInput>({ resolver: zodResolver(itemSchema) })

  useEffect(() => {
    if (open) {
      setFormError(null)
      reset({
        description: item?.description ?? '',
        order_no: String(item?.order_no ?? nextOrderNo),
        requires_photo: item?.requires_photo ?? true,
      })
    }
  }, [open, item, nextOrderNo, reset])

  const submit = async (data: ItemFormInput) => {
    setFormError(null)
    try {
      await onSubmit({
        description: data.description,
        order_no: Number(data.order_no),
        requires_photo: data.requires_photo,
      })
      onOpenChange(false)
    } catch (err) {
      const { fieldErrors, formError: topError } = mapApiError(err)
      for (const [field, message] of Object.entries(fieldErrors)) {
        setError(field as keyof ItemFormInput, { message })
      }
      if (topError) setFormError(topError)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Checklist Item' : 'New Checklist Item'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(submit)} noValidate className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Description</Label>
            <Input id="description" {...register('description')} />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="order_no">Order</Label>
            <Input id="order_no" type="number" min={1} {...register('order_no')} />
            {errors.order_no && <p className="text-sm text-destructive">{errors.order_no.message}</p>}
          </div>

          <div className="flex items-center gap-2">
            <input
              id="requires_photo"
              type="checkbox"
              className="size-4 rounded border-input"
              disabled={isEdit}
              {...register('requires_photo')}
            />
            <Label htmlFor="requires_photo" className="font-normal">
              Requires photo
            </Label>
          </div>
          {isEdit && (
            <p className="-mt-2 text-xs text-muted-foreground">
              Photo requirement can't be changed after creation.
            </p>
          )}

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
