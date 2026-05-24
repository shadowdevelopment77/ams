import { Request, Response } from "express"
import * as AttendanceService from "./attendance.service"
import { checkInSchema, checkOutSchema, absentRequestSchema, visitLogSchema } from "./attendance.validation"
import { sendSuccess, sendError } from "../../utils/response"
import { uploadImage } from "../../utils/uploadImage"

export const checkIn = async (req: Request, res: Response) => {
  try {
    if (!req.file) return sendError(res, "Selfie photo is required", 400)

    const parsed = checkInSchema.safeParse(req.body)
    if (!parsed.success) return sendError(res, "Validation failed", 400, parsed.error.issues)

    const photo_url = await uploadImage(req.file.buffer, "ams/attendance")

    const result = await AttendanceService.checkIn(req.user!.id, {
      ...parsed.data,
      photo_url,
    })
    return sendSuccess(res, result, "Checked in successfully", 201)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Check in failed"
    return sendError(res, message, 400)
  }
}

export const checkOut = async (req: Request, res: Response) => {
  try {
    if (!req.file) return sendError(res, "Selfie photo is required", 400)

    const parsed = checkOutSchema.safeParse(req.body)
    if (!parsed.success) return sendError(res, "Validation failed", 400, parsed.error.issues)

    const checkout_photo_url = await uploadImage(req.file.buffer, "ams/attendance")

    const result = await AttendanceService.checkOut(req.user!.id, {
      ...parsed.data,
      checkout_photo_url,
    })
    return sendSuccess(res, result, "Checked out successfully")
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Check out failed"
    return sendError(res, message, 400)
  }
}

export const submitAbsentRequest = async (req: Request, res: Response) => {
  try {
    const parsed = absentRequestSchema.safeParse(req.body)
    if (!parsed.success) return sendError(res, "Validation failed", 400, parsed.error.issues)

    // proof photo optional
    const proof_url = req.file
      ? await uploadImage(req.file.buffer, "ams/absent")
      : undefined

    const result = await AttendanceService.submitAbsentRequest(req.user!.id, {
      ...parsed.data,
      proof_url,
    })
    return sendSuccess(res, result, "Absent request submitted successfully", 201)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to submit absent request"
    return sendError(res, message, 400)
  }
}

export const getMyAttendance = async (req: Request, res: Response) => {
  try {
    const result = await AttendanceService.getMyAttendance(req.user!.id)
    return sendSuccess(res, result, "Attendance fetched successfully")
  } catch (error: unknown) {
    return sendError(res, "Failed to fetch attendance", 500)
  }
}

export const getTodayAttendance = async (req: Request, res: Response) => {
  try {
    const result = await AttendanceService.getTodayAttendance(req.user!.id)
    return sendSuccess(res, result, "Today attendance fetched successfully")
  } catch (error: unknown) {
    return sendError(res, "Failed to fetch attendance", 500)
  }
}

export const createVisitLog = async (req: Request, res: Response) => {
  try {
    if (!req.file) return sendError(res, "Photo is required", 400)

    const parsed = visitLogSchema.safeParse(req.body)
    if (!parsed.success) return sendError(res, "Validation failed", 400, parsed.error.issues)

    const photo_url = await uploadImage(req.file.buffer, "ams/visits")

    const result = await AttendanceService.createVisitLog(req.user!.id, {
      ...parsed.data,
      photo_url,
    })
    return sendSuccess(res, result, "Visit logged successfully", 201)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to log visit"
    return sendError(res, message, 400)
  }
}

export const getMyVisitLogs = async (req: Request, res: Response) => {
  try {
    const result = await AttendanceService.getMyVisitLogs(req.user!.id)
    return sendSuccess(res, result, "Visit logs fetched successfully")
  } catch (error: unknown) {
    return sendError(res, "Failed to fetch visit logs", 500)
  }
}