import { Request, Response } from "express"
import * as ChecklistService from "./checklist.service"
import {
  createTemplateSchema,
  createItemSchema,
  updateItemSchema,
  submitItemSchema,
  lockSubmissionSchema,
  reviewPhotoSchema,
  highlightPhotoSchema,
} from "./checklist.validation"
import { sendSuccess, sendError } from "../../utils/response"
import { uploadImage } from "../../utils/uploadImage"

// ─── ADMIN: TEMPLATE ─────────────────────────────────────────────
export const createTemplate = async (req: Request, res: Response) => {
  try {
    const parsed = createTemplateSchema.safeParse(req.body)
    if (!parsed.success) return sendError(res, "Validation failed", 400, parsed.error.issues)

    const result = await ChecklistService.createTemplate(parsed.data, req.user!.id)
    return sendSuccess(res, result, "Template created successfully", 201)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create template"
    return sendError(res, message, 400)
  }
}


export const getTemplatesByDivision = async (req: Request, res: Response) => {
  try {
    const division_id = parseInt(req.params.division_id as string)
    if (isNaN(division_id)) return sendError(res, "Invalid division ID", 400)

    const result = await ChecklistService.getTemplatesByDivision(division_id, req.user!.id)
    return sendSuccess(res, result, "Templates fetched successfully")
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch templates"
    return sendError(res, message, 400)
  }
}

// ─── ADMIN: ITEMS ─────────────────────────────────────────────────
export const addItem = async (req: Request, res: Response) => {
  try {
    const parsed = createItemSchema.safeParse(req.body)
    if (!parsed.success) return sendError(res, "Validation failed", 400, parsed.error.issues)

    const result = await ChecklistService.addItem(parsed.data)
    return sendSuccess(res, result, "Item added successfully", 201)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to add item"
    return sendError(res, message, 400)
  }
}

export const updateItem = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string)
    if (isNaN(id)) return sendError(res, "Invalid item ID", 400)

    const parsed = updateItemSchema.safeParse(req.body)
    if (!parsed.success) return sendError(res, "Validation failed", 400, parsed.error.issues)

    const result = await ChecklistService.updateItem(id, parsed.data)
    return sendSuccess(res, result, "Item updated successfully")
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update item"
    return sendError(res, message, 400)
  }
}

export const deleteItem = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string)
    if (isNaN(id)) return sendError(res, "Invalid item ID", 400)

    const result = await ChecklistService.deleteItem(id)
    return sendSuccess(res, result, "Item deleted successfully")
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete item"
    return sendError(res, message, 400)
  }
}

// ─── ADMIN: HIGHLIGHT PHOTO ───────────────────────────────────────
export const highlightPhoto = async (req: Request, res: Response) => {
  try {
    const parsed = highlightPhotoSchema.safeParse({
      photo_id: parseInt(req.params.photo_id as string),
      is_highlighted: req.body.is_highlighted,
    })
    if (!parsed.success) return sendError(res, "Validation failed", 400, parsed.error.issues)

    const result = await ChecklistService.highlightPhoto(parsed.data)
    return sendSuccess(res, result, "Photo highlight updated successfully")
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to highlight photo"
    return sendError(res, message, 400)
  }
}

export const getHighlightedPhotos = async (req: Request, res: Response) => {
  try {
    const company_id  = parseInt(req.query.company_id as string)
    const division_id = parseInt(req.query.division_id as string)
    const month       = parseInt(req.query.month as string)
    const year        = parseInt(req.query.year as string)

    if (isNaN(company_id) || isNaN(division_id) || isNaN(month) || isNaN(year)) {
      return sendError(res, "company_id, division_id, month and year are required", 400)
    }

    const result = await ChecklistService.getHighlightedPhotos(company_id, division_id, month, year)
    return sendSuccess(res, result, "Highlighted photos fetched successfully")
  } catch (error: unknown) {
    return sendError(res, "Failed to fetch highlighted photos", 500)
  }
}

// ─── STAFF: CHECKLIST ─────────────────────────────────────────────
export const getMyChecklist = async (req: Request, res: Response) => {
  try {
    const attendance_id = parseInt(req.params.attendance_id as string)
    if (isNaN(attendance_id)) return sendError(res, "Invalid attendance ID", 400)

    const result = await ChecklistService.getMyChecklist(req.user!.id, attendance_id)
    return sendSuccess(res, result, "Checklist fetched successfully")
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch checklist"
    return sendError(res, message, 400)
  }
}

export const submitItem = async (req: Request, res: Response) => {
  try {
    const parsed = submitItemSchema.safeParse(req.body)
    if (!parsed.success) return sendError(res, "Validation failed", 400, parsed.error.issues)

    const result = await ChecklistService.submitItem(req.user!.id, parsed.data)
    return sendSuccess(res, result, "Checklist item submitted successfully")
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to submit item"
    return sendError(res, message, 400)
  }
}

export const lockSubmission = async (req: Request, res: Response) => {
  try {
    const parsed = lockSubmissionSchema.safeParse({
      submission_id: parseInt(req.params.submission_id as string),
    })
    if (!parsed.success) return sendError(res, "Validation failed", 400, parsed.error.issues)

    const result = await ChecklistService.lockSubmission(req.user!.id, parsed.data.submission_id)
    return sendSuccess(res, result, "Submission locked successfully")
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to lock submission"
    return sendError(res, message, 400)
  }
}

export const uploadEvidencePhoto = async (req: Request, res: Response) => {
  try {
    if (!req.file) return sendError(res, "Photo is required", 400)

    const submission_id = parseInt(req.params.submission_id as string)
    if (isNaN(submission_id)) return sendError(res, "Invalid submission ID", 400)

    const photo_url = await uploadImage(req.file.buffer, "ams/evidence")

    const result = await ChecklistService.uploadEvidencePhoto(
      req.user!.id,
      submission_id,
      photo_url
    )
    return sendSuccess(res, result, "Photo uploaded successfully", 201)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to upload photo"
    return sendError(res, message, 400)
  }
}

export const deleteEvidencePhoto = async (req: Request, res: Response) => {
  try {
    const photo_id = parseInt(req.params.photo_id as string)
    if (isNaN(photo_id)) return sendError(res, "Invalid photo ID", 400)

    const result = await ChecklistService.deleteEvidencePhoto(req.user!.id, photo_id)
    return sendSuccess(res, result, "Photo deleted successfully")
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete photo"
    return sendError(res, message, 400)
  }
}

// ─── SUPERVISOR: REVIEW ───────────────────────────────────────────
export const reviewPhoto = async (req: Request, res: Response) => {
  try {
    const parsed = reviewPhotoSchema.safeParse({
      photo_id: parseInt(req.params.photo_id as string),
      ...req.body,
    })
    if (!parsed.success) return sendError(res, "Validation failed", 400, parsed.error.issues)

    const result = await ChecklistService.reviewPhoto(req.user!.id, parsed.data)
    return sendSuccess(res, result, "Photo reviewed successfully")
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to review photo"
    return sendError(res, message, 400)
  }
}

export const getPendingPhotosByCompany = async (req: Request, res: Response) => {
  try {
    const company_id = parseInt(req.params.company_id as string)
    if (isNaN(company_id)) return sendError(res, "Invalid company ID", 400)

    const result = await ChecklistService.getPendingPhotosByCompany(req.user!.id, company_id)
    return sendSuccess(res, result, "Pending photos fetched successfully")
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch pending photos"
    return sendError(res, message, 400)
  }
}