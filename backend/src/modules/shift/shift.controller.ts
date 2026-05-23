import { Request, Response } from "express"
import * as ShiftService from "./shift.service"
import { createShiftSchema, updateShiftSchema } from "./shift.validation"
import { sendSuccess, sendError } from "../../utils/response"

export const createShift = async (req: Request, res: Response) => {
  try {
    const parsed = createShiftSchema.safeParse(req.body)
    if (!parsed.success) return sendError(res, "Validation failed", 400, parsed.error.issues)

    const result = await ShiftService.createShift(parsed.data)
    return sendSuccess(res, result, "Shift created successfully", 201)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create shift"
    return sendError(res, message, 400)
  }
}

export const updateShift = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string)
    if (isNaN(id)) return sendError(res, "Invalid shift ID", 400)

    const parsed = updateShiftSchema.safeParse(req.body)
    if (!parsed.success) return sendError(res, "Validation failed", 400, parsed.error.issues)

    const result = await ShiftService.updateShift(id, parsed.data)
    return sendSuccess(res, result, "Shift updated successfully")
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update shift"
    return sendError(res, message, 400)
  }
}

export const getShiftsByDivision = async (req: Request, res: Response) => {
  try {
    const division_id = parseInt(req.params.division_id as string)
    if (isNaN(division_id)) return sendError(res, "Invalid division ID", 400)

    const result = await ShiftService.getShiftsByDivision(division_id, req.user!.id)
    return sendSuccess(res, result, "Shifts fetched successfully")
  } catch (error: unknown) {
    return sendError(res, "Failed to fetch shifts", 500)
  }
}

export const deleteShift = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string)
    if (isNaN(id)) return sendError(res, "Invalid shift ID", 400)

    const result = await ShiftService.deleteShift(id)
    return sendSuccess(res, result, "Shift deleted successfully")
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete shift"
    return sendError(res, message, 400)
  }
}