// Multi-user concurrency tests. Every existing race-condition test in this
// suite (e.g. auth.test.ts's duplicate-email register race) fires the SAME
// request repeatedly to prove idempotency/locking. These tests fire
// DIFFERENT requests from DIFFERENT users at the same instant, to catch a
// different class of bug entirely: request-context bleed, response
// cross-wiring, or DB contention under genuinely concurrent multi-actor load.

import prisma from '../lib/prisma'
import { api, loginAs } from './helpers/request'
import {
  createStaff,
  createSupervisor,
  createAdmin,
  createCompany,
  createDivision,
  createShift,
} from './helpers/factories'

const fakePhoto = () => Buffer.from('fake-image-bytes')

// GPS is mandatory on checkin/visit-create (Phase 15).
const FAKE_LAT = -6.2088
const FAKE_LNG = 106.8456

describe('Concurrency: different users, simultaneous requests', () => {
  it('concurrent logins from N distinct users each get back their own identity, mapped to their own session', async () => {
    const admin = await createAdmin()
    const supervisor = await createSupervisor()
    const company = await createCompany()
    const division = await createDivision(company.id)
    const staff = await createStaff(company.id, division.id)

    const actors = [
      { label: 'admin', user: admin.user, password: admin.rawPassword },
      { label: 'supervisor', user: supervisor.user, password: supervisor.rawPassword },
      { label: 'staff', user: staff.user, password: staff.rawPassword },
    ]

    const results = await Promise.all(
      actors.map((a) => loginAs(a.user.email, a.password))
    )

    results.forEach((res, i) => {
      expect(res.status).toBe(200)
      expect(res.body.data.user.id).toBe(actors[i].user.id)
      expect(res.body.data.user.email).toBe(actors[i].user.email)
    })

    // Every session row in the DB must map to the correct user — no
    // cross-wiring where session A's user_id ended up being user B's id.
    const sessions = await prisma.session.findMany()
    expect(sessions).toHaveLength(actors.length)
    for (const a of actors) {
      const owned = sessions.filter((s) => s.user_id === a.user.id)
      expect(owned).toHaveLength(1)
    }
  })

  it('concurrent GET /api/auth/me from N different sessions each return the correct caller, never a mixed-up identity', async () => {
    const admin = await createAdmin()
    const supervisor = await createSupervisor()
    const company = await createCompany()
    const division = await createDivision(company.id)
    const staff = await createStaff(company.id, division.id)

    const actors = [
      { user: admin.user, password: admin.rawPassword },
      { user: supervisor.user, password: supervisor.rawPassword },
      { user: staff.user, password: staff.rawPassword },
    ]

    const logins = await Promise.all(actors.map((a) => loginAs(a.user.email, a.password)))

    const meResults = await Promise.all(
      logins.map((login) => api().get('/api/auth/me').set('Cookie', login.cookie))
    )

    meResults.forEach((res, i) => {
      expect(res.status).toBe(200)
      expect(res.body.data.id).toBe(actors[i].user.id)
      expect(res.body.data.email).toBe(actors[i].user.email)
      expect(res.body.data.password).toBeUndefined()
    })
  })

  it('concurrent checkins from N different staff (different companies/divisions/shifts) each get attributed to the correct user', async () => {
    const setups = await Promise.all(
      [0, 1, 2].map(async (i) => {
        const company = await createCompany()
        const division = await createDivision(company.id)
        const shift = await createShift(company.id, division.id, {
          start_time: '00:01',
          end_time: '23:59',
        })
        const staff = await createStaff(company.id, division.id)
        const { cookie } = await loginAs(staff.user.email, staff.rawPassword)
        return { i, company, division, shift, staff, cookie }
      })
    )

    const results = await Promise.all(
      setups.map((s) =>
        api()
          .post('/api/attendance/checkin')
          .set('Cookie', s.cookie)
          .field('shift_id', s.shift.id)
          .field('latitude', FAKE_LAT)
          .field('longitude', FAKE_LNG)
          .attach('photo', fakePhoto(), 'photo.jpg')
      )
    )

    results.forEach((res) => expect(res.status).toBe(201))

    const rows = await prisma.attendance.findMany()
    expect(rows).toHaveLength(setups.length)
    for (const s of setups) {
      const row = rows.find((r) => r.user_id === s.staff.user.id)
      expect(row).toBeDefined()
      expect(row!.company_id).toBe(s.company.id)
      expect(row!.division_id).toBe(s.division.id)
      expect(row!.shift_id).toBe(s.shift.id)
    }
  })

  it('concurrent registration of N genuinely different emails by an admin all succeed with no lock contention/deadlock', async () => {
    const admin = await createAdmin()
    const { cookie } = await loginAs(admin.user.email, admin.rawPassword)

    const emails = [0, 1, 2, 3].map((i) => `concurrent-reg-${Date.now()}-${i}@test.local`)

    const results = await Promise.all(
      emails.map((email) =>
        api().post('/api/auth/register').set('Cookie', cookie).send({
          name: 'Concurrent User',
          email,
          password: 'Password123!',
          role: 'SUPERVISOR',
        })
      )
    )

    results.forEach((res, i) => {
      expect(res.status).toBe(201)
      expect(res.body.data.email).toBe(emails[i])
    })

    const users = await prisma.user.findMany({ where: { email: { in: emails } } })
    expect(users).toHaveLength(emails.length)
  })

  it('a heterogeneous burst of different endpoints from different users completes with no 500s and correct per-caller scoping', async () => {
    const admin = await createAdmin()
    const company = await createCompany()
    const division = await createDivision(company.id)
    const shift = await createShift(company.id, division.id, {
      start_time: '00:01',
      end_time: '23:59',
    })
    const staff = await createStaff(company.id, division.id)
    const supervisor = await createSupervisor()

    const [adminLogin, staffLogin, supervisorLogin] = await Promise.all([
      loginAs(admin.user.email, admin.rawPassword),
      loginAs(staff.user.email, staff.rawPassword),
      loginAs(supervisor.user.email, supervisor.rawPassword),
    ])

    const newCompanyName = `Burst-Co-${Date.now()}`

    const [checkinRes, visitRes, listRes, createRes] = await Promise.all([
      api()
        .post('/api/attendance/checkin')
        .set('Cookie', staffLogin.cookie)
        .field('shift_id', shift.id)
        .field('latitude', FAKE_LAT)
        .field('longitude', FAKE_LNG)
        .attach('photo', fakePhoto(), 'photo.jpg'),
      api()
        .post('/api/visit')
        .set('Cookie', supervisorLogin.cookie)
        .field('company_id', company.id)
        .field('latitude', FAKE_LAT)
        .field('longitude', FAKE_LNG)
        .attach('photo', fakePhoto(), 'photo.jpg'),
      api().get('/api/company').set('Cookie', adminLogin.cookie),
      api()
        .post('/api/company')
        .set('Cookie', adminLogin.cookie)
        .send({ name: newCompanyName, code: `BURST-${Date.now()}` }),
    ])

    expect(checkinRes.status).toBe(201)
    expect(checkinRes.body.data.user_id ?? checkinRes.body.data.userId).toBeDefined()

    expect(visitRes.status).toBe(201)

    expect(listRes.status).toBe(200)
    expect(Array.isArray(listRes.body.data.data)).toBe(true)

    expect(createRes.status).toBe(201)
    expect(createRes.body.data.name).toBe(newCompanyName)

    // Sanity: none of the four concurrent, differently-authenticated calls
    // leaked into each other — each still reflects its own caller's data.
    const attendance = await prisma.attendance.findFirst({ where: { user_id: staff.user.id } })
    expect(attendance).not.toBeNull()

    const visit = await prisma.visitLog.findFirst({ where: { user_id: supervisor.user.id } })
    expect(visit).not.toBeNull()
  })
})
