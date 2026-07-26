// One-off manual-testing data: gives every currently-assigned STAFF member
// (any company/division, not just ones from manual-test-seed.ts) a
// checked-in attendance for today plus a submitted checklist (3 fixed items,
// 1-3 photos each) against their division's checklist template -- so the
// admin Checklists page has a realistic volume of real photos to review
// without doing check-in -> checklist -> photo-upload by hand repeatedly.
//
// Photos are real, browser-loadable placeholder images (Picsum), written
// directly into the DB -- no Cloudinary upload, near-instant.
//
// Idempotent: safe to re-run (skips a staff member who already has today's
// attendance/submissions).
//
// Run: npx ts-node scripts/manual-test-seed-checklist.ts
import prisma from '../src/lib/prisma'
import { getToday } from '../src/utils/date'

const ITEM_DESCRIPTIONS = [
  'Check fire extinguisher',
  'Inspect emergency exits',
  'Verify uniform compliance',
]

function picsumUrl(seed: string) {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/400/400`
}

// Fixed fake location so seeded attendance mirrors real check-ins (which
// capture GPS -> reverse-geocode into location_address); the checklist
// evidence viewer reads this off the parent Attendance, not the submission.
const SEED_LOCATION = {
  latitude: -6.2088,
  longitude: 106.8456,
  location_address: 'Jl. Jenderal Sudirman No. 1, Jakarta Pusat, DKI Jakarta, Indonesia',
}

async function getOrCreateTemplate(companyId: number, divisionId: number) {
  let template = await prisma.checklistTemplate.findFirst({
    where: { company_id: companyId, division_id: divisionId, is_deleted: false },
  })
  if (!template) {
    template = await prisma.checklistTemplate.create({
      data: { company_id: companyId, division_id: divisionId, title: 'Daily Checklist' },
    })
  }

  const existingItems = await prisma.checklistItem.findMany({
    where: { template_id: template.id, is_deleted: false },
  })
  if (existingItems.length > 0) return { template, items: existingItems }

  const items = []
  for (let i = 0; i < ITEM_DESCRIPTIONS.length; i++) {
    items.push(
      await prisma.checklistItem.create({
        data: {
          template_id: template.id,
          order_no: i + 1,
          description: ITEM_DESCRIPTIONS[i],
          requires_photo: true,
        },
      })
    )
  }
  return { template, items }
}

async function getOrCreateShift(companyId: number, divisionId: number) {
  const existing = await prisma.shift.findFirst({ where: { company_id: companyId, division_id: divisionId } })
  if (existing) return existing
  return prisma.shift.create({
    data: { company_id: companyId, division_id: divisionId, name: 'Morning Shift', start_time: '08:00', end_time: '16:00' },
  })
}

async function getPresentStatusId() {
  const status = await prisma.attendanceStatus.findFirstOrThrow({ where: { name: 'PRESENT' } })
  return status.id
}

async function main() {
  const { date } = getToday()
  const presentStatusId = await getPresentStatusId()

  const staffRoles = await prisma.userCompanyRole.findMany({
    where: {
      company_id: { not: null },
      division_id: { not: null },
      is_deleted: false,
      userRole: { name: 'STAFF' },
      user: { is_active: true },
    },
    include: { user: true },
  })

  let attendancesCreated = 0
  let submissionsCreated = 0
  let photosCreated = 0

  for (const role of staffRoles) {
    const companyId = role.company_id!
    const divisionId = role.division_id!

    const { items } = await getOrCreateTemplate(companyId, divisionId)
    const shift = await getOrCreateShift(companyId, divisionId)

    let attendance = await prisma.attendance.findUnique({
      where: { user_id_date: { user_id: role.user_id, date } },
    })
    if (!attendance) {
      attendance = await prisma.attendance.create({
        data: {
          user_id: role.user_id,
          company_id: companyId,
          division_id: divisionId,
          shift_id: shift.id,
          date,
          photo_url: picsumUrl(`checkin-${role.user_id}`),
          status_id: presentStatusId,
          ...SEED_LOCATION,
        },
      })
      attendancesCreated++
    }

    for (const item of items) {
      const existingSubmission = await prisma.checklistSubmission.findFirst({
        where: { attendance_id: attendance.id, item_id: item.id, is_deleted: false },
      })
      if (existingSubmission) continue

      const submission = await prisma.checklistSubmission.create({
        data: {
          attendance_id: attendance.id,
          item_id: item.id,
          is_submitted: true,
          submitted_at: new Date(),
        },
      })
      submissionsCreated++

      const photoCount = 1 + Math.floor(Math.random() * 3) // 1-3
      for (let i = 0; i < photoCount; i++) {
        await prisma.checklistPhoto.create({
          data: {
            submission_id: submission.id,
            photo_url: picsumUrl(`${submission.id}-${i}`),
            order: i + 1,
          },
        })
        photosCreated++
      }
    }
  }

  console.log(
    JSON.stringify(
      { staffProcessed: staffRoles.length, attendancesCreated, submissionsCreated, photosCreated },
      null,
      2
    )
  )
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
