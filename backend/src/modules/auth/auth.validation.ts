import {z} from "zod"
import { Request, Response, NextFunction } from 'express'
import { sendError } from '../../utils/error.response/response'

const registerSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.email("Invalid email format"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    phone: z.string().optional(),
    role: z.string().min(1, "Role is required").transform((val) => val.toUpperCase()),
    division_id: z.number().optional(),
    company_id: z.number().optional(),
    }).superRefine((data, ctx) => {
  if (data.role === 'ADMIN' || data.role === 'SUPERVISOR') {
    if (data.company_id !== undefined || data.division_id !== undefined) {
      ctx.addIssue({
        code: 'custom',
        message: `${data.role} cannot be assigned a company or division`,
        path: ['company_id'],
      })
    }
  }

  if (data.role === 'STAFF') {
    if (data.company_id === undefined) {
      ctx.addIssue({ code: 'custom', message: 'STAFF must be assigned a company', path: ['company_id'] })
    }
    if (data.division_id === undefined) {
      ctx.addIssue({ code: 'custom', message: 'STAFF must be assigned a division', path: ['division_id'] })
    }
  }
})

const loginSchema = z.object({
        email: z.email("Invalid email format"),
        password: z.string().min(1, "Password is required"),
    })

    export type RegisterInput = z.infer<typeof registerSchema>
    export type LoginInput = z.infer<typeof loginSchema>


export const validateRegister = (req: Request, res: Response, next: NextFunction) => {
  const result = registerSchema.safeParse(req.body)
  if (!result.success) return sendError(res, 'Validation failed', 400, result.error.issues)
  req.body = result.data
  next()
}

export const validateLogin = (req: Request, res: Response, next: NextFunction) => {
  const result = loginSchema.safeParse(req.body)
  if (!result.success) return sendError(res, 'Validation failed', 400, result.error.issues)
  req.body = result.data
  next()
}