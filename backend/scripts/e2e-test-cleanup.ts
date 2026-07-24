// Disposable, reused repeatedly during the frontend E2E testing session
// (2026-07-23 overnight run) — resets fixed-email E2E test fixtures so
// Playwright runs are idempotent despite the backend's daily
// one-checkin-per-user constraint. Deleted once the run is done and
// stable, per this project's "disposable script" convention.
import prisma from '../src/lib/prisma'

const TEST_EMAIL_PREFIX = 'e2e-playwright-'
const TEST_COMPANY_PREFIX = 'E2E Playwright Co'

async function main() {
  const users = await prisma.user.findMany({
    where: { email: { startsWith: TEST_EMAIL_PREFIX } },
  })
  const userIds = users.map((u) => u.id)

  if (userIds.length > 0) {
    const attendances = await prisma.attendance.findMany({ where: { user_id: { in: userIds } } })
    const attendanceIds = attendances.map((a) => a.id)
    if (attendanceIds.length > 0) {
      const submissions = await prisma.checklistSubmission.findMany({
        where: { attendance_id: { in: attendanceIds } },
      })
      const submissionIds = submissions.map((s) => s.id)
      if (submissionIds.length > 0) {
        await prisma.checklistPhoto.deleteMany({ where: { submission_id: { in: submissionIds } } })
      }
      await prisma.checklistSubmission.deleteMany({ where: { attendance_id: { in: attendanceIds } } })
    }
    await prisma.visitLog.deleteMany({ where: { user_id: { in: userIds } } })
    await prisma.attendance.deleteMany({ where: { user_id: { in: userIds } } })
    await prisma.session.deleteMany({ where: { user_id: { in: userIds } } })
    await prisma.userCompanyRole.deleteMany({ where: { user_id: { in: userIds } } })
    await prisma.user.deleteMany({ where: { id: { in: userIds } } })
  }

  const companies = await prisma.company.findMany({
    where: { name: { startsWith: TEST_COMPANY_PREFIX } },
  })
  const companyIds = companies.map((c) => c.id)
  if (companyIds.length > 0) {
    const divisions = await prisma.division.findMany({ where: { company_id: { in: companyIds } } })
    const divisionIds = divisions.map((d) => d.id)
    if (divisionIds.length > 0) {
      const templates = await prisma.checklistTemplate.findMany({
        where: { division_id: { in: divisionIds } },
      })
      const templateIds = templates.map((t) => t.id)
      if (templateIds.length > 0) {
        await prisma.checklistItem.deleteMany({ where: { template_id: { in: templateIds } } })
        await prisma.checklistTemplate.deleteMany({ where: { id: { in: templateIds } } })
      }
      await prisma.shift.deleteMany({ where: { division_id: { in: divisionIds } } })
      await prisma.division.deleteMany({ where: { id: { in: divisionIds } } })
    }
    await prisma.company.deleteMany({ where: { id: { in: companyIds } } })
  }

  console.log(
    JSON.stringify({
      usersRemoved: userIds.length,
      companiesRemoved: companyIds.length,
    })
  )
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
