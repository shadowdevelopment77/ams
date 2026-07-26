// Disposable, paired with e2e-test-cleanup.ts (2026-07-23 overnight
// Playwright session). Creates fixed-identity fixtures via the real HTTP
// API (not direct Prisma writes) so the created data is exactly what the
// real app would produce. Run cleanup first, then this, before each
// Playwright run. Writes the fixture IDs/credentials directly to
// frontend/e2e/fixtures/data.json (not via stdout redirection --
// importing the Prisma client makes dotenv print banner lines to stdout,
// which would otherwise land ahead of the JSON and corrupt the file).
import fs from 'fs'
import path from 'path'
import bcrypt from 'bcryptjs'
import prisma from '../src/lib/prisma'
import { getToday } from '../src/utils/date'

const BASE = process.env.BASE || 'http://localhost:3000'
const FIXTURES_PATH = path.join(__dirname, '../../frontend/e2e/fixtures/data.json')

async function main() {
  const stamp = Date.now()

  const loginRes = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@ams.local', password: 'Admin123!' }),
  })
  const cookie = loginRes.headers.get('set-cookie')!.split(';')[0]

  async function adminPost(path: string, body: unknown): Promise<any> {
    const res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify(body),
    })
    const json: any = await res.json()
    if (!res.ok || !json.success) {
      throw new Error(`${path} failed: ${res.status} ${JSON.stringify(json)}`)
    }
    return json.data
  }

  const company = await adminPost('/api/company', {
    name: `E2E Playwright Co ${stamp}`,
    code: `E2EPW-${stamp}`,
  })

  const division = await adminPost('/api/divisions', {
    company_id: company.id,
    name: 'E2E Playwright Division',
  })

  const shift = await adminPost('/api/shift', {
    company_id: company.id,
    division_id: division.id,
    name: 'E2E Playwright Shift',
    start_time: '00:01',
    end_time: '23:59',
  })

  const template = await adminPost('/api/checklist/templates', {
    company_id: company.id,
    division_id: division.id,
    title: 'E2E Playwright Checklist',
  })

  const itemDescriptions = [
    'Check fire extinguisher',
    'Inspect emergency exit signage',
    'Verify first aid kit is stocked',
  ]
  const items = []
  for (let i = 0; i < itemDescriptions.length; i++) {
    items.push(
      await adminPost('/api/checklist/items', {
        template_id: template.id,
        order_no: i + 1,
        description: itemDescriptions[i],
        requires_photo: true,
      })
    )
  }

  const staffEmail = 'e2e-playwright-staff@test.local'
  const staffPassword = 'Password123!'
  await adminPost('/api/auth/register', {
    name: 'E2E Playwright Staff',
    email: staffEmail,
    password: staffPassword,
    role: 'STAFF',
    company_id: company.id,
    division_id: division.id,
  })

  // Direct Prisma writes (not the HTTP API) for the supervisor + visit log --
  // registering a 3rd account and logging in as it just to POST a multipart
  // photo would burn 2 more requests against the tight authLimiter budget
  // (10 req/15min) that this suite is already running close to. A visit log
  // doesn't need a real Cloudinary upload to be useful as a fixture, so this
  // mirrors the same shortcut backend/src/__tests__/helpers/factories.ts's
  // createVisitLog takes for Jest.
  const supervisorRole = await prisma.userRole.findFirst({ where: { name: 'SUPERVISOR' } })
  if (!supervisorRole) throw new Error('SUPERVISOR role not seeded -- check prisma/seed.ts')

  const supervisorName = 'E2E Playwright Supervisor'
  const supervisorEmail = 'e2e-playwright-supervisor@test.local'
  const supervisorPassword = 'Password123!'
  const supervisor = await prisma.user.create({
    data: {
      name: supervisorName,
      email: supervisorEmail,
      password: await bcrypt.hash(supervisorPassword, 10),
    },
  })
  await prisma.userCompanyRole.create({
    data: { user_id: supervisor.id, role_id: supervisorRole.id, company_id: null, division_id: null },
  })
  const { today, date } = getToday()
  await prisma.visitLog.create({
    data: {
      user_id: supervisor.id,
      company_id: company.id,
      date,
      photo_url: 'https://fake-cdn.test/e2e-visit.jpg',
      visited_at: today,
      notes: 'E2E fixture visit',
    },
  })

  const fixtures = {
    companyId: company.id,
    divisionId: division.id,
    shiftId: shift.id,
    templateId: template.id,
    itemIds: items.map((i) => i.id),
    staffEmail,
    staffPassword,
    supervisorName,
    supervisorEmail,
    supervisorPassword,
  }
  fs.writeFileSync(FIXTURES_PATH, JSON.stringify(fixtures))
  console.log(JSON.stringify(fixtures))
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
