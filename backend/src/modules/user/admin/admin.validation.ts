import { string, z } from "zod"
import { tr } from "zod/v4/locales/index.js";

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

export const createCompanySchema = z.object({
  name: z.string().min(2),
  code: z.string(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  logo_url: z.string().optional(),
  is_active: z.boolean().default(true),
})

export type AssignCompanyInput = z.infer<typeof assignCompanySchema>
export type RemoveCompanyInput = z.infer<typeof removeCompanySchema>
export type MoveCompanyInput = z.infer<typeof moveCompanySchema>
export type RemoveUserInput = z.infer<typeof removeUserSchema>
export type CreateCompanyInput = z.infer<typeof createCompanySchema>