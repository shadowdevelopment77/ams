import { visitLogService } from './visit.service'
import { sendSuccess } from '../../utils/error.response/response'
import { catchAsync } from '../../utils/error.response/catch-async'
import { uploadImage } from '../../utils/uploadImage'
import { AppError } from '../../utils/error.response/appError'

export class VisitLogController {

    private parseVisitQuery(req:any){
        return{
    date:       req.query.date ? new Date(req.query.date as string) : new Date(),
    params: {
      page:     Number(req.query.page)  || 1,
      limit:    Number(req.query.limit) || 10,
    }
        }
    }

  create = catchAsync(async (req, res) => {
    if (!req.file) throw new AppError('Photo is required', 400)

    const photoUrl = await uploadImage(req.file.buffer, 'ams/visits')

    const result = await visitLogService.create(
      req.user!.id,
      photoUrl,
      req.body
    )
    return sendSuccess(res, result, 'Visit log created', 201)
  })

  getByUser = catchAsync(async (req, res) => {
    const {date, params} = this.parseVisitQuery(req)

    const result = await visitLogService.getByUser(req.user!.id, date, params)
    return sendSuccess(res, result, 'Visit logs fetched')
  })

  getVisitPhotos = catchAsync(async (req, res) => {
  const userId         = req.params.userId as string
  const {date, params} = this.parseVisitQuery(req)

  const result = await visitLogService.getVisitPhotos(userId, date, params)
  return sendSuccess(res, result, 'Visit photos fetched')
})

  getAll = catchAsync(async (req, res) => {
    const params = {
      page:  Number(req.query.page)  || 1,
      limit: Number(req.query.limit) || 10,
    }
    const result = await visitLogService.getAll(params)
    return sendSuccess(res, result, 'Visit logs fetched')
  })

  delete = catchAsync(async (req, res) => {
    await visitLogService.delete(Number(req.params.id))
    return sendSuccess(res, null, 'Visit log deleted')
  })
}

export const visitLogController = new VisitLogController()