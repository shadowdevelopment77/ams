import { z } from "zod"
import { Request, Response, NextFunction } from "express"
import { sendError } from "../../utils/error.response/response"


const createDivisionSchema = z.object({
  company_id: z.number(),
  name: z.string().min(2, "Division name is required"),
  late_tolerance_minutes: z.number().min(0, "Late tolerance must be 0 or greater").optional(),
})

const updateDivisionSchema = createDivisionSchema.partial().omit({ company_id: true}).extend({
  is_active: z.boolean().optional(),
})

export type CreateDivisionInput = z.infer<typeof createDivisionSchema>
export type UpdateDivisionInput = z.infer<typeof updateDivisionSchema>

export const validateCreateDivision = (req: Request, res: Response, next: NextFunction) => {
  const result = createDivisionSchema.safeParse(req.body)
  if (!result.success) return sendError(res, 'Validation failed', 400, result.error.issues)
  req.body = result.data
  next()
}
export const validateUpdateDivision = (req: Request, res: Response, next: NextFunction) => {
  const result = updateDivisionSchema.safeParse(req.body)
  if (!result.success) return sendError(res, 'Validation failed', 400, result.error.issues)
  req.body = result.data
  next()
}