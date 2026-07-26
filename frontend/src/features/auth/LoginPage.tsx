import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ApiError } from '@/api/client'
import { login } from '@/api/auth'
import { ME_QUERY_KEY } from '@/hooks/useMe'
import { isVirtualMobileEnabled, setVirtualMobile } from '@/lib/virtualMobile'
import { DemoInfoCard } from './DemoInfoCard'

// Mirrors backend/src/modules/auth/auth.validation.ts's loginSchema exactly —
// same validation contract on both sides.
const loginSchema = z.object({
  email: z.email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
})

type LoginInput = z.infer<typeof loginSchema>

export function LoginPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [serverError, setServerError] = useState<string | null>(null)
  // Persists in localStorage (see virtualMobile.ts) -- reflects whatever
  // was left on from a previous session rather than always starting unchecked.
  const [simulateMobile, setSimulateMobile] = useState(() => isVirtualMobileEnabled())

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) })

  const onSubmit = async (data: LoginInput) => {
    setServerError(null)
    try {
      const { user } = await login(data.email, data.password)
      await queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY })
      // Destination depends on role -- `/` is STAFF-only, other roles would just bounce back.
      const destination =
        user.role === 'ADMIN' ? '/admin' : user.role === 'SUPERVISOR' ? '/visits' : '/'
      navigate(destination, { replace: true })
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : 'Something went wrong')
    }
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
        </CardHeader>
        <CardContent>
          {/* noValidate: without it, the browser's native type="email" check
              intercepts submission before react-hook-form/zod ever runs,
              so our own validation message never shows for a malformed
              email -- the browser's own tooltip shows instead, silently. */}
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" {...register('email')} />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                {...register('password')}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            {serverError && <p className="text-sm text-destructive">{serverError}</p>}

            {import.meta.env.DEV && (
              <div className="flex items-center gap-2">
                <input
                  id="simulateMobile"
                  type="checkbox"
                  checked={simulateMobile}
                  onChange={(e) => {
                    setSimulateMobile(e.target.checked)
                    setVirtualMobile(e.target.checked)
                  }}
                  className="h-4 w-4 rounded border-input"
                />
                <Label htmlFor="simulateMobile" className="text-sm font-normal text-muted-foreground">
                  Simulate mobile device (for testing)
                </Label>
              </div>
            )}

            <Button type="submit" disabled={isSubmitting} className="mt-2">
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </CardContent>
      </Card>
      <DemoInfoCard />
    </div>
  )
}
