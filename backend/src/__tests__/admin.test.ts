import bcrypt from 'bcryptjs'
import prisma from '../lib/prisma'
import { api } from './helpers/request'
import {
  createAdmin,
  createCompany,
  createDivision,
  createShift,
  createStaff,
  getAttendanceStatus,
} from './helpers/factories'

const SECRET = 'test-reset-demo-secret'

describe('POST /api/admin/reset-demo', () => {
  const originalSecret = process.env.RESET_DEMO_SECRET

  beforeEach(() => {
    process.env.RESET_DEMO_SECRET = SECRET
  })

  afterAll(() => {
    process.env.RESET_DEMO_SECRET = originalSecret
  })

  it('rejects a request with no Authorization header', async () => {
    const res = await api().post('/api/admin/reset-demo')
    expect(res.status).toBe(401)
  })

  it('rejects a request with the wrong token', async () => {
    const res = await api().post('/api/admin/reset-demo').set('Authorization', 'Bearer wrong-token')
    expect(res.status).toBe(401)
  })

  it('wipes real Cloudinary photos, empties all company/staff data, resets the 2 demo admins, and never touches other admins', async () => {
    // Fixture: a "real visitor" attendance with a genuine Cloudinary URL --
    // this is what the job's Cloudinary-deletion path should pick up.
    const company = await createCompany()
    const division = await createDivision(company.id)
    const shift = await createShift(company.id, division.id)
    const { user: staffUser } = await createStaff(company.id, division.id)
    const presentStatus = await getAttendanceStatus('PRESENT')
    await prisma.attendance.create({
      data: {
        user_id: staffUser.id,
        company_id: company.id,
        division_id: division.id,
        shift_id: shift.id,
        date: new Date(),
        photo_url: 'https://res.cloudinary.com/demo/image/upload/v123/ams/attendance/real-visitor-photo.jpg',
        status_id: presentStatus.id,
      },
    })

    // A pre-existing OTHER admin (distinct from the 2 demo admins) must
    // survive completely untouched -- this is the "personal admin" case.
    const { user: otherAdmin, rawPassword: otherAdminPassword } = await createAdmin({
      email: 'someone-elses-personal-admin@test.local',
    })

    const res = await api().post('/api/admin/reset-demo').set('Authorization', `Bearer ${SECRET}`)
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)

    // Cloudinary delete was actually invoked (mocked in setup.ts).
    const cloudinaryMock = require('../lib/cloudinary').default
    expect(cloudinaryMock.api.delete_resources).toHaveBeenCalled()
    const deletedIds = cloudinaryMock.api.delete_resources.mock.calls.flat(2)
    expect(deletedIds).toContain('ams/attendance/real-visitor-photo')

    // Lookup tables untouched.
    const roleNames = (await prisma.userRole.findMany()).map((r) => r.name).sort()
    expect(roleNames).toEqual(['ADMIN', 'STAFF', 'SUPERVISOR'])
    const statusNames = (await prisma.attendanceStatus.findMany()).map((s) => s.name).sort()
    expect(statusNames).toEqual(['LATE', 'PRESENT'])

    // The fixture staff member and their attendance are gone.
    expect(await prisma.user.findUnique({ where: { id: staffUser.id } })).toBeNull()

    // The other (non-demo) admin is completely untouched, same password.
    const otherAdminAfter = await prisma.user.findUnique({ where: { id: otherAdmin.id } })
    expect(otherAdminAfter).not.toBeNull()
    expect(await bcrypt.compare(otherAdminPassword, otherAdminAfter!.password)).toBe(true)

    // The 2 demo admins exist with the known reset password.
    const demo1 = await prisma.user.findUnique({ where: { email: 'admin.demo1@ams.local' } })
    const demo2 = await prisma.user.findUnique({ where: { email: 'admin.demo2@ams.local' } })
    expect(demo1).not.toBeNull()
    expect(demo2).not.toBeNull()
    expect(await bcrypt.compare('DemoAdmin123!', demo1!.password)).toBe(true)
    expect(await bcrypt.compare('DemoAdmin123!', demo2!.password)).toBe(true)

    // Nothing gets reseeded anymore -- production stays empty until an
    // ADMIN creates real content through the UI.
    expect(await prisma.company.count()).toBe(0)
    expect(
      await prisma.user.count({ where: { company_roles: { some: { userRole: { name: 'STAFF' } } } } })
    ).toBe(0)
  })

  it('resets an existing demo admin password back to the known value', async () => {
    // Simulate a demo admin whose password was changed by a previous visitor.
    const staleHash = await bcrypt.hash('SomethingElse!', 10)
    const role = await prisma.userRole.findFirstOrThrow({ where: { name: 'ADMIN' } })
    const demoUser = await prisma.user.create({
      data: { name: 'Demo Admin One', email: 'admin.demo1@ams.local', password: staleHash, is_active: true },
    })
    await prisma.userCompanyRole.create({
      data: { user_id: demoUser.id, role_id: role.id, company_id: null, division_id: null },
    })

    const res = await api().post('/api/admin/reset-demo').set('Authorization', `Bearer ${SECRET}`)
    expect(res.status).toBe(200)

    const demoAfter = await prisma.user.findUnique({ where: { email: 'admin.demo1@ams.local' } })
    expect(await bcrypt.compare('DemoAdmin123!', demoAfter!.password)).toBe(true)
  })
})
