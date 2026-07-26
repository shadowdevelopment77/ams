import { Request, Response, NextFunction } from 'express'
import { resolveSessionUser } from './auth.middleware'

// Best-effort session resolution mounted ahead of apiLimiter so it can key by
// user id instead of raw IP. Never rejects -- route-level authMiddleware still
// enforces the real auth check.
export const resolveUser = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const result = await resolveSessionUser(req)
    if (result.ok) {
      req.user = result.user
      req.sessionId = result.sessionId
    }
  } catch {
    // never block a request
  }
  next()
}
