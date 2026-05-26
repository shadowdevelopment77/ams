import prisma from "../../lib/prisma"
import { CreateReportTemplateInput, UpdateReportTemplateInput, GenerateReportInput } from "./report.validation"
import { generateDocx } from "../../utils/generateDocx"
import { uploadImage } from "../../utils/uploadImage"
import path from "path"
import fs from "fs"

// ─── REPORT TEMPLATE ─────────────────────────────────────────────
export const createReportTemplate = async (input: CreateReportTemplateInput) => {
  const division = await prisma.division.findUnique({ where: { id: input.division_id } })
  if (!division) throw new Error("Division not found")

  const existing = await prisma.reportTemplate.findUnique({
    where: { division_id: input.division_id },
  })
  if (existing) throw new Error("Report template already exists for this division. Use update instead.")

  return await prisma.reportTemplate.create({
    data: {
      ...input,
      signers: input.signers ? JSON.stringify(input.signers) : undefined,
    },
  })
}

export const updateReportTemplate = async (division_id: number, input: UpdateReportTemplateInput) => {
  const template = await prisma.reportTemplate.findUnique({ where: { division_id } })
  if (!template) throw new Error("Report template not found")

  return await prisma.reportTemplate.update({
    where: { division_id },
    data: {
      ...input,
      signers: input.signers ? JSON.stringify(input.signers) : undefined,
    },
  })
}

export const getReportTemplate = async (division_id: number) => {
  const template = await prisma.reportTemplate.findUnique({ where: { division_id } })
  if (!template) throw new Error("Report template not found")
  return template
}

// ─── GENERATE REPORT ─────────────────────────────────────────────
export const generateReport = async (input: GenerateReportInput, generated_by: number) => {
  // check if report already exists for this period
  const existing = await prisma.report.findUnique({
    where: {
      company_id_division_id_period_month_period_year: {
        company_id: input.company_id,
        division_id: input.division_id,
        period_month: input.period_month,
        period_year: input.period_year,
      },
    },
  })
  if (existing && existing.status === "GENERATED") {
    throw new Error("Report already generated for this period. Delete it first to regenerate.")
  }

  // get report template for this division
  const template = await prisma.reportTemplate.findUnique({
    where: { division_id: input.division_id },
  })
  if (!template) throw new Error("No report template found for this division")

  // get company info
  const company = await prisma.company.findUnique({
    where: { id: input.company_id },
    select: { name: true, logo_url: true, address: true },
  })
  if (!company) throw new Error("Company not found")

  // get division info
  const division = await prisma.division.findUnique({
    where: { id: input.division_id },
    select: { name: true },
  })
  if (!division) throw new Error("Division not found")

  // get highlighted photos for this period
  const startDate = new Date(input.period_year, input.period_month - 1, 1)
  const endDate   = new Date(input.period_year, input.period_month, 0, 23, 59, 59)

  const photos = await prisma.evidencePhoto.findMany({
    where: {
      is_highlighted: true,
      status: "APPROVED",
      submission: {
        attendance: {
          company_id: input.company_id,
          division_id: input.division_id,
          check_in_at: { gte: startDate, lte: endDate },
        },
      },
    },
    include: {
      submission: {
        include: {
          item: { select: { description: true } },
          attendance: {
            include: {
              user: { select: { name: true } },
            },
          },
        },
      },
    },
    orderBy: { highlighted_at: "asc" },
  })

  if (photos.length === 0) throw new Error("No highlighted photos found for this period")

  // build photo data with captions
  const photoData = photos.map((photo) => {
    const autoCaption = buildAutoCaption(photo, template.photo_caption_template)
    const caption = input.photo_captions?.[String(photo.id)] ?? autoCaption

    return {
      id: photo.id,
      photo_url: photo.photo_url,
      caption,
      check_in_at: photo.submission.attendance.check_in_at,
      staff_name: photo.submission.attendance.user.name,
      item_description: photo.submission.item.description,
    }
  })

  // build narrative snapshot
  const snapshot = {
    report_title: template.report_title,
    made_by: template.made_by,
    section_intro: template.section_intro,
    section_background: template.section_background,
    section_purpose: template.section_purpose,
    section_duties: template.section_duties,
    section_scope: template.section_scope,
    section_schedule: template.section_schedule,
    section_evaluation: input.section_evaluation ?? template.section_evaluation,
    section_suggestion: input.section_suggestion ?? template.section_suggestion,
    section_closing: template.section_closing,
    signers: template.signers,
  }

  // generate DOCX file
  const fileName  = `report_${input.division_id}_${input.period_month}_${input.period_year}.docx`
  const outputDir = path.join(process.cwd(), "uploads", "reports")
  fs.mkdirSync(outputDir, { recursive: true })
  const outputPath = path.join(outputDir, fileName)

  await generateDocx({
    company,
    division,
    period_month: input.period_month,
    period_year: input.period_year,
    photos: photoData,
    template,
    snapshot,
    photos_per_row: template.photos_per_row,
    output_path: outputPath,
    report_mode: input.report_mode,
  })

  const file_url = `/uploads/reports/${fileName}`

  // save or update report record
  const report = existing
    ? await prisma.report.update({
        where: { id: existing.id },
        data: {
          report_mode: input.report_mode,
          snapshot_narrative: snapshot,
          file_url,
          file_type: "DOCX",
          status: "GENERATED",
          generated_by,
          generated_at: new Date(),
        },
      })
    : await prisma.report.create({
        data: {
          company_id: input.company_id,
          division_id: input.division_id,
          period_month: input.period_month,
          period_year: input.period_year,
          report_mode: input.report_mode,
          snapshot_narrative: snapshot,
          file_url,
          file_type: "DOCX",
          status: "GENERATED",
          generated_by,
          generated_at: new Date(),
        },
      })

  return { report, file_url }
}

