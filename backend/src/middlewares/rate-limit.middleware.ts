import rateLimit, { ipKeyGenerator } from 'express-rate-limit'

const isTest = process.env.NODE_ENV === 'test'

// Keyed by authenticated user id (set by resolveUser ahead of this in
// app.ts), falling back to IP for anonymous requests -- keeps everyone
// behind one office router/NAT from sharing a single request budget.
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300, // per-user headroom, not a shared building-wide limit
    message: {success: false, message: 'Too many request, please try again later'},
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.user?.id ?? ipKeyGenerator(req.ip ?? 'unknown'),
    skip: (req) =>
      isTest ||
      // passive "am I logged in" check fired on every navigation/focus -- must not compete with real limits
      (req.method === 'GET' && req.path === '/auth/me'),
})

// Keyed by the submitted email rather than IP -- scopes brute-force
// throttling to "attempts against one account," not "requests from one IP."
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      10,
  message:  { success: false, message: 'Too many login attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders:   false,
  keyGenerator: (req) => req.body?.email?.toLowerCase() || ipKeyGenerator(req.ip ?? 'unknown'),
  skip: () => isTest,
})