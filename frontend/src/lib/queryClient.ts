import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      // Without this, every query is stale from the moment it lands, so
      // switching between admin panels (or just refocusing the browser tab)
      // refetches everything from scratch every time -- ordinary navigation
      // was generating well over 100 real requests in minutes and tripping
      // apiLimiter. 30s keeps data reasonably fresh while letting normal
      // back-and-forth navigation reuse what was just fetched.
      staleTime: 30_000,
    },
  },
})
