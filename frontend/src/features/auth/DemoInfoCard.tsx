import { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const DISMISSED_KEY = 'ams_demo_notice_dismissed'

const DEMO_ADMINS = [
  { label: 'Demo Admin 1', email: 'admin.demo1@ams.local', password: 'DemoAdmin123!' },
  { label: 'Demo Admin 2', email: 'admin.demo2@ams.local', password: 'DemoAdmin123!' },
]

export function DemoInfoCard() {
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISSED_KEY) === '1')

  if (dismissed) return null

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, '1')
    setDismissed(true)
  }

  return (
    <Card className="w-full max-w-sm shadow-lg sm:fixed sm:bottom-4 sm:right-4 sm:z-50">
      <CardHeader className="flex-row items-start justify-between">
        <CardTitle>Try the demo</CardTitle>
        <Button variant="ghost" size="icon-sm" onClick={dismiss} aria-label="Dismiss">
          <X />
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        <p className="text-muted-foreground">
          This is a portfolio demo of a workforce attendance system. Feel free to log in and
          explore the admin panel.
        </p>
        <div className="flex flex-col gap-2">
          {DEMO_ADMINS.map((admin) => (
            <div key={admin.email} className="rounded-md bg-muted/50 p-2">
              <p className="font-medium">{admin.label}</p>
              <p className="text-muted-foreground">{admin.email}</p>
              <p className="text-muted-foreground">{admin.password}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Demo data resets automatically every 6 hours.
        </p>
      </CardContent>
    </Card>
  )
}
