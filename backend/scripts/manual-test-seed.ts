// One-off manual-testing data set: 3 companies x 2-3 divisions each, 13
// STAFF + 1 SUPERVISOR (reuses the existing admin@ams.local -- no second
// admin created). Direct-Prisma, idempotent (find-or-create) -- safe to
// re-run. Deliberately does NOT create checklist templates beyond one
// default shift per division -- that's left to demoChecklists.ts / the
// admin panel itself.
//
// Logic lives in ../src/seed/demoCompaniesAndStaff.ts, shared with the
// production reset-demo job (see backend/src/modules/admin/).
//
// Run: npx ts-node scripts/manual-test-seed.ts
import prisma from '../src/lib/prisma'
import { seedCompaniesAndStaff } from '../src/seed/demoCompaniesAndStaff'

async function main() {
  const { password, created } = await seedCompaniesAndStaff()
  console.log(`\nShared password for every account below: ${password}`)
  console.log('Admin: reuse the existing admin@ams.local / Admin123!\n')
  console.table(created)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
