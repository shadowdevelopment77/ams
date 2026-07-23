// A workflow guardrail, not a security boundary — see
// docs/superpowers/plans/2026-07-23-frontend-phase3-device-gate.md. Both
// signals are client-controlled and can be spoofed via devtools; this only
// stops accidental desktop use, which is what was actually asked for
// (avoiding the photo-capture-via-file-picker mismatch on desktop).

// Not every browser implements the Client Hints API yet (Safari, Firefox
// don't), so this is typed as an optional, non-standard property.
interface NavigatorWithUAData extends Navigator {
  userAgentData?: { mobile: boolean }
}

const MOBILE_UA_PATTERN = /Android|iPhone|iPad|iPod/i

export function useIsMobile(): boolean {
  const nav = navigator as NavigatorWithUAData

  if (nav.userAgentData) {
    return nav.userAgentData.mobile
  }

  return MOBILE_UA_PATTERN.test(navigator.userAgent)
}
