import { Button } from '@/components/ui/button'
import { setVirtualMobile } from '@/lib/virtualMobile'

// Shown on every mobile-gated route while virtual mobile mode is on, so
// it's never silently forgotten -- reload picks up the real device check
// again immediately (useIsMobile() re-evaluates on every render, not just
// on toggle) rather than needing a fresh login.
export function VirtualMobileBanner() {
  return (
    <div className="flex items-center justify-center gap-3 bg-amber-100 px-4 py-1.5 text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-200">
      <span>Simulating mobile (testing only)</span>
      <Button
        variant="ghost"
        size="sm"
        className="h-5 px-2 text-xs text-amber-900 hover:bg-amber-200 dark:text-amber-200 dark:hover:bg-amber-900"
        onClick={() => {
          setVirtualMobile(false)
          window.location.reload()
        }}
      >
        Turn off
      </Button>
    </div>
  )
}
