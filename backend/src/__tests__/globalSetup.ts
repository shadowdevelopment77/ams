// Jest globalSetup: runs once, in its own process, before any test file.
import dotenv from 'dotenv'
import path from 'path'
import { execSync } from 'child_process'
import { Client } from 'pg'

// Prisma's fixed advisory lock id for `migrate deploy`. A non-gracefully
// killed prior run can leave this held by an orphaned session (Neon's
// pooler + session-scoped advisory locks don't mix well), blocking every
// future migrate deploy for its full timeout -- clear it proactively.
const MIGRATE_ADVISORY_LOCK_ID = 72707369

// The pooler can hand us the exact backend pid an earlier session's lock
// is still attached to, so pg_locks may report OUR OWN session as the
// holder -- must skip that pid, and must not let a failed terminate crash
// the process (both handled below).
async function clearStaleMigrationLock(databaseUrl: string) {
  const client = new Client({ connectionString: databaseUrl })
  client.on('error', (err) => {
    console.warn('[globalSetup] Lock-check connection dropped:', err.message)
  })

  try {
    await client.connect()
    const ownPid = (await client.query('SELECT pg_backend_pid() AS pid')).rows[0].pid
    const { rows } = await client.query(
      'SELECT pid FROM pg_locks WHERE locktype = $1 AND objid = $2 AND granted = true',
      ['advisory', MIGRATE_ADVISORY_LOCK_ID]
    )
    for (const { pid } of rows) {
      if (pid === ownPid) continue
      console.log(
        `[globalSetup] Found a stale migration advisory lock held by pid ${pid} -- terminating it before proceeding.`
      )
      try {
        await client.query('SELECT pg_terminate_backend($1)', [pid])
      } catch (err) {
        console.warn(`[globalSetup] Couldn't terminate pid ${pid}, proceeding anyway:`, err)
      }
    }
  } catch (err) {
    console.warn('[globalSetup] Could not check for a stale migration lock, proceeding anyway:', err)
  } finally {
    try {
      await client.end()
    } catch {
      // already dead, nothing to clean up
    }
  }
}

export default async function globalSetup() {
  dotenv.config({ path: path.resolve(__dirname, '../../.env.test') })

  if (!process.env.DATABASE_URL) {
    throw new Error(
      'DATABASE_URL is not set. Did you create backend/.env.test?'
    )
  }

  await clearStaleMigrationLock(process.env.DATABASE_URL)

  console.log('\n[globalSetup] Applying migrations to test database...')
  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: { ...process.env },
  })

  // Import AFTER migrations are applied, so the generated client matches
  // the schema that's now actually in the DB.
  const { default: prisma, disconnectPrisma } = await import('../lib/prisma')

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

  await disconnectPrisma()
  console.log('[globalSetup] Done.\n')
}