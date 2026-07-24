// Disposable, paired with e2e-test-cleanup.ts (2026-07-23 overnight
// Playwright session). Creates fixed-identity fixtures via the real HTTP
// API (not direct Prisma writes) so the created data is exactly what the
// real app would produce. Run cleanup first, then this, before each
// Playwright run. Prints the fixture IDs/credentials as JSON to stdout.
const BASE = process.env.BASE || 'http://localhost:3000'

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

  console.log(
    JSON.stringify({
      companyId: company.id,
      divisionId: division.id,
      shiftId: shift.id,
      templateId: template.id,
      itemIds: items.map((i) => i.id),
      staffEmail,
      staffPassword,
    })
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
