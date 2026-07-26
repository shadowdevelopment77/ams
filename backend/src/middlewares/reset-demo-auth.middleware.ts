import { Request, Response, NextFunction } from 'express'
import { sendError } from '../utils/error.response/response'

// Guards POST /api/admin/reset-demo -- called by an automated scheduler
// (GitHub Actions), not a logged-in user, so this checks a shared secret
// instead of a session (authMiddleware/roleMiddleware don't apply here).
export function resetDemoAuth(req: Request, res: Response, next: NextFunction) {
  const expected = process.env.RESET_DEMO_SECRET
  const header = req.headers.authorization
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined

  if (!expected || !token || token !== expected) {
    return sendError(res, 'Unauthorized', 401)
  }
  next()
}
