import { Request, Response } from "express"
import * as DivisionService from "./division.service"
import { createDivisionSchema, updateDivisionSchema } from "./division.validation"
import { sendSuccess, sendError } from "../../utils/response"

export const createDivision = async (req: Request, res: Response) => {
  try {
    const parsed = createDivisionSchema.safeParse(req.body)
    if (!parsed.success) return sendError(res, "Validation failed", 400, parsed.error.issues)

    const result = await DivisionService.createDivision(parsed.data)
    return sendSuccess(res, result, "Division created successfully", 201)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create division"
    return sendError(res, message, 400)
  }
}

export const updateDivision = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string)
    if (isNaN(id)) return sendError(res, "Invalid division ID", 400)

    const parsed = updateDivisionSchema.safeParse(req.body)
    if (!parsed.success) return sendError(res, "Validation failed", 400, parsed.error.issues)

    const result = await DivisionService.updateDivision(id, parsed.data)
    return sendSuccess(res, result, "Division updated successfully")
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update division"
    return sendError(res, message, 400)
  }
}

export const getDivisionsByCompany = async (req: Request, res: Response) => {
  try {
    const company_id = parseInt(req.params.company_id as string)
    if (isNaN(company_id)) return sendError(res, "Invalid company ID", 400)

    const result = await DivisionService.getDivisionsByCompany(company_id)
    return sendSuccess(res, result, "Divisions fetched successfully")
  } catch (error: unknown) {
    return sendError(res, "Failed to fetch divisions", 500)
  }
}

export const deleteDivision = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string)
    if (isNaN(id)) return sendError(res, "Invalid division ID", 400)

    const result = await DivisionService.deleteDivision(id)
    return sendSuccess(res, result, "Division deleted successfully")
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete division"
    return sendError(res, message, 400)
  }
}