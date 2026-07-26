import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { mapApiError } from '@/lib/formErrors'
import { getCompanies } from '@/api/company'
import { getDivisionsByCompany } from '@/api/division'
import type { RegisterUserInput } from '@/api/user'

// Mirrors backend/src/modules/auth/auth.validation.ts's registerSchema.
// ADMIN is deliberately not offered here -- this dialog is scoped to
// Staff/Supervisor management per the feature's stated scope.
const registerSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.email('Invalid email format'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    phone: z.string().optional(),
    role: z.enum(['SUPERVISOR', 'STAFF']),
    company_id: z.string().optional(),
    division_id: z.string().optional(),
  })
  .refine((data) => data.role !== 'STAFF' || !!data.company_id, {
    message: 'Company is required for STAFF',
    path: ['company_id'],
  })
  .refine((data) => data.role !== 'STAFF' || !!data.division_id, {
    message: 'Division is required for STAFF',
    path: ['division_id'],
  })

type RegisterFormInput = z.infer<typeof registerSchema>

interface RegisterUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (input: RegisterUserInput) => Promise<void>
}

export function RegisterUserDialog({ open, onOpenChange, onSubmit }: RegisterUserDialogProps) {
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: 'STAFF' },
  })

  const role = watch('role')
  const selectedCompanyId = watch('company_id')

  useEffect(() => {
    if (open) {
      setFormError(null)
      reset({ name: '', email: '', password: '', phone: '', role: 'STAFF', company_id: '', division_id: '' })
    }
  }, [open, reset])

  const { data: companies } = useQuery({
    queryKey: ['admin', 'companies', 'all'],
    queryFn: () => getCompanies({ limit: 100 }),
    enabled: open && role === 'STAFF',
  })

  const { data: divisions } = useQuery({
    queryKey: ['admin', 'companies', selectedCompanyId, 'divisions', 'all'],
    queryFn: () => getDivisionsByCompany(Number(selectedCompanyId), { limit: 100 }),
    enabled: open && role === 'STAFF' && !!selectedCompanyId,
  })

  const submit = async (data: RegisterFormInput) => {
    setFormError(null)
    try {
      await onSubmit({
        name: data.name,
        email: data.email,
        password: data.password,
        phone: data.phone || undefined,
        role: data.role,
        company_id: data.role === 'STAFF' ? Number(data.company_id) : undefined,
        division_id: data.role === 'STAFF' ? Number(data.division_id) : undefined,
      })
      onOpenChange(false)
    } catch (err) {
      const { fieldErrors, formError: topError } = mapApiError(err)
      for (const [field, message] of Object.entries(fieldErrors)) {
        setError(field as keyof RegisterFormInput, { message })
      }
      if (topError) setFormError(topError)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Register Staff or Supervisor</DialogTitle>
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
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" {...register('password')} />
            {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" {...register('phone')} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="role">Role</Label>
            <Controller
              name="role"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="role" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STAFF">Staff</SelectItem>
                    <SelectItem value="SUPERVISOR">Supervisor</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {role === 'STAFF' && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="company_id">Company</Label>
                <Controller
                  name="company_id"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="company_id" className="w-full">
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
                {errors.company_id && (
                  <p className="text-sm text-destructive">{errors.company_id.message}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="division_id">Division</Label>
                <Controller
                  name="division_id"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange} disabled={!selectedCompanyId}>
                      <SelectTrigger id="division_id" className="w-full">
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
                {errors.division_id && (
                  <p className="text-sm text-destructive">{errors.division_id.message}</p>
                )}
              </div>
            </>
          )}

          {formError && <p className="text-sm text-destructive">{formError}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Registering…' : 'Register'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
