import { createBrowserRouter } from 'react-router-dom'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { LoginPage } from '@/features/auth/LoginPage'
import { DashboardStub } from '@/features/attendance/DashboardStub'

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute allow={['STAFF']} requireMobile>
        <DashboardStub />
      </ProtectedRoute>
    ),
  },
])
