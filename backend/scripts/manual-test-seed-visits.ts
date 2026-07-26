// One-off manual-testing data: 20 VisitLog rows for the seeded SUPERVISOR,
// all on the same day. Deletes+regenerates its own marked rows on every run
// (see demoVisits.ts for why -- a "one visit per index" incremental
// approach can't cleanly re-shape rows onto a new single target day).
//
// Logic lives in ../src/seed/demoVisits.ts, shared with the production
// reset-demo job (see backend/src/modules/admin/).
//
// Run: npx ts-node scripts/manual-test-seed-visits.ts
import prisma from '../src/lib/prisma'
import { seedVisitData } from '../src/seed/demoVisits'

async function main() {
  const result = await seedVisitData()
  console.log(JSON.stringify(result, null, 2))
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
