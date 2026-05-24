import prisma from "../../lib/prisma"
import {
  CreateTemplateInput, CreateItemInput, UpdateItemInput,
  SubmitItemInput, ReviewPhotoInput, HighlightPhotoInput,
} from "./checklist.validation"

// ─── ADMIN: TEMPLATE ─────────────────────────────────────────────
export const createTemplate = async (input: CreateTemplateInput, user_id : number) => {
  const division = await prisma.division.findUnique({ where: { id: input.division_id } })
  if (!division) throw new Error("Division not found")
  if (division.company_id !== input.company_id)
    throw new Error("Division does not belong to this company")

  const existing = await prisma.checklistTemplate.findFirst({
    where: { division_id: input.division_id, is_active: true },
  })
  if (existing) throw new Error("Division already has an active checklist template")

  return await prisma.checklistTemplate.create({
    data: { ...input},
  })
}


export const getTemplatesByDivision = async (division_id: number, user_id: number) => {
  const division = await prisma.division.findUnique({
    where: { id: division_id },
    select: { company_id: true },
  })
  if (!division) throw new Error("Division not found")

  const userRole = await prisma.userCompanyRole.findFirst({
    where: { user_id, company_id: division.company_id },
  })
  if (!userRole) throw new Error("Division not found")

  return await prisma.checklistTemplate.findMany({
    where: { division_id, is_active: true },
    include: { items: { orderBy: { order_no: "asc" } } },
  })
}

// ─── ADMIN: ITEMS ─────────────────────────────────────────────────
export const addItem = async (input: CreateItemInput) => {
  const template = await prisma.checklistTemplate.findUnique({
    where: { id: input.template_id },
  })
  if (!template) throw new Error("Template not found")
  if (!template.is_active) throw new Error("Template is not active")

  return await prisma.checklistItem.create({ data: input })
}

export const updateItem = async (id: number, input: UpdateItemInput) => {
  const item = await prisma.checklistItem.findUnique({ where: { id } })
  if (!item) throw new Error("Item not found")

  return await prisma.checklistItem.update({ where: { id }, data: input })
}

export const deleteItem = async (id: number) => {
  const item = await prisma.checklistItem.findUnique({ where: { id } })
  if (!item) throw new Error("Item not found")

  return await prisma.checklistItem.delete({ where: { id } })
}

// ─── STAFF: GET CHECKLIST ─────────────────────────────────────────
export const getMyChecklist = async (user_id: number, attendance_id: number) => {
  const attendance = await prisma.attendance.findUnique({
    where: { id: attendance_id },
    include: { division: true },
  })
  if (!attendance) throw new Error("Attendance not found")
  if (attendance.user_id !== user_id) throw new Error("Attendance not found")
  if (!attendance.division_id) throw new Error("Division not found")

  const template = await prisma.checklistTemplate.findFirst({
    where: { division_id: attendance.division_id, is_active: true },
    include: { items: { orderBy: { order_no: "asc" } } },
  })
  if (!template) throw new Error("No active checklist template for your division")

  const submissions = await prisma.checklistSubmission.findMany({
    where: { attendance_id },
    include: { photos: true },
  })

  const items = template.items.map((item) => {
    const submission = submissions.find((s) => s.item_id === item.id) ?? null
    return { ...item, submission }
  })

  return { template_id: template.id, title: template.title, attendance_id, items }
}

// ─── STAFF: SUBMIT ITEM ───────────────────────────────────────────
export const submitItem = async (user_id: number, input: SubmitItemInput) => {
  const attendance = await prisma.attendance.findUnique({
    where: { id: input.attendance_id },
  })
  if (!attendance) throw new Error("Attendance not found")
  if (attendance.user_id !== user_id) throw new Error("Attendance not found")
  if (attendance.check_out_at) throw new Error("Cannot submit checklist after checkout")

  const item = await prisma.checklistItem.findUnique({ where: { id: input.item_id } })
  if (!item) throw new Error("Checklist item not found")

  const existing = await prisma.checklistSubmission.findFirst({
    where: { attendance_id: input.attendance_id, item_id: input.item_id },
  })

  if (existing) {
    if (existing.is_submitted) throw new Error("Checklist item already submitted and locked")

    return await prisma.checklistSubmission.update({
      where: { id: existing.id },
      data: { is_done: input.is_done, notes: input.notes },
      include: { photos: true },
    })
  }

  return await prisma.checklistSubmission.create({
    data: {
      attendance_id: input.attendance_id,
      item_id: input.item_id,
      is_done: input.is_done,
      notes: input.notes,
    },
    include: { photos: true },
  })
}

// ─── STAFF: UPLOAD EVIDENCE PHOTO ────────────────────────────────
export const uploadEvidencePhoto = async (
  user_id: number,
  submission_id: number,
  photo_url: string
) => {
  const submission = await prisma.checklistSubmission.findUnique({
    where: { id: submission_id },
    include: { attendance: true, photos: true },
  })
  if (!submission) throw new Error("Submission not found")
  if (submission.attendance.user_id !== user_id) throw new Error("Submission not found")
  if (submission.is_submitted) throw new Error("Submission already locked")
  if (submission.attendance.check_out_at) throw new Error("Cannot upload photo after checkout")

  // max 3 photos per item
  if (submission.photos.length >= 3) throw new Error("Maximum 3 photos per checklist item")

  return await prisma.evidencePhoto.create({
    data: { submission_id, photo_url, status: "PENDING" },
  })
}