// ─── HELPERS ─────────────────────────────────────────────────────
const buildAutoCaption = (photo: any, template_str: string | null): string => {
  const time = new Date(photo.submission.attendance.check_in_at).toLocaleString("id-ID", {
    day: "2-digit", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  })
  const name = photo.submission.attendance.user.name
  const activity = photo.submission.item.description

  if (template_str) {
    return template_str
      .replace("{name}", name)
      .replace("{activity}", activity)
      .replace("{time}", time)
  }

  return `${name} sedang ${activity} pada ${time}`
}

// ─── GET REPORTS ─────────────────────────────────────────────────
export const getReportsByDivision = async (division_id: number, company_id: number) => {
  return await prisma.report.findMany({
    where: { division_id, company_id },
    orderBy: [{ period_year: "desc" }, { period_month: "desc" }],
    include: {
      generated_by_user: { select: { name: true } },
    },
  })
}

export const getReportById = async (id: number) => {
  const report = await prisma.report.findUnique({
    where: { id },
    include: {
      company: { select: { name: true, logo_url: true } },
      division: { select: { name: true } },
      generated_by_user: { select: { name: true } },
    },
  })
  if (!report) throw new Error("Report not found")
  return report
}

export const deleteReport = async (id: number) => {
  const report = await prisma.report.findUnique({ where: { id } })
  if (!report) throw new Error("Report not found")
  if (report.status === "PRINTED") throw new Error("Cannot delete a printed report")

  // delete file from disk
  if (report.file_url) {
    const filePath = path.join(process.cwd(), report.file_url)
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
  }

  return await prisma.report.delete({ where: { id } })
}

export const markReportPrinted = async (id: number) => {
  const report = await prisma.report.findUnique({ where: { id } })
  if (!report) throw new Error("Report not found")
  if (report.status !== "GENERATED") throw new Error("Report must be generated before marking as printed")

  return await prisma.report.update({
    where: { id },
    data: { status: "PRINTED" },
  })
}