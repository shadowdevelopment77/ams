import { Request, Response, NextFunction } from 'express'
import { sendError } from '../utils/error.response/response'

export const roleMiddleware = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return sendError(res, 'Not authenticated', 401)
    if (!allowedRoles.includes(req.user.role)) return sendError(res, 'Access denied', 403)
    next()
  }
}