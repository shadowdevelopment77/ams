// Jest `globalSetup` — runs ONCE before the entire test run, in its own
// process, before any test file or setupFilesAfterEnv hook runs. It does not
// share memory with your test files, so it loads its own env and creates its
// own short-lived Prisma connection.
import dotenv from 'dotenv'
import path from 'path'
import { execSync } from 'child_process'

export default async function globalSetup() {
  dotenv.config({ path: path.resolve(__dirname, '../../.env.test') })

  if (!process.env.DATABASE_URL) {
    throw new Error(
      'DATABASE_URL is not set. Did you create backend/.env.test?'
    )
  }

  console.log('\n[globalSetup] Applying migrations to test database...')
  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: { ...process.env },
  })

  // Import AFTER migrations are applied, so the generated client matches
  // the schema that's now actually in the DB.
  const { default: prisma } = await import('../lib/prisma')

  console.log('[globalSetup] Seeding lookup tables (UserRole, AttendanceStatus)...')

  const ROLES = ['ADMIN', 'SUPERVISOR', 'STAFF']
  for (const name of ROLES) {
    const existing = await prisma.userRole.findFirst({ where: { name } })
    if (!existing) await prisma.userRole.create({ data: { name } })
  }

  const STATUSES = ['PRESENT', 'LATE']
  for (const name of STATUSES) {
    const existing = await prisma.attendanceStatus.findFirst({ where: { name } })
    if (!existing) await prisma.attendanceStatus.create({ data: { name } })
  }

  await prisma.$disconnect()
  console.log('[globalSetup] Done.\n')
}