import { z } from 'zod'
import { Request, Response, NextFunction } from 'express'
import { sendError } from '../../utils/error.response/response'

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/

const createShiftSchema = z.object({
  company_id:  z.number({ error: 'Company is required' }),
  division_id: z.number({ error: 'Division is required' }),
  name:        z.string().min(1, 'Shift name is required'),
  start_time:  z.string().regex(timeRegex, 'Start time must be HH:mm format'),
  end_time:    z.string().regex(timeRegex, 'End time must be HH:mm format'),
})


const updateShiftSchema = createShiftSchema.partial().extend({
  is_active: z.boolean().optional(),
}).omit({ company_id: true, division_id: true })

export type CreateShiftInput = z.infer<typeof createShiftSchema>
export type UpdateShiftInput = z.infer<typeof updateShiftSchema>

export const validateCreateShift = (req: Request, res: Response, next: NextFunction) => {
  const result = createShiftSchema.safeParse(req.body)
  if (!result.success) return sendError(res, 'Validation failed', 400, result.error.issues)
  req.body = result.data
  next()
}

export const validateUpdateShift = (req: Request, res: Response, next: NextFunction) => {
  const result = updateShiftSchema.safeParse(req.body)
  if (!result.success) return sendError(res, 'Validation failed', 400, result.error.issues)
  req.body = result.data
  next()
}