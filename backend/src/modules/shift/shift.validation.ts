import { z } from "zod"

export const createShiftSchema = z.object({
  division_id: z.number(),
  company_id: z.number(),
  name: z.string().min(2),
  start_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Format must be HH:MM"),
  end_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Format must be HH:MM"),
  notify_before_minutes: z.number().default(30),
})

export const updateShiftSchema = createShiftSchema.partial().omit({ division_id: true, company_id: true })

export type CreateShiftInput = z.infer<typeof createShiftSchema>
export type UpdateShiftInput = z.infer<typeof updateShiftSchema>