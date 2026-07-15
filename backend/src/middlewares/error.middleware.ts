// src/middlewares/error.middleware.ts
import { Request, Response, NextFunction } from 'express'
import { sendError,  } from '../utils/error.response/response'
import {AppError} from '../utils/error.response/appError'

export const errorMiddleware = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof AppError) {
    return sendError(res, err.message, err.statusCode)
  }
  console.error(err)  // log unexpected errors
  return sendError(res, 'Internal server error', 500)
}