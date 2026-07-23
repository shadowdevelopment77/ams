import { ZodType } from "zod"
import { Request, Response, NextFunction } from "express"
import { sendError } from "../utils/error.response/response"

export const validateQuery = (schema: ZodType) =>
  (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query)
    if (!result.success) return sendError(res, "Validation failed", 400, result.error.issues)
    next()
  }
