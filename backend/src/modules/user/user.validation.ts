import { z } from "zod"
import { Request, Response, NextFunction } from "express"
import { sendError } from "../../utils/error.response/response"


const moveCompanySchema = z.object({
  company_id: z.number({ error: 'Company is required' }),
  division_id: z.number({ error: 'Division is required' }),
})

// Deliberately excludes password and role — this is a profile-edit endpoint,
// not an account-security or role-change endpoint.
const updateUserSchema = z.object({
  name:  z.string().min(2).optional(),
  email: z.email().optional(),
  phone: z.string().optional(),
})


export type MoveCompanyInput = z.infer<typeof moveCompanySchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>

export const validateMoveCompany = (req: Request, res: Response, next: NextFunction) => {
  const result = moveCompanySchema.safeParse(req.body)
  if (!result.success) return sendError(res, 'Validation failed', 400, result.error.issues)
  req.body = result.data
  next()
}

export const validateUpdateUser = (req: Request, res: Response, next: NextFunction) => {
  const result = updateUserSchema.safeParse(req.body)
  if (!result.success) return sendError(res, 'Validation failed', 400, result.error.issues)
  req.body = result.data
  next()
}
