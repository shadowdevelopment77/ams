import { Request, Response, NextFunction } from 'express'
import { sendError } from '../utils/error.response/response'
import { sessionRepository, userRepository } from '../repositories/index.repositories';

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const sessionId = req.cookies?.session_id
    if (!sessionId) return sendError(res, 'Not authenticated', 401)

    const session = await sessionRepository.findById(sessionId)
    if (!session) return sendError(res, 'Not authenticated', 401)

    if (session.expires_at < new Date()) {
      await sessionRepository.delete(sessionId)
      return sendError(res, 'Session expired', 401)
    }

    const user = await userRepository.findById(session.user_id)
    if (!user) return sendError(res, 'Not authenticated', 401)

    const roleResult = await userRepository.findRoleByUserId(user.id)
    const companyRole = roleResult.data[0]
    if (!companyRole) return sendError(res, 'User has no role assigned', 403)

    req.user = {
      id:         user.id,
      role:       companyRole.userRole.name,
      companyId:  companyRole.company_id  ?? undefined,
      divisionId: companyRole.division_id ?? undefined,
    }
    req.sessionId = sessionId

    next()
  } catch (err) {
    return sendError(res, 'Internal server error', 500)
  }
}