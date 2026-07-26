import {z} from 'zod';
import {Request, Response, NextFunction} from 'express';
import {sendError} from '../../utils/error.response/response';

const createCompanySchema = z.object({
    name: z.string().min(1, "Company name is required"),
    code: z.string().min(1).optional(),
    address: z.string().optional(),
    phone: z.string().optional(),
    email: z.email("Please enter a valid email address").optional(),
    logo_url: z.string().optional(),
})

const updateCompanySchema = createCompanySchema.partial().extend({
  is_active: z.boolean().optional(),
})


export type CreateCompanyInput = z.infer<typeof createCompanySchema>
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>

export const validateCreateCompany = (req: Request, res: Response, next: NextFunction) => {
  const result = createCompanySchema.safeParse(req.body)
  if (!result.success) return sendError(res, 'Validation failed', 400, result.error.issues)
  req.body = result.data
  next()
}

export const validateUpdateCompany = (req: Request, res: Response, next: NextFunction) => {
  const result = updateCompanySchema.safeParse(req.body)
  if (!result.success) return sendError(res, 'Validation failed', 400, result.error.issues)
  req.body = result.data
  next()
}