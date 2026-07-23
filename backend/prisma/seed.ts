import bcrypt from 'bcryptjs'
import prisma from '../src/lib/prisma'

// Dev/test-only bootstrap admin — there's no other way to create the first
// user, since POST /api/auth/register itself requires an authenticated ADMIN.
const ADMIN_EMAIL = 'admin@ams.local'
const ADMIN_PASSWORD = 'Admin123!'

async function main() {
  await prisma.userRole.createMany({
    data: [
      { name: 'ADMIN' },
      { name: 'SUPERVISOR' },
      { name: 'STAFF' },
    ],
    skipDuplicates: true,
  })

  await prisma.attendanceStatus.createMany({
    data: [
      { name: 'PRESENT' },
      { name: 'LATE' },
    ],
    skipDuplicates: true,
  })

  if (process.env.NODE_ENV !== 'production') {
    const adminRole = await prisma.userRole.findFirstOrThrow({ where: { name: 'ADMIN' } })
    const hashed = await bcrypt.hash(ADMIN_PASSWORD, 10)

    const admin = await prisma.user.upsert({
      where: { email: ADMIN_EMAIL },
      update: {},
      create: { name: 'Admin', email: ADMIN_EMAIL, password: hashed },
    })

    const existingRole = await prisma.userCompanyRole.findFirst({
      where: { user_id: admin.id, role_id: adminRole.id },
    })
    if (!existingRole) {
      await prisma.userCompanyRole.create({
        data: { user_id: admin.id, role_id: adminRole.id, company_id: null, division_id: null },
      })
    }

    console.log(`Seeded dev admin -> email: ${ADMIN_EMAIL}  password: ${ADMIN_PASSWORD}`)
  }

  console.log('Seed done')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
