import {z} from "zod"
import { Request, Response, NextFunction } from 'express'
import { sendError } from '../../utils/error.response/response'

const registerSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.email("Invalid email format"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    phone: z.string().optional(),
    role: z.string().min(1, "Role is required"),
    division_id: z.number().optional(),
    company_id: z.number().optional(),
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