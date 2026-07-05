import { z } from "zod"
import { Request, Response, NextFunction } from "express"
import { sendError } from "../../utils/error.response/response"




const moveCompanySchema = z.object({
  company_id: z.number({ error: 'Company is required' }),
  division_id: z.number({ error: 'Division is required' }),
})


export type MoveCompanyInput = z.infer<typeof moveCompanySchema>

export const validateMoveCompany = (req: Request, res: Response, next: NextFunction) => {
  const result = moveCompanySchema.safeParse(req.body)
  if (!result.success) return sendError(res, 'Validation failed', 400, result.error.issues)
  req.body = result.data
  next()
}
