import prisma from '../lib/prisma'
import { api, loginAs } from './helpers/request'
import {
  createSupervisor,
  createAdmin,
  createStaff,
  createCompany,
  createDivision,
  createVisitLog,
} from './helpers/factories'

const fakePhoto = () => Buffer.from('fake-image-bytes')

describe('POST /api/visit', () => {
  it('rejects an unauthenticated request', async () => {
    const res = await api().post('/api/visit').field('company_id', 1).attach('photo', fakePhoto(), 'photo.jpg')
    expect(res.status).toBe(401)
  })

  it('rejects a non-SUPERVISOR user (ADMIN)', async () => {
    const { user, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(user.email, rawPassword)

    const res = await api()
      .post('/api/visit')
      .set('Cookie', cookie)
      .field('company_id', 1)
      .attach('photo', fakePhoto(), 'photo.jpg')

    expect(res.status).toBe(403)
  })

  it('rejects a non-SUPERVISOR user (STAFF)', async () => {
    const company = await createCompany()
    const division = await createDivision(company.id)
    const { user, rawPassword } = await createStaff(company.id, division.id)
    const { cookie } = await loginAs(user.email, rawPassword)

    const res = await api()
      .post('/api/visit')
      .set('Cookie', cookie)
      .field('company_id', company.id)
      .attach('photo', fakePhoto(), 'photo.jpg')

    expect(res.status).toBe(403)
  })

  it('rejects a request with no photo attached', async () => {
    const { user, rawPassword } = await createSupervisor()
    const { cookie } = await loginAs(user.email, rawPassword)
    const company = await createCompany()

    const res = await api()
      .post('/api/visit')
      .set('Cookie', cookie)
      .field('company_id', company.id)

    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/photo is required/i)
  })

  it('rejects a request with no company_id', async () => {
    const { user, rawPassword } = await createSupervisor()
    const { cookie } = await loginAs(user.email, rawPassword)

    const res = await api()
      .post('/api/visit')
      .set('Cookie', cookie)
      .attach('photo', fakePhoto(), 'photo.jpg')

    expect(res.status).toBe(400)
  })

  it('rejects a company_id that does not exist', async () => {
    const { user, rawPassword } = await createSupervisor()
    const { cookie } = await loginAs(user.email, rawPassword)

    const res = await api()
      .post('/api/visit')
      .set('Cookie', cookie)
      .field('company_id', 999999)
      .attach('photo', fakePhoto(), 'photo.jpg')

    expect(res.status).toBe(404)
    expect(res.body.message).toMatch(/company not found/i)
  })

  it('creates a visit log successfully, with notes and coordinates', async () => {
    const { user, rawPassword } = await createSupervisor()
    const { cookie } = await loginAs(user.email, rawPassword)
    const company = await createCompany()

    const res = await api()
      .post('/api/visit')
      .set('Cookie', cookie)
      .field('company_id', company.id)
      .field('notes', 'Everything looked fine')
      .field('latitude', -6.2)
      .field('longitude', 106.8)
      .attach('photo', fakePhoto(), 'photo.jpg')

    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
    expect(res.body.data.user_id).toBe(user.id)
    expect(res.body.data.company_id).toBe(company.id)
    expect(res.body.data.notes).toBe('Everything looked fine')
    expect(res.body.data.photo_url).toBe('https://fake-cdn.test/mock-photo.jpg')
    expect(res.body.data.location_address).toBe('Mock Address, Test City') // from reverseGeocode mock

    const inDb = await prisma.visitLog.findUnique({ where: { id: res.body.data.id } })
    expect(inDb).not.toBeNull()
  })

  it('creates a visit log successfully without optional notes/coordinates', async () => {
    const { user, rawPassword } = await createSupervisor()
    const { cookie } = await loginAs(user.email, rawPassword)
    const company = await createCompany()

    const res = await api()
      .post('/api/visit')
      .set('Cookie', cookie)
      .field('company_id', company.id)
      .attach('photo', fakePhoto(), 'photo.jpg')

    expect(res.status).toBe(201)
    expect(res.body.data.notes).toBeNull()
  })

  it('allows multiple visits to the same company on the same day (no one-per-day limit)', async () => {
    const { user, rawPassword } = await createSupervisor()
    const { cookie } = await loginAs(user.email, rawPassword)
    const company = await createCompany()

    const first = await api()
      .post('/api/visit')
      .set('Cookie', cookie)
      .field('company_id', company.id)
      .attach('photo', fakePhoto(), 'photo.jpg')
    expect(first.status).toBe(201)

    const second = await api()
      .post('/api/visit')
      .set('Cookie', cookie)
      .field('company_id', company.id)
      .attach('photo', fakePhoto(), 'photo.jpg')
    expect(second.status).toBe(201)

    const count = await prisma.visitLog.count({ where: { user_id: user.id, company_id: company.id } })
    expect(count).toBe(2)
  })

  it('allows the same supervisor to visit different companies', async () => {
    const { user, rawPassword } = await createSupervisor()
    const { cookie } = await loginAs(user.email, rawPassword)
    const companyA = await createCompany()
    const companyB = await createCompany()

    const resA = await api()
      .post('/api/visit')
      .set('Cookie', cookie)
      .field('company_id', companyA.id)
      .attach('photo', fakePhoto(), 'photo.jpg')
    const resB = await api()
      .post('/api/visit')
      .set('Cookie', cookie)
      .field('company_id', companyB.id)
      .attach('photo', fakePhoto(), 'photo.jpg')

    expect(resA.status).toBe(201)
    expect(resB.status).toBe(201)
  })
})

