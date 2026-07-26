import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useMe } from '@/hooks/useMe'
import { useLogout } from '@/hooks/useLogout'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/admin/companies', label: 'Companies' },
  { to: '/admin/staff', label: 'Staff' },
  { to: '/admin/attendance', label: 'Attendance' },
  { to: '/admin/checklists', label: 'Checklists' },
  { to: '/admin/visits', label: 'Visits' },
]

export function AdminLayout() {
  const { user } = useMe()
  const logout = useLogout()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    await logout()
  }

  return (
    <div className="flex min-h-svh">
      <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-muted/30 p-4">
        <p className="mb-6 px-2 text-lg font-semibold">AMS Admin</p>
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'rounded-md px-2 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground',
                  isActive && 'bg-muted text-foreground'
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border px-6 py-3">
          <span className="text-sm text-muted-foreground">Signed in as {user?.name}</span>
          <Button variant="outline" size="sm" onClick={handleLogout} disabled={isLoggingOut}>
            Log out
          </Button>
        </header>
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
