import { z } from 'zod'
import { Request, Response, NextFunction } from 'express'
import { sendError } from '../../utils/error.response/response'

const checkInSchema = z.object({
  shift_id:   z.number({ error: 'Shift is required' }),
  photo_url:  z.string().min(1, 'Photo is required'),
  latitude:   z.number().optional(),
  longitude:  z.number().optional(),
})

const checkOutSchema = z.object({
  checkout_photo_url: z.string().min(1, 'Checkout photo is required'),
  checkout_latitude:  z.number().optional(),
  checkout_longitude: z.number().optional(),
  early_leave_reason: z.string().optional(),
})

const earlyLeaveReasonSchema = z.object({
  early_leave_reason: z.string().min(1, 'Reason is required'),
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