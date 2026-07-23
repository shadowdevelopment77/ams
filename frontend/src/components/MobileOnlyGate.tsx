import { Button } from '@/components/ui/button'
import { useLogout } from '@/hooks/useLogout'

export function MobileOnlyGate() {
  const handleLogout = useLogout()

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-4 text-center">
      <h1 className="text-xl font-semibold">Mobile only</h1>
      <p className="max-w-sm text-muted-foreground">
        This app is only available on mobile devices — please open it on your phone.
      </p>
      <Button onClick={handleLogout} variant="outline">
        Logout
      </Button>
    </div>
  )
}
