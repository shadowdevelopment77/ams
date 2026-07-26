import { createBrowserRouter, Navigate } from 'react-router-dom'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { LoginPage } from '@/features/auth/LoginPage'
import { Dashboard } from '@/features/attendance/Dashboard'
import { CheckIn } from '@/features/attendance/CheckIn'
import { CheckOut } from '@/features/attendance/CheckOut'
import { Checklist } from '@/features/checklist/Checklist'
import { History } from '@/features/attendance/History'
import { VisitDashboard } from '@/features/visit/VisitDashboard'
import { LogVisit } from '@/features/visit/LogVisit'
import { AdminLayout } from '@/features/admin/AdminLayout'
import { CompaniesPage } from '@/features/admin/companies/CompaniesPage'
import { CompanyDetailPage } from '@/features/admin/companies/CompanyDetailPage'
import { DivisionDetailPage } from '@/features/admin/companies/DivisionDetailPage'
import { ChecklistItemsPage } from '@/features/admin/companies/ChecklistItemsPage'
import { StaffPage } from '@/features/admin/staff/StaffPage'
import { AttendancePage } from '@/features/admin/attendance/AttendancePage'
import { ChecklistsPage } from '@/features/admin/checklist/ChecklistsPage'
import { ChecklistItemPhotosPage } from '@/features/admin/checklist/ChecklistItemPhotosPage'
import { VisitsPage } from '@/features/admin/visits/VisitsPage'

const staffOnlyMobile = { allow: ['STAFF' as const], requireMobile: true }
const supervisorOnlyMobile = { allow: ['SUPERVISOR' as const], requireMobile: true }

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
    path: '/history',
    element: (
      <ProtectedRoute {...staffOnlyMobile}>
        <History />
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
  {
    path: '/visits',
    element: (
      <ProtectedRoute {...supervisorOnlyMobile}>
        <VisitDashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: '/visits/new',
    element: (
      <ProtectedRoute {...supervisorOnlyMobile}>
        <LogVisit />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin',
    element: (
      <ProtectedRoute allow={['ADMIN']}>
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="companies" replace /> },
      { path: 'companies', element: <CompaniesPage /> },
      { path: 'companies/:companyId', element: <CompanyDetailPage /> },
      { path: 'companies/:companyId/divisions/:divisionId', element: <DivisionDetailPage /> },
      {
        path: 'companies/:companyId/divisions/:divisionId/checklists/:templateId',
        element: <ChecklistItemsPage />,
      },
      { path: 'staff', element: <StaffPage /> },
      { path: 'attendance', element: <AttendancePage /> },
      { path: 'checklists', element: <ChecklistsPage /> },
      { path: 'checklists/item/:itemId', element: <ChecklistItemPhotosPage /> },
      { path: 'visits', element: <VisitsPage /> },
    ],
  },
])
