import { z } from 'zod'
import { Request, Response, NextFunction } from 'express'
import { sendError } from '../../utils/error.response/response'

const checkInSchema = z.object({
  shift_id:   z.coerce.number({ error: 'Shift is required' }),
  latitude:   z.coerce.number().optional(),
  longitude:  z.coerce.number().optional(),
})

const checkOutSchema = z.object({
  checkout_latitude:  z.coerce.number().optional(),
  checkout_longitude: z.coerce.number().optional(),
})

const earlyLeaveReasonSchema = z.object({
  early_leave_reason: z.string().min(1, 'Reason is required'),
})

export const attendanceQuerySchema = z.object({
  companyId:  z.coerce.number({ error: 'companyId is required' }),
  divisionId: z.coerce.number({ error: 'divisionId is required' }),
  date:       z.coerce.date().optional(),
  page:       z.coerce.number().optional(),
  limit:      z.coerce.number().optional(),
  statusId:   z.coerce.number().optional(),
})

export type CheckInInput  = z.infer<typeof checkInSchema>
export type CheckOutInput = z.infer<typeof checkOutSchema>
export type EarlyLeaveReasonInput = z.infer<typeof earlyLeaveReasonSchema>


export const validateCheckIn = (req: Request, res: Response, next: NextFunction) => {
  const result = checkInSchema.safeParse(req.body)
  if (!result.success) return sendError(res, 'Validation failed', 400, result.error.issues)
  req.body = result.data
  next()
}

export const validateCheckOut = (req: Request, res: Response, next: NextFunction) => {
  const result = checkOutSchema.safeParse(req.body)
  if (!result.success) return sendError(res, 'Validation failed', 400, result.error.issues)
  req.body = result.data
  next()
}

export const validateEarlyLeaveReason = (req: Request, res: Response, next: NextFunction) => {
  const result = earlyLeaveReasonSchema.safeParse(req.body)
  if (!result.success) return sendError(res, 'Validation failed', 400, result.error.issues)
  req.body = result.data
  next()
}