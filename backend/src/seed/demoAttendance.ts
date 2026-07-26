// Shared demo dataset: ~20 attendance records for YESTERDAY (not today, to
// avoid colliding with @@unique([user_id, date]) against demoChecklists.ts's
// today-dated attendance) -- roughly half checkin-only, half
// checkin+checkout. Used both by `scripts/manual-test-seed-attendance.ts`
// and the production reset-demo job.
import prisma from '../lib/prisma'
import { getToday } from '../utils/date'
import { toDateTime } from '../utils/shift'

const TARGET_STAFF_COUNT = 20
const TARGET_COMPANY_NAME = 'PT Sanjaya Abadi'
const TARGET_DIVISION_NAME = 'Security'

function picsumUrl(seed: string) {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/400/400`
}

const CHECKIN_LOCATION = {
  latitude: -6.2088,
  longitude: 106.8456,
  location_address: 'Jl. Jenderal Sudirman No. 1, Jakarta Pusat, DKI Jakarta, Indonesia',
}

const CHECKOUT_LOCATION = {
  checkout_latitude: -6.2088,
  checkout_longitude: 106.8456,
  checkout_address: 'Jl. Jenderal Sudirman No. 1, Jakarta Pusat, DKI Jakarta, Indonesia',
}

async function getPresentStatusId() {
  const status = await prisma.attendanceStatus.findFirstOrThrow({ where: { name: 'PRESENT' } })
  return status.id
}

async function getLateStatusId() {
  const status = await prisma.attendanceStatus.findFirstOrThrow({ where: { name: 'LATE' } })
  return status.id
}

export async function seedAttendanceData() {
  const { date: today } = getToday()
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)

  const presentStatusId = await getPresentStatusId()
  const lateStatusId = await getLateStatusId()

  const targetCompany = await prisma.company.findFirst({ where: { name: TARGET_COMPANY_NAME } })
  const targetDivision = targetCompany
    ? await prisma.division.findFirst({ where: { company_id: targetCompany.id, name: TARGET_DIVISION_NAME } })
    : null

  if (!targetCompany || !targetDivision) {
    // seedCompaniesAndStaff() hasn't run yet (or the target division was
    // renamed) -- nothing to attach attendance to.
    return { date: yesterday.toISOString().slice(0, 10), staffConsidered: 0, attendancesCreated: 0, checkedOutCount: 0, checkinOnlyCount: 0 }
  }

  const securityStaff = await prisma.userCompanyRole.findMany({
    where: {
      company_id: targetCompany.id,
      division_id: targetDivision.id,
      is_deleted: false,
      userRole: { name: 'STAFF' },
      user: { is_active: true },
    },
    include: { user: true },
  })

  const otherStaff = await prisma.userCompanyRole.findMany({
    where: {
      company_id: { not: null },
      division_id: { not: null },
      NOT: { AND: [{ company_id: targetCompany.id }, { division_id: targetDivision.id }] },
      is_deleted: false,
      userRole: { name: 'STAFF' },
      user: { is_active: true },
    },
    include: { user: true },
  })

  const remainingSlots = Math.max(0, TARGET_STAFF_COUNT - securityStaff.length)
  const selectedRoles = [...securityStaff, ...otherStaff.slice(0, remainingSlots)]

  let attendancesCreated = 0
  let checkedOutCount = 0

  for (let i = 0; i < selectedRoles.length; i++) {
    const role = selectedRoles[i]
    const companyId = role.company_id!
    const divisionId = role.division_id!

    const existing = await prisma.attendance.findUnique({
      where: { user_id_date: { user_id: role.user_id, date: yesterday } },
    })
    if (existing) continue

    const shift = await prisma.shift.findFirst({ where: { company_id: companyId, division_id: divisionId } })
    if (!shift) continue

    // Alternate a few minutes early/late around shift start for variety.
    const minuteOffset = (i % 4) * 5 - 5 // -5, 0, 5, 10
    const checkInAt = new Date(toDateTime(yesterday, shift.start_time).getTime() + minuteOffset * 60000)
    const shiftStart = toDateTime(yesterday, shift.start_time)
    const isLate = checkInAt > shiftStart
    const lateMinutes = isLate ? Math.floor((checkInAt.getTime() - shiftStart.getTime()) / 60000) : 0

    const willCheckOut = i % 2 === 0

    const data: Parameters<typeof prisma.attendance.create>[0]['data'] = {
      user_id: role.user_id,
      company_id: companyId,
      division_id: divisionId,
      shift_id: shift.id,
      date: yesterday,
      check_in_at: checkInAt,
      photo_url: picsumUrl(`attendance-checkin-${role.user_id}-${yesterday.toISOString()}`),
      ...CHECKIN_LOCATION,
      is_late: isLate,
      late_minutes: lateMinutes,
      status_id: isLate ? lateStatusId : presentStatusId,
    }

    if (willCheckOut) {
      const shiftEnd = toDateTime(yesterday, shift.end_time)
      const checkOutAt = new Date(shiftEnd.getTime() + 5 * 60000) // 5 min after shift end
      data.check_out_at = checkOutAt
      data.checkout_photo_url = picsumUrl(`attendance-checkout-${role.user_id}-${yesterday.toISOString()}`)
      Object.assign(data, CHECKOUT_LOCATION)
      data.early_leave = false
      checkedOutCount++
    }

    await prisma.attendance.create({ data })
    attendancesCreated++
  }

  return {
    date: yesterday.toISOString().slice(0, 10),
    staffConsidered: selectedRoles.length,
    attendancesCreated,
    checkedOutCount,
    checkinOnlyCount: attendancesCreated - checkedOutCount,
  }
}
