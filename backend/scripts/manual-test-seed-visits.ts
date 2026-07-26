// One-off manual-testing data: 20 VisitLog rows for the seeded SUPERVISOR
// (Made Wirawan), all landing on the SAME single day (spread across working
// hours, round-robining the 3 seeded companies), with real Picsum photos --
// so both the admin Visits page's pagination (20 rows / limit 10 = 2 pages)
// and its date-filtered "Photos by staff member" lookup (which genuinely
// filters by date server-side, unlike the main list) have real volume to
// show for one day.
//
// VisitLog has no per-day uniqueness constraint (a supervisor can log
// multiple visits, including to the same company on the same day). Rows
// are marked via a `notes` prefix and deleted+regenerated on every run
// (rather than topped-up) since a "one visit per index" incremental
// approach can't cleanly re-shape already-created rows onto a new single
// target day.
//
// Run: npx ts-node scripts/manual-test-seed-visits.ts
import prisma from '../src/lib/prisma'
import { getToday } from '../src/utils/date'

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

async function main() {
  const supervisor = await prisma.user.findUniqueOrThrow({ where: { email: SUPERVISOR_EMAIL } })
  const companies = await prisma.company.findMany({ where: { name: { in: TARGET_COMPANY_NAMES } } })
  if (companies.length === 0) throw new Error('No target companies found -- run manual-test-seed.ts first')

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

  console.log(
    JSON.stringify(
      {
        supervisor: supervisor.name,
        date: visitDate.toISOString().slice(0, 10),
        deletedCount,
        created: VISITS_TO_CREATE,
      },
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