// ─── STAFF: LOCK SUBMISSION ───────────────────────────────────────
export const lockSubmission = async (user_id: number, submission_id: number) => {
  const submission = await prisma.checklistSubmission.findUnique({
    where: { id: submission_id },
    include: { attendance: true, photos: true },
  })
  if (!submission) throw new Error("Submission not found")
  if (submission.attendance.user_id !== user_id) throw new Error("Submission not found")
  if (submission.is_submitted) throw new Error("Already submitted")

  // must have at least 1 photo if item requires photo
  const item = await prisma.checklistItem.findUnique({
    where: { id: submission.item_id },
  })
  if (item?.requires_photo && submission.photos.length === 0) {
    throw new Error("At least 1 photo is required before submitting")
  }

  return await prisma.checklistSubmission.update({
    where: { id: submission_id },
    data: { is_submitted: true, submitted_at: new Date() },
    include: { photos: true },
  })
}

// ─── STAFF: DELETE PHOTO (before lock) ───────────────────────────
export const deleteEvidencePhoto = async (user_id: number, photo_id: number) => {
  const photo = await prisma.evidencePhoto.findUnique({
    where: { id: photo_id },
    include: { submission: { include: { attendance: true } } },
  })
  if (!photo) throw new Error("Photo not found")
  if (photo.submission.attendance.user_id !== user_id) throw new Error("Photo not found")
  if (photo.submission.is_submitted) throw new Error("Cannot delete photo after submission locked")
  if (photo.status !== "PENDING") throw new Error("Cannot delete reviewed photo")

  return await prisma.evidencePhoto.delete({ where: { id: photo_id } })
}

// ─── SUPERVISOR: REVIEW PHOTO ─────────────────────────────────────
export const reviewPhoto = async (user_id: number, input: ReviewPhotoInput) => {
  const photo = await prisma.evidencePhoto.findUnique({
    where: { id: input.photo_id },
    include: {
      submission: {
        include: { attendance: { include: { company: true } } },
      },
    },
  })
  if (!photo) throw new Error("Photo not found")
  if (photo.status !== "PENDING") throw new Error("Photo already reviewed")

  // verify supervisor belongs to same company
  const company_id = photo.submission.attendance.company_id
  const userRole = await prisma.userCompanyRole.findFirst({
    where: { user_id, company_id, role: "SUPERVISOR" },
  })
  if (!userRole) throw new Error("Photo not found")

  return await prisma.evidencePhoto.update({
    where: { id: input.photo_id },
    data: {
      status: input.status,
      reviewed_by: user_id,
      reviewed_at: new Date(),
      reject_reason: input.status === "REJECTED" ? input.reject_reason : null,
    },
  })
}

// ─── SUPERVISOR: GET PENDING PHOTOS BY COMPANY ───────────────────
export const getPendingPhotosByCompany = async (user_id: number, company_id: number) => {
  const userRole = await prisma.userCompanyRole.findFirst({
    where: { user_id, company_id, role: "SUPERVISOR" },
  })
  if (!userRole) throw new Error("Company not found")

  return await prisma.evidencePhoto.findMany({
    where: {
      status: "PENDING",
      submission: {
        is_submitted: true,
        attendance: { company_id },
      },
    },
    include: {
      submission: {
        include: {
          item: { select: { description: true } },
          attendance: {
            include: {
              user: { select: { id: true, name: true } },
              division: { select: { name: true } },
            },
          },
        },
      },
    },
    orderBy: { created_at: "asc" },
  })
}

// ─── ADMIN: HIGHLIGHT PHOTO ───────────────────────────────────────
export const highlightPhoto = async (input: HighlightPhotoInput) => {
  const photo = await prisma.evidencePhoto.findUnique({ where: { id: input.photo_id } })
  if (!photo) throw new Error("Photo not found")
  if (photo.status !== "APPROVED") throw new Error("Only approved photos can be highlighted")

  return await prisma.evidencePhoto.update({
    where: { id: input.photo_id },
    data: {
      is_highlighted: input.is_highlighted,
      highlighted_at: input.is_highlighted ? new Date() : null,
    },
  })
}

// ─── ADMIN: GET HIGHLIGHTED PHOTOS FOR REPORT ────────────────────
export const getHighlightedPhotos = async (company_id: number, division_id: number, month: number, year: number) => {
  const startDate = new Date(year, month - 1, 1)
  const endDate = new Date(year, month, 0, 23, 59, 59)

  return await prisma.evidencePhoto.findMany({
    where: {
      is_highlighted: true,
      status: "APPROVED",
      submission: {
        attendance: {
          company_id,
          division_id,
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
}