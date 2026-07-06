import { attendanceService } from './attendance.service'
import { sendSuccess } from '../../utils/error.response/response'
import { catchAsync } from '../../utils/error.response/catch-async'
import { uploadImage } from '../../utils/uploadImage'
import { AppError } from '../../utils/error.response/appError'
export class AttendanceController {

  private parseAttendanceQuery(req: any) {
  return {
    companyId:  Number(req.query.companyId),
    divisionId: Number(req.query.divisionId),
    date:       req.query.date ? new Date(req.query.date as string) : new Date(),
    params: {
      page:     Number(req.query.page)  || 1,
      limit:    Number(req.query.limit) || 10,
      statusId: req.query.statusId ? Number(req.query.statusId) : undefined,
    }
  }
}



  checkIn = catchAsync(async (req, res) => {

  if (!req.file) throw new AppError('Photo is required', 400)

  const photo_url = await uploadImage(req.file.buffer, 'ams/attendance')

    const result = await attendanceService.checkIn(
      req.user!.id,
      req.user!.companyId!,
      req.user!.divisionId!,
      {... req.body, photo_url}
    )
    return sendSuccess(res, result, 'Check in successful', 201)
  })

   checkOut = catchAsync(async (req, res) => {

  if (!req.file) throw new AppError('Photo is required', 400)

  const photo_url = await uploadImage(req.file.buffer, 'ams/attendance') 

    const result = await attendanceService.checkOut(
      req.params.id as string,
      req.user!.id,
      {... req.body, checkout_photo_url: photo_url}
    )
    return sendSuccess(res, result, 'Check out successful')
  })

getAttendancePhotos = catchAsync(async (req, res) => {
const { companyId, divisionId, date, params } = this.parseAttendanceQuery(req)

  const result = await attendanceService.getAttendancePhotos(companyId, divisionId, date, params)
  return sendSuccess(res, result, 'Attendance photos fetched')
})

  getByDate = catchAsync(async (req, res) => {
const { companyId, divisionId, date, params } = this.parseAttendanceQuery(req)
    const result = await attendanceService.getByDate(companyId, divisionId, date, params)
    return sendSuccess(res, result, 'Attendance fetched')
  })

  getLate = catchAsync(async (req, res) => {
  const { companyId, divisionId, date, params } = this.parseAttendanceQuery(req)

    const result = await attendanceService.getLate(companyId, divisionId, date, params)
    return sendSuccess(res, result, 'Late attendance fetched')
  })

  submitEarlyLeaveReason = catchAsync(async (req, res) => {
  const result = await attendanceService.submitEarlyLeaveReason(
    req.params.id as string,
    req.user!.id,
    req.body.early_leave_reason
  )
  return sendSuccess(res, result, 'Early leave reason submitted')
})
}

export const attendanceController = new AttendanceController()