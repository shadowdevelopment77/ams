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
import type { User } from '@/api/user'

// Mirrors backend/src/modules/user/user.validation.ts's updateUserSchema --
// deliberately profile-only, no password/role fields (backend excludes them
// by design).
const editUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.email().optional(),
  phone: z.string().optional(),
})

type EditUserFormInput = z.infer<typeof editUserSchema>

interface EditUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: User | null
  onSubmit: (input: EditUserFormInput) => Promise<void>
}

export function EditUserDialog({ open, onOpenChange, user, onSubmit }: EditUserDialogProps) {
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<EditUserFormInput>({ resolver: zodResolver(editUserSchema) })

  useEffect(() => {
    if (open) {
      setFormError(null)
      reset({ name: user?.name ?? '', email: user?.email ?? '', phone: user?.phone ?? '' })
    }
  }, [open, user, reset])

  const submit = async (data: EditUserFormInput) => {
    setFormError(null)
    try {
      await onSubmit(data)
      onOpenChange(false)
    } catch (err) {
      const { fieldErrors, formError: topError } = mapApiError(err)
      for (const [field, message] of Object.entries(fieldErrors)) {
        setError(field as keyof EditUserFormInput, { message })
      }
      if (topError) setFormError(topError)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(submit)} noValidate className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register('email')} />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" {...register('phone')} />
          </div>

          {formError && <p className="text-sm text-destructive">{formError}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Save changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
