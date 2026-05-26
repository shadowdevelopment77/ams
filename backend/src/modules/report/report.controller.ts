import { Request, Response } from "express"
import * as ReportService from "./report.service"
import {
  createReportTemplateSchema,
  updateReportTemplateSchema,
  generateReportSchema,
} from "./report.validation"
import { sendSuccess, sendError } from "../../utils/response"
import path from "path"
import fs from "fs"

export const createReportTemplate = async (req: Request, res: Response) => {
  try {
    const parsed = createReportTemplateSchema.safeParse(req.body)
    if (!parsed.success) return sendError(res, "Validation failed", 400, parsed.error.issues)

    const result = await ReportService.createReportTemplate(parsed.data)
    return sendSuccess(res, result, "Report template created successfully", 201)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create report template"
    return sendError(res, message, 400)
  }
}

export const updateReportTemplate = async (req: Request, res: Response) => {
  try {
    const division_id = parseInt(req.params.division_id as string)
    if (isNaN(division_id)) return sendError(res, "Invalid division ID", 400)

    const parsed = updateReportTemplateSchema.safeParse(req.body)
    if (!parsed.success) return sendError(res, "Validation failed", 400, parsed.error.issues)

    const result = await ReportService.updateReportTemplate(division_id, parsed.data)
    return sendSuccess(res, result, "Report template updated successfully")
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update report template"
    return sendError(res, message, 400)
  }
}

export const getReportTemplate = async (req: Request, res: Response) => {
  try {
    const division_id = parseInt(req.params.division_id as string)
    if (isNaN(division_id)) return sendError(res, "Invalid division ID", 400)

    const result = await ReportService.getReportTemplate(division_id)
    return sendSuccess(res, result, "Report template fetched successfully")
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch report template"
    return sendError(res, message, 400)
  }
}

export const generateReport = async (req: Request, res: Response) => {
  try {
    const parsed = generateReportSchema.safeParse(req.body)
    if (!parsed.success) return sendError(res, "Validation failed", 400, parsed.error.issues)

    const result = await ReportService.generateReport(parsed.data, req.user!.id)
    return sendSuccess(res, result, "Report generated successfully")
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to generate report"
    return sendError(res, message, 400)
  }
}

export const downloadReport = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string)
    if (isNaN(id)) return sendError(res, "Invalid report ID", 400)

    const report = await ReportService.getReportById(id)
    if (!report.file_url) return sendError(res, "Report file not found", 404)

    const filePath = path.join(process.cwd(), report.file_url)
    if (!fs.existsSync(filePath)) return sendError(res, "Report file not found", 404)

    const fileName = `Laporan_${report.division.name}_${report.period_month}_${report.period_year}.docx`
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`)
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
    fs.createReadStream(filePath).pipe(res)
  } catch (error: unknown) {
    return sendError(res, "Failed to download report", 500)
  }
}

export const getReportsByDivision = async (req: Request, res: Response) => {
  try {
    const division_id = parseInt(req.params.division_id as string)
    const company_id  = parseInt(req.query.company_id as string)
    if (isNaN(division_id) || isNaN(company_id)) return sendError(res, "Invalid IDs", 400)

    const result = await ReportService.getReportsByDivision(division_id, company_id)
    return sendSuccess(res, result, "Reports fetched successfully")
  } catch (error: unknown) {
    return sendError(res, "Failed to fetch reports", 500)
  }
}

export const getReportById = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string)
    if (isNaN(id)) return sendError(res, "Invalid report ID", 400)

    const result = await ReportService.getReportById(id)
    return sendSuccess(res, result, "Report fetched successfully")
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch report"
    return sendError(res, message, 400)
  }
}

export const deleteReport = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string)
    if (isNaN(id)) return sendError(res, "Invalid report ID", 400)

    const result = await ReportService.deleteReport(id)
    return sendSuccess(res, result, "Report deleted successfully")
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete report"
    return sendError(res, message, 400)
  }
}

export const markReportPrinted = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string)
    if (isNaN(id)) return sendError(res, "Invalid report ID", 400)

    const result = await ReportService.markReportPrinted(id)
    return sendSuccess(res, result, "Report marked as printed")
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to mark report as printed"
    return sendError(res, message, 400)
  }
}