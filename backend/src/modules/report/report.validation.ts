import { z } from "zod"

export const createReportTemplateSchema = z.object({
  division_id: z.number(),
  template_style: z.enum(["FORMAL_STRUCTURED", "PHOTO_GRID", "DAILY_LOG", "COMBINED_FULL", "MINIMAL"]).default("FORMAL_STRUCTURED"),
  report_mode: z.enum(["NARRATIVE_ONLY", "PHOTO_ONLY", "COMBINED"]).default("COMBINED"),
  report_title: z.string().optional(),
  made_by: z.string().optional(),
  show_logo: z.boolean().default(true),
  section_intro: z.string().optional(),
  section_background: z.string().optional(),
  section_purpose: z.string().optional(),
  section_duties: z.string().optional(),
  section_scope: z.string().optional(),
  section_schedule: z.string().optional(),
  section_evaluation: z.string().optional(),
  section_suggestion: z.string().optional(),
  section_closing: z.string().optional(),
  photos_per_row: z.number().min(1).max(4).default(2),
  show_photo_caption: z.boolean().default(true),
  photo_caption_template: z.string().optional(),
  signers: z.array(z.object({
    name: z.string(),
    title: z.string(),
  })).optional(),
})

export const updateReportTemplateSchema = createReportTemplateSchema.partial().omit({ division_id: true })

export const generateReportSchema = z.object({
  company_id: z.number(),
  division_id: z.number(),
  period_month: z.number().min(1).max(12),
  period_year: z.number().min(2024),
  report_mode: z.enum(["NARRATIVE_ONLY", "PHOTO_ONLY", "COMBINED"]),
  section_evaluation: z.string().optional(), // admin edits per generation
  section_suggestion: z.string().optional(),
  // photo captions override — admin can edit auto-generated captions
  photo_captions: z.record(z.string(), z.string()).optional(), // { "photo_id": "custom caption" }
})

export type CreateReportTemplateInput = z.infer<typeof createReportTemplateSchema>
export type UpdateReportTemplateInput = z.infer<typeof updateReportTemplateSchema>
export type GenerateReportInput = z.infer<typeof generateReportSchema>