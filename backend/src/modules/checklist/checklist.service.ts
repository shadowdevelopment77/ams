import {
  checklistTemplateRepository,
  checklistItemRepository,
  checklistSubmissionRepository,
  checklistPhotoRepository,
  attendanceRepository,
  companyRepository,
  divisionRepository,
} from '../../repositories/index.repositories'
import {getToday} from '../../utils/date'

import {
  CreateTemplateInput, UpdateTemplateInput,
  CreateItemInput, UpdateItemInput,
} from "./checklist.validation"
import { AppError } from '../../utils/error.response/appError'
import { PaginationParams } from '../../repositories/interfaces/base.interface'

export class ChecklistService{
  private readonly  MAX_PHOTOS_PER_ITEM = 3

  //Private Helpers

  private async getTemplateOrThrow(id: number) {
    const template = await checklistTemplateRepository.findById(id)
    if (!template) throw new AppError('Template not found', 404)
    return template
  }

  private async getItemOrThrow(id: number) {
    const item = await checklistItemRepository.findById(id)
    if (!item) throw new AppError('Checklist item not found', 404)
    return item
  }


    private async getAttendanceOrThrow(attendanceId: string) {
    const attendance = await attendanceRepository.findById(attendanceId)
    if (!attendance) throw new AppError('Attendance not found', 404)
    return attendance
  }

    private async getCompanyOrThrow(companyId: number) {
    const company = await companyRepository.findById(companyId)
    if (!company) throw new AppError('Company not found', 404)
    return company
  }


    private async getDivisionOrThrow(divisionId: number) {
    const division = await divisionRepository.findById(divisionId)
    if (!division) throw new AppError('Division not found', 404)
    return division
  }


  private async getSubmissionOrThrow(attendanceId: string, itemId: number) {
    const submission = await checklistSubmissionRepository.findByAttendanceAndItem(attendanceId, itemId)
    if (!submission) throw new AppError('Checklist submission not found', 404)
    return submission
  }



    private assertOwnership(resourceUserId: string, requestingUserId: string) {
    if (resourceUserId !== requestingUserId) throw new AppError('Access denied', 403)
  }

  private async assertAttendanceIsToday(attendance: { date: Date }) {
  const { date: todayDate } = getToday()
  if (attendance.date.getTime() !== todayDate.getTime()) {
    throw new AppError('Checklist is no longer open — it belonged to a previous check-in', 403)
  }
}

  //Template

  async createTemplate(dto: CreateTemplateInput) {
    await this.getCompanyOrThrow(dto.company_id)
    await this.getDivisionOrThrow(dto.division_id)
    return checklistTemplateRepository.create(dto)
  }

  async getTemplatesByDivision(companyId: number, divisionId: number) {
    await this.getCompanyOrThrow(companyId)
    await this.getDivisionOrThrow(divisionId)
    return checklistTemplateRepository.findByDivision(companyId, divisionId)
  }

  async updateTemplate(id: number, dto: UpdateTemplateInput) {
    await this.getTemplateOrThrow(id)
    return checklistTemplateRepository.update(id, dto)
  }

  async deleteTemplate(id: number) {
    await this.getTemplateOrThrow(id)
    return checklistTemplateRepository.softDelete(id)
  }


  //checklistItem

  async createItem(dto: CreateItemInput) {
    await this.getTemplateOrThrow(dto.template_id)
    return checklistItemRepository.create(dto)
  }

  async getItemsByTemplate(templateId: number, params?: PaginationParams) {
    await this.getTemplateOrThrow(templateId)
    return checklistItemRepository.findByTemplate(templateId, params)
  }

  async updateItem(id: number, dto: UpdateItemInput) {
    await this.getItemOrThrow(id)
    return checklistItemRepository.update(id, dto)
  }

  async deleteItem(id: number) {
    await this.getItemOrThrow(id)
    return checklistItemRepository.softDelete(id)
  }


  //submission

  async getMyChecklist(userId: string) {
    const {date}      = getToday()
    const attendance = await attendanceRepository.findByUser(userId, date)
    if (!attendance) throw new AppError('Please check in first', 404)

    return checklistSubmissionRepository.findByAttendance(attendance.id)
  }


  async uploadPhoto(
    attendanceId: string,
    itemId:       number,
    userId:       string,
    photoUrl:     string
  ) {
    const attendance = await this.getAttendanceOrThrow(attendanceId)
    await this.assertAttendanceIsToday(attendance)
    await this.assertOwnership(attendance.user_id, userId)

    const submission = await this.getSubmissionOrThrow(attendanceId, itemId)

    if (submission.is_submitted) {
      throw new AppError('Checklist already submitted, cannot modify', 400)
    }

    const photoCount = await checklistPhotoRepository.countBySubmission(submission.id)
    if (photoCount >= this.MAX_PHOTOS_PER_ITEM) {
      throw new AppError(`Maximum ${this.MAX_PHOTOS_PER_ITEM} photos per item`, 400)
    }

    return checklistPhotoRepository.create({
      submission_id: submission.id,
      photo_url:     photoUrl,
      order:         photoCount + 1,
    })
  }

   async submitAll(attendanceId: string, userId: string) {
    const attendance = await this.getAttendanceOrThrow(attendanceId)
    await this.assertAttendanceIsToday(attendance)
    await this.assertOwnership(attendance.user_id, userId)

    const submissions = await checklistSubmissionRepository.findByAttendance(attendanceId)

    if (submissions.length === 0) {
      throw new AppError('No checklist items found', 404)
    }

    const alreadySubmitted = submissions.some(s => s.is_submitted)
    if (alreadySubmitted) {
      throw new AppError('Checklist already submitted', 409)
    }

    const missingPhoto = submissions.some(s => s.photos.length === 0)
    if (missingPhoto) {
      throw new AppError('All checklist items must have at least one photo', 400)
    }

    await checklistSubmissionRepository.submitAll(attendanceId)
  }


  //Photo 
  
    async getByItemAndDate(
    itemId:    number,
    companyId: number,
    date:      Date,
    params:    PaginationParams
  ) {
    await this.getItemOrThrow(itemId)
    await this.getCompanyOrThrow(companyId)
    return checklistSubmissionRepository.findByItemAndDate(itemId, companyId, date, params)
  }

}

export const checklistService = new ChecklistService()