import {checklistService} from './checklist.service'
import { sendSuccess } from '../../utils/error.response/response'
import { catchAsync } from '../../utils/error.response/catch-async'
import { uploadImage } from '../../utils/uploadImage'
import { AppError } from '../../utils/error.response/appError'

export class ChecklistController {

  //template

  createTemplate = catchAsync(async (req, res) => {
    const result = await checklistService.createTemplate(req.body)
    return sendSuccess(res, result, 'Template created', 201)
  })

  getTemplatesByDivision = catchAsync(async (req, res) => {
    const companyId  = Number(req.query.companyId)
    const divisionId = Number(req.query.divisionId)
    const result = await checklistService.getTemplatesByDivision(companyId, divisionId)
    return sendSuccess(res, result, 'Templates fetched')
  })

  getTemplateById = catchAsync(async (req, res) => {
    const result = await checklistService.getTemplateById(Number(req.params.id))
    return sendSuccess(res, result, 'Template fetched')
  })

  updateTemplate = catchAsync(async (req, res) => {
    const result = await checklistService.updateTemplate(Number(req.params.id), req.body)
    return sendSuccess(res, result, 'Template updated')
  })

  deleteTemplate = catchAsync(async (req, res) => {
    await checklistService.deleteTemplate(Number(req.params.id))
    return sendSuccess(res, null, 'Template deleted')
  })

//checklist Item
  createItem = catchAsync(async (req, res) => {
    const result = await checklistService.createItem(req.body)
    return sendSuccess(res, result, 'Item created', 201)
  })

  getItemsByTemplate = catchAsync(async (req, res) => {
    const templateId = Number(req.params.templateId)
    const params = {
      page:  Number(req.query.page)  || 1,
      limit: Number(req.query.limit) || 10,
    }
    const result = await checklistService.getItemsByTemplate(templateId, params)
    return sendSuccess(res, result, 'Items fetched')
  })

  getItemById = catchAsync(async (req, res) => {
    const result = await checklistService.getItemById(Number(req.params.id))
    return sendSuccess(res, result, 'Item fetched')
  })

  updateItem = catchAsync(async (req, res) => {
    const result = await checklistService.updateItem(Number(req.params.id), req.body)
    return sendSuccess(res, result, 'Item updated')
  })

  deleteItem = catchAsync(async (req, res) => {
    await checklistService.deleteItem(Number(req.params.id),)
    return sendSuccess(res, null, 'Item deleted')
  })


  //submission

   getMyChecklist = catchAsync(async (req, res) => {
    const result = await checklistService.getMyChecklist(req.user!.id)
    return sendSuccess(res, result, 'Checklist fetched')
  })

  uploadPhoto = catchAsync(async (req, res) => {
    if (!req.file) throw new AppError('Photo is required', 400)

    const photoUrl = await uploadImage(req.file.buffer, 'ams/checklist')

    const attendanceId = req.params.attendanceId as string
    const itemId        = Number(req.params.itemId)

    const result = await checklistService.uploadPhoto(
      attendanceId,
      itemId,
      req.user!.id,
      photoUrl
    )
    return sendSuccess(res, result, 'Photo uploaded', 201)
  })

  submitAll = catchAsync(async (req, res) => {
    const attendanceId = req.params.attendanceId as string
    await checklistService.submitAll(attendanceId, req.user!.id)
    return sendSuccess(res, null, 'Checklist submitted')
  })


  // photo veiwer
  getByItemAndDate = catchAsync(async (req, res) => {
    const itemId    = Number(req.params.itemId)
    const companyId = Number(req.query.companyId)
    const date      = req.query.date
      ? new Date(req.query.date as string)
      : new Date()

    const params = {
      page:  Number(req.query.page)  || 1,
      limit: Number(req.query.limit) || 10,
    }

    const result = await checklistService.getByItemAndDate(itemId, companyId, date, params)
    return sendSuccess(res, result, 'Photos fetched')
  })
}

export const checklistController = new ChecklistController()