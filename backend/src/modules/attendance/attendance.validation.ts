import { z } from "zod"

export const checkInSchema = z.object({
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
})

export const checkOutSchema = z.object({
  attendance_id: z.coerce.number(),
  early_leave_reason: z.string().optional(),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
})

export const absentRequestSchema = z.object({
  reason: z.string().min(5, "Reason must be at least 5 characters"),
  proof_url: z.string().optional(),
})

export const visitLogSchema = z.object({
  company_id: z.number(),
  notes: z.string().optional(),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
})

export type CheckInInput = z.infer<typeof checkInSchema>
export type CheckOutInput = z.infer<typeof checkOutSchema>
export type AbsentRequestInput = z.infer<typeof absentRequestSchema>
export type VisitLogInput = z.infer<typeof visitLogSchema>