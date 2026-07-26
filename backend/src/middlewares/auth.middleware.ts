import { Request, Response, NextFunction } from 'express'
import { sendError } from '../utils/error.response/response'
import { sessionRepository, userRepository } from '../repositories/index.repositories';

export interface AuthUser {
  id:          string
  role:        string
  companyId?:  number
  divisionId?: number
}

export type SessionResolution =
  | { ok: true; user: AuthUser; sessionId: string }
  | { ok: false; reason: 'no_session' | 'invalid_session' | 'expired' | 'no_role' }

// Shared by authMiddleware (rejects on failure) and resolveUser (never rejects).
export async function resolveSessionUser(req: Request): Promise<SessionResolution> {
  const sessionId = req.cookies?.sessionId
  if (!sessionId) return { ok: false, reason: 'no_session' }

  const session = await sessionRepository.findById(sessionId)
  if (!session) return { ok: false, reason: 'invalid_session' }

  // Read-only: deleting the expired row is the rejecting caller's job, not this shared function's.
  if (session.expires_at < new Date()) {
    return { ok: false, reason: 'expired' }
  }

  const user = await userRepository.findById(session.user_id)
  if (!user) return { ok: false, reason: 'invalid_session' }

  const roleResult = await userRepository.findRoleByUserId(user.id)
  const companyRole = roleResult.data[0]
  if (!companyRole) return { ok: false, reason: 'no_role' }

  return {
    ok: true,
    sessionId,
    user: {
      id:         user.id,
      role:       companyRole.userRole.name,
      companyId:  companyRole.company_id  ?? undefined,
      divisionId: companyRole.division_id ?? undefined,
    },
  }
}

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = await resolveSessionUser(req)
    if (!result.ok) {
      if (result.reason === 'no_role') return sendError(res, 'User has no role assigned', 403)
      if (result.reason === 'expired') {
        const sessionId = req.cookies?.sessionId
        if (sessionId) await sessionRepository.delete(sessionId)
        return sendError(res, 'Session expired', 401)
      }
      return sendError(res, 'Not authenticated', 401)
    }

    req.user = result.user
    req.sessionId = result.sessionId

    next()
  } catch (err) {
    return sendError(res, 'Internal server error', 500)
  }
}
