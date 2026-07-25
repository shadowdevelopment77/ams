// Lets someone testing STAFF/SUPERVISOR flows from a desktop browser opt
// into being treated as mobile, without weakening the real mobile-only
// gate for actual use -- this only ever short-circuits useIsMobile() when
// deliberately turned on via the login page checkbox (see LoginPage.tsx),
// and stays visible via VirtualMobileBanner so it's never silently left on.
const KEY = 'ams:virtualMobile'

export function isVirtualMobileEnabled(): boolean {
  return localStorage.getItem(KEY) === 'true'
}

export function setVirtualMobile(enabled: boolean): void {
  if (enabled) {
    localStorage.setItem(KEY, 'true')
  } else {
    localStorage.removeItem(KEY)
  }
}
