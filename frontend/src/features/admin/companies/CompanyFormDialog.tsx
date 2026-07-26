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
import type { Company, CompanyInput } from '@/api/company'

// Mirrors backend/src/modules/company/company.validation.ts's
// createCompanySchema -- used for both create and edit, since the backend's
// update schema is just this made partial (sending the full shape on edit
// is still valid). `code` is deliberately absent -- it's auto-generated
// server-side from `name` and never user-set.
const companySchema = z
  .object({
    name: z.string().min(1, 'Company name is required'),
    address: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
    logo_url: z.string().optional(),
  })
  .refine((data) => !data.email || z.email().safeParse(data.email).success, {
    message: 'Please enter a valid email address',
    path: ['email'],
  })

type CompanyFormInput = z.infer<typeof companySchema>

function emptyToUndefined(value?: string) {
  return value === '' ? undefined : value
}

interface CompanyFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  company?: Company | null
  onSubmit: (input: CompanyInput) => Promise<void>
}

export function CompanyFormDialog({ open, onOpenChange, company, onSubmit }: CompanyFormDialogProps) {
  const [formError, setFormError] = useState<string | null>(null)
  const isEdit = !!company

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CompanyFormInput>({ resolver: zodResolver(companySchema) })

  // Reset the form to the row being edited (or blank, for create) each time
  // the dialog opens -- otherwise a second "New Company" click after editing
  // one would still show the previous company's values.
  useEffect(() => {
    if (open) {
      setFormError(null)
      reset({
        name: company?.name ?? '',
        address: company?.address ?? '',
        phone: company?.phone ?? '',
        email: company?.email ?? '',
        logo_url: company?.logo_url ?? '',
      })
    }
  }, [open, company, reset])

  const submit = async (data: CompanyFormInput) => {
    setFormError(null)
    try {
      await onSubmit({
        name: data.name,
        address: emptyToUndefined(data.address),
        phone: emptyToUndefined(data.phone),
        email: emptyToUndefined(data.email),
        logo_url: emptyToUndefined(data.logo_url),
      })
      onOpenChange(false)
    } catch (err) {
      const { fieldErrors, formError: topError } = mapApiError(err)
      for (const [field, message] of Object.entries(fieldErrors)) {
        setError(field as keyof CompanyFormInput, { message })
      }
      if (topError) setFormError(topError)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Company' : 'New Company'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(submit)} noValidate className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="address">Address</Label>
            <Input id="address" {...register('address')} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" {...register('phone')} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register('email')} />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
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
