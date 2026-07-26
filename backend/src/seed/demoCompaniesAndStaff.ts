// Shared demo dataset: 3 companies x 2-3 divisions each, 13 STAFF + 1
// SUPERVISOR. Used both by `scripts/manual-test-seed.ts` (manual local
// testing) and the production reset-demo job (admin.service.ts) -- kept
// as one source of truth rather than duplicated in both places.
import bcrypt from 'bcryptjs'
import prisma from '../lib/prisma'

const PASSWORD = 'Password123!'

interface DivisionSeed {
  name: string
  staffNames: string[]
}

interface CompanySeed {
  name: string
  divisions: DivisionSeed[]
}

const COMPANIES: CompanySeed[] = [
  {
    name: 'PT Sanjaya Abadi',
    divisions: [
      { name: 'Security', staffNames: ['Budi Santoso', 'Siti Rahma'] },
      { name: 'Cleaning', staffNames: ['Andi Wijaya', 'Dewi Lestari'] },
      { name: 'Driver', staffNames: ['Agus Setiawan', 'Rina Kusuma'] },
    ],
  },
  {
    name: 'PT Mitra Sejahtera',
    divisions: [
      { name: 'Security', staffNames: ['Hendra Gunawan', 'Yuni Astuti'] },
      { name: 'Cleaning', staffNames: ['Joko Prasetyo', 'Wati Handayani'] },
    ],
  },
  {
    name: 'CV Berkah Jaya',
    divisions: [
      { name: 'Security', staffNames: ['Eko Purnomo', 'Lina Marlina'] },
      { name: 'Cleaning', staffNames: ['Fajar Nugroho'] },
    ],
  },
]

const SUPERVISOR_NAME = 'Made Wirawan'
const SUPERVISOR_EMAIL = 'made.wirawan@ams.local'

function toEmail(name: string) {
  return `${name.toLowerCase().replace(/\s+/g, '.')}@ams.local`
}

async function getOrCreateRole(name: 'ADMIN' | 'SUPERVISOR' | 'STAFF') {
  const existing = await prisma.userRole.findFirst({ where: { name } })
  if (existing) return existing
  return prisma.userRole.create({ data: { name } })
}

async function getOrCreateCompany(name: string) {
  const existing = await prisma.company.findFirst({ where: { name } })
  if (existing) return existing
  const code = name
    .split(/\s+/)
    .map((w) => {
      const letters = w.replace(/[^A-Za-z]/g, '')
      const isAllCaps = letters === letters.toUpperCase() && letters !== letters.toLowerCase()
      return isAllCaps ? letters.toUpperCase() : letters[0]?.toUpperCase() ?? ''
    })
    .join('')
  return prisma.company.create({ data: { name, code } })
}

async function getOrCreateDivision(companyId: number, name: string) {
  const existing = await prisma.division.findFirst({ where: { company_id: companyId, name } })
  if (existing) return existing
  return prisma.division.create({ data: { company_id: companyId, name, late_tolerance_minutes: 10 } })
}

async function getOrCreateShift(companyId: number, divisionId: number) {
  const existing = await prisma.shift.findFirst({ where: { company_id: companyId, division_id: divisionId } })
  if (existing) return existing
  return prisma.shift.create({
    data: { company_id: companyId, division_id: divisionId, name: 'Morning Shift', start_time: '08:00', end_time: '16:00' },
  })
}

async function getOrCreateUser(
  roleName: 'SUPERVISOR' | 'STAFF',
  name: string,
  email: string,
  companyId: number | null,
  divisionId: number | null
) {
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return existing

  const role = await getOrCreateRole(roleName)
  const hashed = await bcrypt.hash(PASSWORD, 10)
  const user = await prisma.user.create({ data: { name, email, password: hashed, is_active: true } })
  await prisma.userCompanyRole.create({
    data: { user_id: user.id, role_id: role.id, company_id: companyId, division_id: divisionId },
  })
  return user
}

export async function seedCompaniesAndStaff() {
  const created: { role: string; name: string; email: string; company?: string; division?: string }[] = []

  for (const companySeed of COMPANIES) {
    const company = await getOrCreateCompany(companySeed.name)

    for (const divisionSeed of companySeed.divisions) {
      const division = await getOrCreateDivision(company.id, divisionSeed.name)
      await getOrCreateShift(company.id, division.id)

      for (const staffName of divisionSeed.staffNames) {
        const email = toEmail(staffName)
        await getOrCreateUser('STAFF', staffName, email, company.id, division.id)
        created.push({ role: 'STAFF', name: staffName, email, company: company.name, division: division.name })
      }
    }
  }

  await getOrCreateUser('SUPERVISOR', SUPERVISOR_NAME, SUPERVISOR_EMAIL, null, null)
  created.push({ role: 'SUPERVISOR', name: SUPERVISOR_NAME, email: SUPERVISOR_EMAIL })

  return { password: PASSWORD, created }
}
