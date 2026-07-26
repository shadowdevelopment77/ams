// One-off manual-testing data: gives every currently-assigned STAFF member
// a checked-in attendance for today plus a submitted checklist (3 fixed
// items, 1-3 photos each). Idempotent -- safe to re-run.
//
// Logic lives in ../src/seed/demoChecklists.ts, shared with the production
// reset-demo job (see backend/src/modules/admin/).
//
// Run: npx ts-node scripts/manual-test-seed-checklist.ts
import prisma from '../src/lib/prisma'
import { seedChecklistData } from '../src/seed/demoChecklists'

async function main() {
  const result = await seedChecklistData()
  console.log(JSON.stringify(result, null, 2))
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
