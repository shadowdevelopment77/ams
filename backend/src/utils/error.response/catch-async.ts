import { Request, Response } from 'express'
import { AppError } from './appError'
import { sendError } from './response'

export const catchAsync = (fn: (req: Request, res: Response) => Promise<any>) => 
  async (req: Request, res: Response) => {
    try {
      await fn(req, res)
    } catch (err) {
      if (err instanceof AppError) return sendError(res, err.message, err.statusCode)
      return sendError(res)
    }
  }