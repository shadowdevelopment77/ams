import { createBrowserRouter } from 'react-router-dom'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { LoginPage } from '@/features/auth/LoginPage'
import { Dashboard } from '@/features/attendance/Dashboard'
import { CheckIn } from '@/features/attendance/CheckIn'
import { CheckOut } from '@/features/attendance/CheckOut'
import { Checklist } from '@/features/checklist/Checklist'

const staffOnlyMobile = { allow: ['STAFF' as const], requireMobile: true }

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute {...staffOnlyMobile}>
        <Dashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: '/checkin',
    element: (
      <ProtectedRoute {...staffOnlyMobile}>
        <CheckIn />
      </ProtectedRoute>
    ),
  },
  {
    path: '/checklist',
    element: (
      <ProtectedRoute {...staffOnlyMobile}>
        <Checklist />
      </ProtectedRoute>
    ),
  },
  {
    path: '/checkout',
    element: (
      <ProtectedRoute {...staffOnlyMobile}>
        <CheckOut />
      </ProtectedRoute>
    ),
  },
])
