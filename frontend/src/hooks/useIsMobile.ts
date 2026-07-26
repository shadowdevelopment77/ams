// A workflow guardrail, not a security boundary -- both signals are
// client-controlled and can be spoofed via devtools. This only stops
// accidental desktop use (the photo-capture-via-file-picker mismatch).

import { isVirtualMobileEnabled } from '@/lib/virtualMobile'

// Not every browser implements the Client Hints API yet (Safari, Firefox
// don't), so this is typed as an optional, non-standard property.
interface NavigatorWithUAData extends Navigator {
  userAgentData?: { mobile: boolean }
}

const MOBILE_UA_PATTERN = /Android|iPhone|iPad|iPod/i

export function useIsMobile(): boolean {
  // Deliberate opt-in override for testing STAFF/SUPERVISOR flows from a
  // desktop browser (see virtualMobile.ts) -- checked first so it can only
  // ever make this return true, never bypass a genuine mobile detection.
  if (isVirtualMobileEnabled()) {
    return true
  }

  const nav = navigator as NavigatorWithUAData

  if (nav.userAgentData) {
    return nav.userAgentData.mobile
  }

  return MOBILE_UA_PATTERN.test(navigator.userAgent)
}