describe('GET /api/visit/my-visits', () => {
  it('rejects an unauthenticated request', async () => {
    const res = await api().get('/api/visit/my-visits')
    expect(res.status).toBe(401)
  })

  it('rejects a non-SUPERVISOR user', async () => {
    const { user, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(user.email, rawPassword)

    const res = await api().get('/api/visit/my-visits').set('Cookie', cookie)
    expect(res.status).toBe(403)
  })

  it("only returns the logged-in supervisor's own visits, not other supervisors'", async () => {
    const company = await createCompany()
    const { user: supervisorA, rawPassword: pwA } = await createSupervisor()
    const { user: supervisorB } = await createSupervisor()

    await createVisitLog(supervisorA.id, company.id)
    await createVisitLog(supervisorA.id, company.id)
    await createVisitLog(supervisorB.id, company.id)

    const { cookie } = await loginAs(supervisorA.email, pwA)
    const res = await api().get('/api/visit/my-visits').set('Cookie', cookie)

    expect(res.status).toBe(200)
    const returnedUserIds = new Set(res.body.data.data.map((v: any) => v.user_id))
    expect(returnedUserIds.size).toBe(1)
    expect(returnedUserIds.has(supervisorA.id)).toBe(true)
  })
})

describe('GET /api/visit (admin - all visit logs)', () => {
  it('rejects an unauthenticated request', async () => {
    const res = await api().get('/api/visit')
    expect(res.status).toBe(401)
  })

  it('rejects a non-ADMIN user', async () => {
    const { user, rawPassword } = await createSupervisor()
    const { cookie } = await loginAs(user.email, rawPassword)

    const res = await api().get('/api/visit').set('Cookie', cookie)
    expect(res.status).toBe(403)
  })

  it('returns visit logs across all supervisors', async () => {
    const company = await createCompany()
    const { user: supervisorA } = await createSupervisor()
    const { user: supervisorB } = await createSupervisor()
    await createVisitLog(supervisorA.id, company.id)
    await createVisitLog(supervisorB.id, company.id)

    const { user: admin, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(admin.email, rawPassword)

    const res = await api().get('/api/visit').set('Cookie', cookie)

    expect(res.status).toBe(200)
    expect(res.body.data.data.length).toBeGreaterThanOrEqual(2)
  })

  it('includes the supervisor name and company name, not just their raw IDs', async () => {
    const company = await createCompany({ name: 'Acme Cleaning Co' })
    const { user: supervisor } = await createSupervisor({ name: 'Jane Supervisor' })
    await createVisitLog(supervisor.id, company.id)

    const { user: admin, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(admin.email, rawPassword)

    const res = await api().get('/api/visit').set('Cookie', cookie)

    expect(res.status).toBe(200)
    const row = res.body.data.data.find((v: any) => v.user_id === supervisor.id)
    expect(row.user).toEqual({ id: supervisor.id, name: 'Jane Supervisor' })
    expect(row.company).toEqual({ id: company.id, name: 'Acme Cleaning Co' })
  })
})

describe('GET /api/visit/user/:userId/photos', () => {
  it('rejects an unauthenticated request', async () => {
    const res = await api().get('/api/visit/user/some-id/photos')
    expect(res.status).toBe(401)
  })

  it('rejects a non-ADMIN user', async () => {
    const { user, rawPassword } = await createSupervisor()
    const { cookie } = await loginAs(user.email, rawPassword)

    const res = await api().get(`/api/visit/user/${user.id}/photos`).set('Cookie', cookie)
    expect(res.status).toBe(403)
  })

  it('returns 404 for a user that does not exist', async () => {
    const { user: admin, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(admin.email, rawPassword)

    const res = await api()
      .get('/api/visit/user/00000000-0000-0000-0000-000000000000/photos')
      .set('Cookie', cookie)

    expect(res.status).toBe(404)
    expect(res.body.message).toMatch(/user not found/i)
  })

  it("returns the target supervisor's visit photos", async () => {
    const company = await createCompany()
    const { user: supervisor } = await createSupervisor()
    await createVisitLog(supervisor.id, company.id, { notes: 'Check A' })

    const { user: admin, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(admin.email, rawPassword)

    const res = await api().get(`/api/visit/user/${supervisor.id}/photos`).set('Cookie', cookie)

    expect(res.status).toBe(200)
    expect(res.body.data.data.length).toBeGreaterThanOrEqual(1)
    expect(res.body.data.data[0]).toHaveProperty('visit_photo')
  })

  it('includes the company name, not just the raw company_id', async () => {
    const company = await createCompany({ name: 'Beta Logistics' })
    const { user: supervisor } = await createSupervisor()
    await createVisitLog(supervisor.id, company.id)

    const { user: admin, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(admin.email, rawPassword)

    const res = await api().get(`/api/visit/user/${supervisor.id}/photos`).set('Cookie', cookie)

    expect(res.status).toBe(200)
    expect(res.body.data.data[0].company).toEqual({ id: company.id, name: 'Beta Logistics' })
    expect(res.body.data.data[0]).not.toHaveProperty('company_id')
  })
})

describe('DELETE /api/visit/:id', () => {
  it('rejects an unauthenticated request', async () => {
    const res = await api().delete('/api/visit/1')
    expect(res.status).toBe(401)
  })

  it('rejects a non-ADMIN user', async () => {
    const { user, rawPassword } = await createSupervisor()
    const { cookie } = await loginAs(user.email, rawPassword)

    const res = await api().delete('/api/visit/1').set('Cookie', cookie)
    expect(res.status).toBe(403)
  })

  it('returns 404 for a visit log id that does not exist', async () => {
    const { user: admin, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(admin.email, rawPassword)

    const res = await api().delete('/api/visit/999999').set('Cookie', cookie)

    expect(res.status).toBe(404)
    expect(res.body.message).toMatch(/visit log not found/i)
  })

  it('soft-deletes a visit log', async () => {
    const company = await createCompany()
    const { user: supervisor } = await createSupervisor()
    const visitLog = await createVisitLog(supervisor.id, company.id)

    const { user: admin, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(admin.email, rawPassword)

    const res = await api().delete(`/api/visit/${visitLog.id}`).set('Cookie', cookie)
    expect(res.status).toBe(200)

    const inDb = await prisma.visitLog.findUnique({ where: { id: visitLog.id } })
    expect(inDb?.is_deleted).toBe(true)
  })
})