// Shared demo dataset: 20 VisitLog rows for the seeded SUPERVISOR, all
// landing on the same single day, round-robining the 3 seeded companies.
// Used both by `scripts/manual-test-seed-visits.ts` and the production
// reset-demo job.
import prisma from '../lib/prisma'
import { getToday } from '../utils/date'

const SUPERVISOR_EMAIL = 'made.wirawan@ams.local'
const TARGET_COMPANY_NAMES = ['PT Sanjaya Abadi', 'PT Mitra Sejahtera', 'CV Berkah Jaya']
const VISITS_TO_CREATE = 20
const SEED_MARKER = '[seed-visit]'

function picsumUrl(seed: string) {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/400/400`
}

const VISIT_LOCATION = {
  latitude: -6.2088,
  longitude: 106.8456,
  location_address: 'Jl. Jenderal Sudirman No. 1, Jakarta Pusat, DKI Jakarta, Indonesia',
}

export async function seedVisitData() {
  const supervisor = await prisma.user.findUnique({ where: { email: SUPERVISOR_EMAIL } })
  const companies = await prisma.company.findMany({ where: { name: { in: TARGET_COMPANY_NAMES } } })
  if (!supervisor || companies.length === 0) {
    // seedCompaniesAndStaff() hasn't run yet -- nothing to attach visits to.
    return { supervisor: null, date: null, deletedCount: 0, created: 0 }
  }

  const { date: visitDate } = getToday()

  const { count: deletedCount } = await prisma.visitLog.deleteMany({
    where: { user_id: supervisor.id, notes: { contains: SEED_MARKER } },
  })

  // Spread 20 visits across a working day (08:00-17:00), ~27 min apart.
  const startMinutes = 8 * 60
  const spanMinutes = 9 * 60
  const stepMinutes = spanMinutes / VISITS_TO_CREATE

  for (let index = 0; index < VISITS_TO_CREATE; index++) {
    const company = companies[index % companies.length]
    const minutesFromMidnight = startMinutes + Math.round(index * stepMinutes)
    const visitedAt = new Date(visitDate)
    visitedAt.setUTCHours(0, minutesFromMidnight, 0, 0)

    await prisma.visitLog.create({
      data: {
        user_id: supervisor.id,
        company_id: company.id,
        date: visitDate,
        visited_at: visitedAt,
        photo_url: picsumUrl(`visit-${supervisor.id}-${index}`),
        ...VISIT_LOCATION,
        notes: `${SEED_MARKER} Routine check at ${company.name} (#${index + 1})`,
      },
    })
  }

  return { supervisor: supervisor.name, date: visitDate.toISOString().slice(0, 10), deletedCount, created: VISITS_TO_CREATE }
}
