import { z } from "zod"

export const assignCompanySchema = z.object({
  user_id: z.number(),
  company_id: z.number(),
  role: z.enum(["ADMIN", "SUPERVISOR"]),
})

export const removeCompanySchema = z.object({
  user_id: z.number(),
  company_id: z.number(),
})

export const moveCompanySchema = z.object({
  user_id: z.number(),
  company_id: z.number(),
  division_id: z.number(),
})

export const removeUserSchema = z.object({
  user_id: z.number(),
})

export type AssignCompanyInput = z.infer<typeof assignCompanySchema>
export type RemoveCompanyInput = z.infer<typeof removeCompanySchema>
export type MoveCompanyInput = z.infer<typeof moveCompanySchema>
export type RemoveUserInput = z.infer<typeof removeUserSchema>
