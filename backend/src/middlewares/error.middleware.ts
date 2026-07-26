import { Request, Response, NextFunction } from 'express'
import multer from 'multer'
import { sendError,  } from '../utils/error.response/response'
import {AppError} from '../utils/error.response/appError'

export const errorMiddleware = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof multer.MulterError) {
    const statusCode = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400
    return sendError(res, err.message, statusCode)
  }

  if (err instanceof AppError) {
    return sendError(res, err.message, err.statusCode)
  }
  console.error(err)
  return sendError(res, 'Internal server error', 500)
}