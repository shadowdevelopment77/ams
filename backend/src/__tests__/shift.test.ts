import prisma from '../lib/prisma'
import { api, loginAs } from './helpers/request'
import {
  createAdmin,
  createSupervisor,
  createStaff,
  createCompany,
  createDivision,
  createShift,
} from './helpers/factories'

describe('POST /api/shift', () => {
  it('rejects an unauthenticated request', async () => {
    const res = await api()
      .post('/api/shift')
      .send({ company_id: 1, division_id: 1, name: 'Morning', start_time: '08:00', end_time: '16:00' })
    expect(res.status).toBe(401)
  })

  it('rejects a non-ADMIN user', async () => {
    const { user, rawPassword } = await createSupervisor()
    const { cookie } = await loginAs(user.email, rawPassword)

    const res = await api()
      .post('/api/shift')
      .set('Cookie', cookie)
      .send({ company_id: 1, division_id: 1, name: 'Morning', start_time: '08:00', end_time: '16:00' })

    expect(res.status).toBe(403)
  })

  it('rejects an invalid time format', async () => {
    const { user, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(user.email, rawPassword)
    const company = await createCompany()
    const division = await createDivision(company.id)

    const res = await api()
      .post('/api/shift')
      .set('Cookie', cookie)
      .send({ company_id: company.id, division_id: division.id, name: 'Morning', start_time: '8am', end_time: '16:00' })

    expect(res.status).toBe(400)
  })

  it('rejects a company_id that does not exist', async () => {
    const { user, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(user.email, rawPassword)

    const res = await api()
      .post('/api/shift')
      .set('Cookie', cookie)
      .send({ company_id: 999999, division_id: 1, name: 'Morning', start_time: '08:00', end_time: '16:00' })

    expect(res.status).toBe(404)
    expect(res.body.message).toMatch(/company not found/i)
  })

  it('rejects a division that does not belong to the given company', async () => {
    const { user, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(user.email, rawPassword)
    const companyA = await createCompany()
    const companyB = await createCompany()
    const divisionOfB = await createDivision(companyB.id)

    const res = await api()
      .post('/api/shift')
      .set('Cookie', cookie)
      .send({
        company_id: companyA.id,
        division_id: divisionOfB.id,
        name: 'Morning',
        start_time: '08:00',
        end_time: '16:00',
      })

    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/does not belong to this company/i)
  })

  it('rejects a duplicate shift name within the same division', async () => {
    const { user, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(user.email, rawPassword)
    const company = await createCompany()
    const division = await createDivision(company.id)

    const first = await api()
      .post('/api/shift')
      .set('Cookie', cookie)
      .send({ company_id: company.id, division_id: division.id, name: 'Morning', start_time: '08:00', end_time: '16:00' })
    expect(first.status).toBe(201)

    const second = await api()
      .post('/api/shift')
      .set('Cookie', cookie)
      .send({ company_id: company.id, division_id: division.id, name: 'Morning', start_time: '09:00', end_time: '17:00' })

    expect(second.status).toBe(409)
    expect(second.body.message).toMatch(/already exists in this division/i)
  })

  it('allows the same shift name across different divisions', async () => {
    const { user, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(user.email, rawPassword)
    const company = await createCompany()
    const divisionA = await createDivision(company.id)
    const divisionB = await createDivision(company.id)

    const resA = await api()
      .post('/api/shift')
      .set('Cookie', cookie)
      .send({ company_id: company.id, division_id: divisionA.id, name: 'Morning', start_time: '08:00', end_time: '16:00' })
    const resB = await api()
      .post('/api/shift')
      .set('Cookie', cookie)
      .send({ company_id: company.id, division_id: divisionB.id, name: 'Morning', start_time: '08:00', end_time: '16:00' })

    expect(resA.status).toBe(201)
    expect(resB.status).toBe(201)
  })

  it('creates a shift successfully', async () => {
    const { user, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(user.email, rawPassword)
    const company = await createCompany()
    const division = await createDivision(company.id)

    const res = await api()
      .post('/api/shift')
      .set('Cookie', cookie)
      .send({ company_id: company.id, division_id: division.id, name: 'Night Shift', start_time: '22:00', end_time: '06:00' })

    expect(res.status).toBe(201)
    expect(res.body.data.name).toBe('Night Shift')
  })
})

describe('GET /api/shift/company/:companyId/division/:divisionId', () => {
  it('rejects an unauthenticated request', async () => {
    const res = await api().get('/api/shift/company/1/division/1')
    expect(res.status).toBe(401)
  })

  it('rejects a non-ADMIN user', async () => {
    const { user, rawPassword } = await createSupervisor()
    const { cookie } = await loginAs(user.email, rawPassword)
    const res = await api().get('/api/shift/company/1/division/1').set('Cookie', cookie)
    expect(res.status).toBe(403)
  })

  it('returns shifts for the given company/division', async () => {
    const { user, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(user.email, rawPassword)
    const company = await createCompany()
    const division = await createDivision(company.id)
    await createShift(company.id, division.id)

    const res = await api()
      .get(`/api/shift/company/${company.id}/division/${division.id}`)
      .set('Cookie', cookie)

    expect(res.status).toBe(200)
    expect(res.body.data.length).toBeGreaterThanOrEqual(1)
  })
})

describe('GET /api/shift/my-division', () => {
  it('rejects an unauthenticated request', async () => {
    const res = await api().get('/api/shift/my-division')
    expect(res.status).toBe(401)
  })

  it('rejects a non-STAFF user (ADMIN)', async () => {
    const { user, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(user.email, rawPassword)
    const res = await api().get('/api/shift/my-division').set('Cookie', cookie)
    expect(res.status).toBe(403)
  })

  it("returns shifts for the caller's own division only, not other divisions", async () => {
    const company = await createCompany()
    const divisionA = await createDivision(company.id)
    const divisionB = await createDivision(company.id)
    await createShift(company.id, divisionA.id, { name: 'Morning A' })
    await createShift(company.id, divisionB.id, { name: 'Morning B' })

    const { user, rawPassword } = await createStaff(company.id, divisionA.id)
    const { cookie } = await loginAs(user.email, rawPassword)

    const res = await api().get('/api/shift/my-division').set('Cookie', cookie)

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0].name).toBe('Morning A')
  })
})

describe('GET /api/shift/:id', () => {
  it('returns 404 for a nonexistent shift', async () => {
    const { user, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(user.email, rawPassword)
    const res = await api().get('/api/shift/999999').set('Cookie', cookie)
    expect(res.status).toBe(404)
  })

  it('returns the shift', async () => {
    const { user, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(user.email, rawPassword)
    const company = await createCompany()
    const division = await createDivision(company.id)
    const shift = await createShift(company.id, division.id)

    const res = await api().get(`/api/shift/${shift.id}`).set('Cookie', cookie)
    expect(res.status).toBe(200)
    expect(res.body.data.id).toBe(shift.id)
  })
})

describe('PUT /api/shift/:id', () => {
  it('returns 404 for a nonexistent shift', async () => {
    const { user, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(user.email, rawPassword)
    const res = await api().put('/api/shift/999999').set('Cookie', cookie).send({ name: 'Renamed' })
    expect(res.status).toBe(404)
  })

  it('rejects renaming to a name that already exists in the same division', async () => {
    const { user, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(user.email, rawPassword)
    const company = await createCompany()
    const division = await createDivision(company.id)
    await createShift(company.id, division.id, { name: 'Morning' })
    const shiftB = await createShift(company.id, division.id, { name: 'Evening' })

    const res = await api().put(`/api/shift/${shiftB.id}`).set('Cookie', cookie).send({ name: 'Morning' })
    expect(res.status).toBe(409)
  })

  it('updates a shift successfully', async () => {
    const { user, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(user.email, rawPassword)
    const company = await createCompany()
    const division = await createDivision(company.id)
    const shift = await createShift(company.id, division.id)

    const res = await api()
      .put(`/api/shift/${shift.id}`)
      .set('Cookie', cookie)
      .send({ start_time: '07:00', end_time: '15:00' })

    expect(res.status).toBe(200)
    expect(res.body.data.start_time).toBe('07:00')
  })
})

describe('DELETE /api/shift/:id', () => {
  it('returns 404 for a nonexistent shift', async () => {
    const { user, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(user.email, rawPassword)
    const res = await api().delete('/api/shift/999999').set('Cookie', cookie)
    expect(res.status).toBe(404)
  })

  it('soft-deletes a shift', async () => {
    const { user, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(user.email, rawPassword)
    const company = await createCompany()
    const division = await createDivision(company.id)
    const shift = await createShift(company.id, division.id)

    const res = await api().delete(`/api/shift/${shift.id}`).set('Cookie', cookie)
    expect(res.status).toBe(200)

    const inDb = await prisma.shift.findUnique({ where: { id: shift.id } })
    expect(inDb?.is_deleted).toBe(true)
  })
})