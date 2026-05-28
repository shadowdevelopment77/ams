import { Request, Response, NextFunction } from "express"
import { sendError } from "../utils/response"

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error("Unhandled error:", err.message)
  return sendError(res, "Internal server error", 500)
}