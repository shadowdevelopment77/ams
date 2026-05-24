import prisma from "../../lib/prisma"
import { CheckInInput, CheckOutInput, AbsentRequestInput, VisitLogInput } from "./attendance.validation"

// helpers
const startOfDay = (date: Date) => {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

const endOfDay = (date: Date) => {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

const getDayName = (date: Date): string => {
  return date.toLocaleDateString("en-US", { weekday: "long" }).toUpperCase()
  // returns "MONDAY", "TUESDAY", etc
}

const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(":").map(Number)
  return hours * 60 + minutes
}

const nowToMinutes = (): number => {
  const now = new Date()
  return now.getHours() * 60 + now.getMinutes()
}

// ─── STAFF CHECKIN ───────────────────────────────────────────────
export const checkIn = async (
  user_id: number,
  input: CheckInInput & { photo_url: string }
) => {
  const now = new Date()

  // get staff assignment with division and shift
  const userRole = await prisma.userCompanyRole.findFirst({
    where: { user_id, role: "STAFF" },
    include: {
      division: {
        select: {
          id: true,
          working_days: true,
          late_tolerance_minutes: true,
        },
      },
    },
  })
  if (!userRole) throw new Error("Staff assignment not found")
  if (!userRole.division) throw new Error("Division not found")
  if (!userRole.company_id) throw new Error("Company not found")

  // get shift for this division
  const shift = await prisma.shift.findFirst({
    where: { division_id: userRole.division.id, is_active: true },
  })
  if (!shift) throw new Error("No active shift found for your division")

  // check if already has open attendance today (checked in but not out)
  const openAttendance = await prisma.attendance.findFirst({
    where: {
      user_id,
      check_in_at: { gte: startOfDay(now), lte: endOfDay(now) },
      check_out_at: null,
    },
  })
  if (openAttendance) {
    const time = openAttendance.check_in_at.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    })
    throw new Error(`You already checked in at ${time}. Please check out first.`)
  }

  // calculate late
  const shiftStartMinutes = timeToMinutes(shift.start_time)
  const currentMinutes = nowToMinutes()
  const toleranceMinutes = userRole.division.late_tolerance_minutes ?? 0
  const diffMinutes = currentMinutes - shiftStartMinutes
  const isLate = diffMinutes > toleranceMinutes
  const lateMinutes = isLate ? diffMinutes : 0

  return await prisma.attendance.create({
    data: {
      user_id,
      company_id: userRole.company_id,
      division_id: userRole.division.id,
      shift_id: shift.id,
      photo_url: input.photo_url,
      latitude: input.latitude,
      longitude: input.longitude,
      is_late: isLate,
      late_minutes: lateMinutes,
      status: isLate ? "LATE" : "PRESENT",
      check_in_at: now,
    },
  })
}

// ─── STAFF CHECKOUT ───────────────────────────────────────────────
export const checkOut = async (
  user_id: number, input: CheckOutInput & {checkout_photo_url: string}) => {
  const attendance = await prisma.attendance.findUnique({
    where: { id: input.attendance_id },
    include: { shift: true },
  })
  if (!attendance) throw new Error("Attendance not found")
  if (attendance.user_id !== user_id) throw new Error("Attendance not found")
  if (attendance.check_out_at) throw new Error("Already checked out")
  if (!attendance.shift) throw new Error("Shift not found")

  const now = new Date()
  const shiftEndMinutes = timeToMinutes(attendance.shift.end_time)
  const currentMinutes = nowToMinutes()

  // early leave = checkout more than 5 minutes before shift end
  const isEarlyLeave = currentMinutes < shiftEndMinutes - 5

  if (isEarlyLeave && !input.early_leave_reason) {
    throw new Error("Reason is required when checking out before shift ends")
  }

  return await prisma.attendance.update({
    where: { id: input.attendance_id },
    data: {
      check_out_at: now,
      checkout_photo_url: input.checkout_photo_url,
      checkout_latitude: input.latitude,
      checkout_longitude: input.longitude,
      early_leave: isEarlyLeave,
      early_leave_reason: isEarlyLeave ? input.early_leave_reason : null,
    },
  })
}

// ─── ABSENT REQUEST ───────────────────────────────────────────────
export const submitAbsentRequest = async (
  user_id: number,
  input: AbsentRequestInput & { proof_url?: string }
) => {
  const now = new Date()

  // get staff assignment
  const userRole = await prisma.userCompanyRole.findFirst({
    where: { user_id, role: "STAFF" },
  })
  if (!userRole) throw new Error("Staff assignment not found")
  if (!userRole.company_id) throw new Error("Company not found")
  if (!userRole.division_id) throw new Error("Division not found")

  // get shift
  const shift = await prisma.shift.findFirst({
    where: { division_id: userRole.division_id, is_active: true },
  })
  if (!shift) throw new Error("No active shift found")

  // check if already checked in today
  const alreadyCheckedIn = await prisma.attendance.findFirst({
    where: {
      user_id,
      check_in_at: { gte: startOfDay(now), lte: endOfDay(now) },
    },
  })
  if (alreadyCheckedIn) throw new Error("You already checked in today")

  // check if already submitted absent request today
  const alreadyRequested = await prisma.absentRequest.findFirst({
    where: {
      user_id,
      date: { gte: startOfDay(now), lte: endOfDay(now) },
    },
  })
  if (alreadyRequested) throw new Error("You already submitted an absent request today")

  return await prisma.absentRequest.create({
    data: {
      user_id,
      company_id: userRole.company_id,
      division_id: userRole.division_id,
      shift_id: shift.id,
      date: now,
      reason: input.reason,
      proof_url: input.proof_url ?? null,
      status: "PENDING",
    },
  })
}

// ─── GET MY ATTENDANCE ───────────────────────────────────────────
export const getMyAttendance = async (user_id: number) => {
  return await prisma.attendance.findMany({
    where: { user_id },
    orderBy: { check_in_at: "desc" },
    include: {
      shift: { select: { name: true, start_time: true, end_time: true } },
      division: { select: { name: true } },
    },
  })
}

export const getTodayAttendance = async (user_id: number) => {
  const now = new Date()
  return await prisma.attendance.findMany({
    where: {
      user_id,
      check_in_at: { gte: startOfDay(now), lte: endOfDay(now) },
    },
    include: {
      shift: { select: { name: true, start_time: true, end_time: true } },
    },
  })
}

// ─── VISIT LOG (SUPERVISOR) ───────────────────────────────────────
export const createVisitLog = async (
  user_id: number,
  input: VisitLogInput & { photo_url: string }
) => {
  // verify supervisor is assigned to this company
  const userRole = await prisma.userCompanyRole.findFirst({
    where: { user_id, company_id: input.company_id, role: "SUPERVISOR" },
  })
  if (!userRole) throw new Error("Company not found")

  return await prisma.visitLog.create({
    data: {
      user_id,
      company_id: input.company_id,
      photo_url: input.photo_url,
      latitude: input.latitude,
      longitude: input.longitude,
      notes: input.notes,
    },
  })
}

export const getMyVisitLogs = async (user_id: number) => {
  return await prisma.visitLog.findMany({
    where: { user_id },
    orderBy: { visited_at: "desc" },
    include: {
      company: { select: { id: true, name: true } },
    },
  })
}