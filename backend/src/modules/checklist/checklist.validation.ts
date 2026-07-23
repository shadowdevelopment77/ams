import { z } from 'zod'
import { Request, Response, NextFunction } from 'express'
import { sendError } from '../../utils/error.response/response'

// ─── Template ───────────────────────────────────────────────────────────────

const createTemplateSchema = z.object({
  company_id:  z.coerce.number({ error: 'Company is required' }),
  division_id: z.coerce.number({ error: 'Division is required' }),
  title:       z.string().min(1, 'Title is required'),
})

const updateTemplateSchema = z.object({
  title:     z.string().min(1).optional(),
  is_active: z.boolean().optional(),
})

export type CreateTemplateInput = z.infer<typeof createTemplateSchema>
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>

export const validateCreateTemplate = (req: Request, res: Response, next: NextFunction) => {
  const result = createTemplateSchema.safeParse(req.body)
  if (!result.success) return sendError(res, 'Validation failed', 400, result.error.issues)
  req.body = result.data
  next()
}

export const validateUpdateTemplate = (req: Request, res: Response, next: NextFunction) => {
  const result = updateTemplateSchema.safeParse(req.body)
  if (!result.success) return sendError(res, 'Validation failed', 400, result.error.issues)
  req.body = result.data
  next()
}

// ─── Item ───────────────────────────────────────────────────────────────────

const createItemSchema = z.object({
  template_id:    z.coerce.number({ error: 'Template is required' }),
  order_no:       z.coerce.number({ error: 'Order is required' }),
  description:    z.string().min(1, 'Description is required'),
  requires_photo: z.boolean()
})

const updateItemSchema = z.object({
  description: z.string().min(1).optional(),
  order_no:    z.coerce.number().optional(),
  is_active:   z.boolean().optional(),
})

export type CreateItemInput = z.infer<typeof createItemSchema>
export type UpdateItemInput = z.infer<typeof updateItemSchema>

export const validateCreateItem = (req: Request, res: Response, next: NextFunction) => {
  const result = createItemSchema.safeParse(req.body)
  if (!result.success) return sendError(res, 'Validation failed', 400, result.error.issues)
  req.body = result.data
  next()
}

export const validateUpdateItem = (req: Request, res: Response, next: NextFunction) => {
  const result = updateItemSchema.safeParse(req.body)
  if (!result.success) return sendError(res, 'Validation failed', 400, result.error.issues)
  req.body = result.data
  next()
}

// ─── Query ──────────────────────────────────────────────────────────────────

export const templatesByDivisionQuerySchema = z.object({
  companyId:  z.coerce.number({ error: 'companyId is required' }),
  divisionId: z.coerce.number({ error: 'divisionId is required' }),
})

export const evidenceQuerySchema = z.object({
  companyId: z.coerce.number({ error: 'companyId is required' }),
  date:      z.coerce.date().optional(),
  page:      z.coerce.number().optional(),
  limit:     z.coerce.number().optional(),
})

