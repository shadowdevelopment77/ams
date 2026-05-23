import { z } from "zod"

const VALID_DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"] as const

export const createDivisionSchema = z.object({
  company_id: z.number(),
  name: z.string().min(2),
  working_days: z.array(z.enum(VALID_DAYS)).min(1, "At least 1 working day required"),
  late_tolerance_minutes: z.number().default(0),
  has_checklist: z.boolean().default(true),
  has_evidence_photo: z.boolean().default(true),
  has_work_log: z.boolean().default(false),
  min_photo_per_day: z.number().default(1),
  photo_highlight_only: z.boolean().default(false),
})

export const updateDivisionSchema = createDivisionSchema.partial().omit({ company_id: true })

export type CreateDivisionInput = z.infer<typeof createDivisionSchema>
export type UpdateDivisionInput = z.infer<typeof updateDivisionSchema>