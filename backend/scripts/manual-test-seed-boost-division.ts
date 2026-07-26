// One-off manual-testing data: adds ~10 more STAFF into PT Sanjaya Abadi's
// existing "Security" division (currently 2: Budi Santoso, Siti Rahma),
// bringing it to 12 -- so that division's checklist item groups (each
// staff contributing 1-3 photos, see manual-test-seed-checklist.ts) reach
// roughly 20+ photos per item, enough to review how the admin Checklists
// page's "...see more" grouping copes with a heavy photo group.
//
// Mirrors manual-test-seed.ts's exact pattern (same shared password,
// idempotent find-by-email) -- just targets an already-existing
// company/division instead of creating new ones.
//
// Run: npx ts-node scripts/manual-test-seed-boost-division.ts
import bcrypt from 'bcryptjs'
import prisma from '../src/lib/prisma'

const PASSWORD = 'Password123!'
const TARGET_COMPANY_NAME = 'PT Sanjaya Abadi'
const TARGET_DIVISION_NAME = 'Security'

const NEW_STAFF_NAMES = [
  'Rudi Hartono',
  'Sri Wahyuni',
  'Bambang Sutrisno',
  'Ani Suryani',
  'Dedi Kurniawan',
  'Nur Fadillah',
  'Wawan Setiadi',
  'Ratna Sari',
  'Ahmad Fauzi',
  'Indah Permata',
]

function toEmail(name: string) {
  return `${name.toLowerCase().replace(/\s+/g, '.')}@ams.local`
}

async function getOrCreateRole(name: 'STAFF') {
  const existing = await prisma.userRole.findFirst({ where: { name } })
  if (existing) return existing
  return prisma.userRole.create({ data: { name } })
}

async function getOrCreateUser(name: string, email: string, companyId: number, divisionId: number) {
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return existing

  const role = await getOrCreateRole('STAFF')
  const hashed = await bcrypt.hash(PASSWORD, 10)
  const user = await prisma.user.create({ data: { name, email, password: hashed, is_active: true } })
  await prisma.userCompanyRole.create({
    data: { user_id: user.id, role_id: role.id, company_id: companyId, division_id: divisionId },
  })
  return user
}

async function main() {
  const company = await prisma.company.findFirstOrThrow({ where: { name: TARGET_COMPANY_NAME } })
  const division = await prisma.division.findFirstOrThrow({
    where: { company_id: company.id, name: TARGET_DIVISION_NAME },
  })

  const created: { name: string; email: string }[] = []
  for (const name of NEW_STAFF_NAMES) {
    const email = toEmail(name)
    await getOrCreateUser(name, email, company.id, division.id)
    created.push({ name, email })
  }

  console.log(`\nShared password for every account below: ${PASSWORD}`)
  console.log(`Added to: ${company.name} / ${division.name}\n`)
  console.table(created)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
