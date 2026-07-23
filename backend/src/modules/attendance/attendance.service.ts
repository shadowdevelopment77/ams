import {
  attendanceRepository,
  shiftRepository,
  checklistTemplateRepository,
  checklistItemRepository,
  checklistSubmissionRepository,
  attendanceStatusRepository,
  companyRepository,
  divisionRepository

} from '../../repositories/index.repositories'
import { CheckInInput, CheckOutInput, EarlyLeaveReasonInput } from './attendance.validation'
import { AppError } from '../../utils/error.response/appError'
import { isNightShift, toDateTime } from '../../utils/shift'
import { reverseGeocode } from '../../utils/geocode'
import { AttendanceFilterParams } from '../../repositories/interfaces/attendance.interface'
import {getToday} from '../../utils/date'
import { Prisma } from '../../../generated/prisma'



export class AttendanceService {


  private async getCompanyOrThrow(id: number) {
    const company = await companyRepository.findById(id)
    if (!company) throw new AppError('Company not found', 404)
    return company
  }
  
    private async getDivisionOrThrow(id: number) {
    const division = await divisionRepository.findById(id)
    if (!division) throw new AppError('Division not found', 404)
    return division
  }

  private async validateCompanyAndDivision (companyId: number, divisionId: number){
    if (!companyId)  throw new AppError('Company is required', 400)
    if (!divisionId) throw new AppError('Division is required', 400)


      await Promise.all([
        this.getCompanyOrThrow(companyId),
        this.getDivisionOrThrow(divisionId)
      ])
  }

  private async getShift(shiftId: number) {
    const shift = await shiftRepository.findById(shiftId)
    
    if (!shift) throw new AppError('Shift not found', 404)
    return shift
  }

  private calculateLate(today: Date, shiftStartTime: string) {
    const shiftStart  = toDateTime(today, shiftStartTime)
    const isLate      = today > shiftStart
    const lateMinutes = isLate
      ? Math.floor((today.getTime() - shiftStart.getTime()) / 60000)
      : 0
    return { isLate, lateMinutes }
  }

  private async getAttendanceStatus(isLate: boolean) {
    const status = await attendanceStatusRepository.findByName(
      isLate ? 'LATE' : 'PRESENT'
    )
    if (!status) throw new AppError('Attendance status not found', 404)
    return status
  }

  private async getLocation(lat?: number, lng?: number) {
    return lat && lng ? await reverseGeocode(lat, lng) : undefined
  }

  private async bulkCreateChecklist(attendanceId: string, companyId: number, divisionId: number) {
    const templates = await checklistTemplateRepository.findByDivision(companyId, divisionId)
    
    const templateId = templates[0]?.id
    if (!templateId) return

    const items   = await checklistItemRepository.findByTemplate(templateId)

    const itemIds = items?.data?.map(i => i.id) || []
    if (itemIds.length === 0) return

    await checklistSubmissionRepository.bulkCreate(attendanceId, itemIds)
  }

  private async getAttendanceOrThrow(attendanceId: string) {
    const attendance = await attendanceRepository.findById(attendanceId)
    if (!attendance) throw new AppError('Attendance not found', 404)
    return attendance
  }

  private async checkUserDayAttendance(userId: string, date: Date) {
    const existing = await attendanceRepository.findByUser(userId, date)
    if (existing) throw new AppError('Already checked in today', 409)
  }

  
async checkIn(
    userId:     string,
    companyId:  number,
    divisionId: number,
    photoUrl:   string,
    dto:        CheckInInput
  ) {
    const { today, date } = getToday()

    await this.checkUserDayAttendance(userId, date)

    const shift                  = await this.getShift(dto.shift_id)
    if (shift.company_id !== companyId || shift.division_id !== divisionId) {
    throw new AppError('Shift does not belong to your division', 403) }
    const { isLate, lateMinutes } = this.calculateLate(today, shift.start_time)
    const status                 = await this.getAttendanceStatus(isLate)
    const locationAddress        = await this.getLocation(dto.latitude, dto.longitude)

   let attendance
  try {
    attendance = await attendanceRepository.create({
      user_id: userId,
      company_id: companyId,
      division_id: divisionId,
      shift_id: dto.shift_id,
      photo_url: photoUrl,
      date,
      latitude: dto.latitude,
      longitude: dto.longitude,
      location_address: locationAddress,
      status_id: status.id,
      is_late: isLate,
      late_minutes: lateMinutes,
    })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new AppError('Already checked in today', 409)
    }
    throw err
  }

  await this.bulkCreateChecklist(attendance.id, companyId, divisionId)
  return attendance
  }

  async checkOut(
    attendanceId: string,
    userId:       string,
    checkoutPhotoUrl: string,
    dto:          CheckOutInput
  ) {
    const attendance = await this.getAttendanceOrThrow(attendanceId)
    if (attendance.user_id !== userId) throw new AppError('Access denied', 403)
    if (attendance.check_out_at)  throw new AppError('Already checked out', 409)

    const shift    = await this.getShift(attendance.shift_id)
    const now      = new Date()
    const shiftEnd = toDateTime(now, shift.end_time)

    if (isNightShift(shift.start_time, shift.end_time)) {
      shiftEnd.setDate(shiftEnd.getDate() + 1)
    }

    const checkoutAddress = await this.getLocation(dto.checkout_latitude, dto.checkout_longitude)

    return attendanceRepository.checkOut(attendanceId, {
      check_out_at:       now,
      checkout_photo_url: checkoutPhotoUrl,
      checkout_latitude:  dto.checkout_latitude,
      checkout_longitude: dto.checkout_longitude,
      checkout_address:   checkoutAddress,
      early_leave:        now < shiftEnd,
    })
  }

  async submitEarlyLeaveReason(
  attendanceId: string,
  userId:       string,
  dto: EarlyLeaveReasonInput
) {
  const attendance = await this.getAttendanceOrThrow(attendanceId)

  // ownership check
  if (attendance.user_id !== userId) throw new AppError('Access denied', 403)

  // only if actually early leave
  if (!attendance.early_leave) throw new AppError('Not an early leave', 400)

  return attendanceRepository.update(attendanceId, {
    early_leave_reason: dto.early_leave_reason,
  })
}

  async getTodayAttendance(userId: string) {
    const { date } = getToday()
    return attendanceRepository.findByUser(userId, date)
  }


async getAttendancePhotos(
  companyId:  number,
  divisionId: number,
  date:       Date,
  params:     AttendanceFilterParams
) {

  await this.validateCompanyAndDivision(companyId, divisionId)
  const result = await attendanceRepository.findByDate(companyId, divisionId, date, params)

  return {
    ...result,
    data: result.data.map(a => ({
      user_id:           a.user_id,
      checkin_photo:     a.photo_url,
      checkin_at:        a.check_in_at,
      checkout_photo:    a.checkout_photo_url ?? null,
      checkout_at:       a.check_out_at ?? null,
    }))
  }
}


 async getByDate(
    companyId:  number,
    divisionId: number,
    date:       Date,
    params:     AttendanceFilterParams
  ) {

    await this.validateCompanyAndDivision(companyId, divisionId)

    return attendanceRepository.findByDate(companyId, divisionId, date, params)
  }

  async getLate(
    companyId:  number,
    divisionId: number,
    date:       Date,
    params:     AttendanceFilterParams
  ) {
    await this.validateCompanyAndDivision(companyId, divisionId)
    return attendanceRepository.findByLate(companyId, divisionId, true, date, params)
  }
}

export const attendanceService = new AttendanceService()