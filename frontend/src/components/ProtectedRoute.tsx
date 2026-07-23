import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useMe } from '@/hooks/useMe'
import type { Role } from '@/api/auth'

interface ProtectedRouteProps {
  allow: Role[]
  children: ReactNode
}

export function ProtectedRoute({ allow, children }: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated } = useMe()

  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (!allow.includes(user!.role)) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
