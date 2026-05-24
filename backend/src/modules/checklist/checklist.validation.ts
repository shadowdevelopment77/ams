import { z } from "zod"

export const createTemplateSchema = z.object({
  division_id: z.number(),
  company_id: z.number(),
  title: z.string().min(3),
})

export const createItemSchema = z.object({
  template_id: z.number(),
  description: z.string().min(3),
  order_no: z.number(),
  requires_photo: z.boolean().default(true),
})

export const updateItemSchema = createItemSchema
  .partial()
  .omit({ template_id: true })

// staff checks item + submits
export const submitItemSchema = z.object({
  attendance_id: z.number(),
  item_id: z.number(),
  is_done: z.boolean(),
  notes: z.string().optional(),
})

// staff locks submission
export const lockSubmissionSchema = z.object({
  submission_id: z.number(),
})

// supervisor reviews photo
export const reviewPhotoSchema = z.object({
  photo_id: z.number(),
  status: z.enum(["APPROVED", "REJECTED"]),
  reject_reason: z.string().optional(),
}).refine(
  (data) => data.status !== "REJECTED" || !!data.reject_reason,
  { message: "Reject reason is required when rejecting a photo" }
)

// admin highlights photo
export const highlightPhotoSchema = z.object({
  photo_id: z.number(),
  is_highlighted: z.boolean(),
})

export type CreateTemplateInput   = z.infer<typeof createTemplateSchema>
export type CreateItemInput       = z.infer<typeof createItemSchema>
export type UpdateItemInput       = z.infer<typeof updateItemSchema>
export type SubmitItemInput       = z.infer<typeof submitItemSchema>
export type LockSubmissionInput   = z.infer<typeof lockSubmissionSchema>
export type ReviewPhotoInput      = z.infer<typeof reviewPhotoSchema>
export type HighlightPhotoInput   = z.infer<typeof highlightPhotoSchema>