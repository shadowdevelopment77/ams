// One-off manual-testing data: ~20 attendance records for yesterday, roughly
// half checkin-only, half checkin+checkout. Idempotent -- safe to re-run.
//
// Logic lives in ../src/seed/demoAttendance.ts, shared with the production
// reset-demo job (see backend/src/modules/admin/).
//
// Run: npx ts-node scripts/manual-test-seed-attendance.ts
import prisma from '../src/lib/prisma'
import { seedAttendanceData } from '../src/seed/demoAttendance'

async function main() {
  const result = await seedAttendanceData()
  console.log(JSON.stringify(result, null, 2))
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
