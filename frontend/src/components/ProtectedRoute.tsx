import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useMe } from '@/hooks/useMe'
import { useIsMobile } from '@/hooks/useIsMobile'
import { MobileOnlyGate } from '@/components/MobileOnlyGate'
import { VirtualMobileBanner } from '@/components/VirtualMobileBanner'
import { isVirtualMobileEnabled } from '@/lib/virtualMobile'
import type { Role } from '@/api/auth'

interface ProtectedRouteProps {
  allow: Role[]
  // See docs/superpowers/plans/2026-07-23-frontend-phase3-device-gate.md —
  // SUPERVISOR/STAFF are mobile-only so the camera-capture photo screens
  // can't be bypassed via a desktop file picker. ADMIN never sets this.
  requireMobile?: boolean
  children: ReactNode
}

export function ProtectedRoute({ allow, requireMobile, children }: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated } = useMe()
  const isMobile = useIsMobile()

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

  if (requireMobile && !isMobile) {
    return <MobileOnlyGate />
  }

  if (requireMobile && isVirtualMobileEnabled()) {
    return (
      <>
        <VirtualMobileBanner />
        {children}
      </>
    )
  }

  return <>{children}</>
}
