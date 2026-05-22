import { Request, Response, NextFunction } from "express"
import prisma from "../lib/prisma"
import { sendError } from "../utils/response"

// extend Request so controllers can access req.user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number
        name: string
        email: string
        roles: { company_id: number; role: string; division_id: number | null }[]
      }
    }
  }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  const sessionId = req.cookies?.session_id
  if (!sessionId) return sendError(res, "Unauthorized", 401)

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
  })

  if (!session) return sendError(res, "Unauthorized", 401)
  if (session.expires_at < new Date()) {
    await prisma.session.delete({ where: { id: sessionId } })
    return sendError(res, "Session expired, please login again", 401)
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user_id },
    select: {
      id: true,
      name: true,
      email: true,
      is_active: true,
      is_deleted: true,
      company_roles: {
        select: {
          company_id: true,
          role: true,
          division_id: true,
        },
      },
    },
  })

  if (!user || !user.is_active || user.is_deleted) {
    return sendError(res, "Unauthorized", 401)
  }

  req.user = {
    id: user.id,
    name: user.name,
    email: user.email,
    roles: user.company_roles,
  }

  next()
}

// role guard — usage: requireRole("ADMIN") or requireRole("ADMIN", "SUPERVISOR")
export const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRoles = req.user?.roles.map((r) => r.role) ?? []
    const hasRole = roles.some((role) => userRoles.includes(role))
    if (!hasRole) return sendError(res, "Forbidden", 403)
    next()
  }
}