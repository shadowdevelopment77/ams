import { z } from 'zod'
import { Request, Response, NextFunction } from 'express'
import { sendError } from '../../utils/error.response/response'

const createVisitLogSchema = z.object({
  company_id: z.coerce.number({ error: 'Company is required' }),
  latitude:   z.coerce.number({ error: 'Location is required' }),
  longitude:  z.coerce.number({ error: 'Location is required' }),
  notes:      z.string().optional(),
})

export type CreateVisitLogInput = z.infer<typeof createVisitLogSchema>

export const validateCreateVisitLog = (req: Request, res: Response, next: NextFunction) => {
  const result = createVisitLogSchema.safeParse(req.body)
  if (!result.success) return sendError(res, 'Validation failed', 400, result.error.issues)
  req.body = result.data
  next()
}

export const visitLogQuerySchema = z.object({
  date:  z.coerce.date().optional(),
  page:  z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
})