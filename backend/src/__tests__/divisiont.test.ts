import prisma from '../lib/prisma'
import { api, loginAs } from './helpers/request'
import { createAdmin, createSupervisor, createStaff, createCompany, createDivision } from './helpers/factories'

describe('POST /api/divisions', () => {
  it('rejects an unauthenticated request', async () => {
    const res = await api().post('/api/divisions').send({ company_id: 1, name: 'Security' })
    expect(res.status).toBe(401)
  })

  it('rejects a non-ADMIN user', async () => {
    const { user, rawPassword } = await createSupervisor()
    const { cookie } = await loginAs(user.email, rawPassword)
    const res = await api().post('/api/divisions').set('Cookie', cookie).send({ company_id: 1, name: 'Security' })
    expect(res.status).toBe(403)
  })

  it('rejects a company_id that does not exist', async () => {
    const { user, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(user.email, rawPassword)

    const res = await api()
      .post('/api/divisions')
      .set('Cookie', cookie)
      .send({ company_id: 999999, name: 'Security' })

    expect(res.status).toBe(404)
    expect(res.body.message).toMatch(/company not found/i)
  })

  it('rejects a duplicate division name within the same company', async () => {
    const { user, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(user.email, rawPassword)
    const company = await createCompany()

    const first = await api()
      .post('/api/divisions')
      .set('Cookie', cookie)
      .send({ company_id: company.id, name: 'Security' })
    expect(first.status).toBe(201)

    const second = await api()
      .post('/api/divisions')
      .set('Cookie', cookie)
      .send({ company_id: company.id, name: 'Security' })

    expect(second.status).toBe(409)
    expect(second.body.message).toMatch(/already exists in this company/i)
  })

  it('allows the same division name across different companies', async () => {
    const { user, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(user.email, rawPassword)
    const companyA = await createCompany()
    const companyB = await createCompany()

    const resA = await api()
      .post('/api/divisions')
      .set('Cookie', cookie)
      .send({ company_id: companyA.id, name: 'Security' })
    const resB = await api()
      .post('/api/divisions')
      .set('Cookie', cookie)
      .send({ company_id: companyB.id, name: 'Security' })

    expect(resA.status).toBe(201)
    expect(resB.status).toBe(201)
  })

  it('creates a division successfully', async () => {
    const { user, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(user.email, rawPassword)
    const company = await createCompany()

    const res = await api()
      .post('/api/divisions')
      .set('Cookie', cookie)
      .send({ company_id: company.id, name: 'Kitchen' })

    expect(res.status).toBe(201)
    expect(res.body.data.name).toBe('Kitchen')
  })
})

describe('GET /api/divisions', () => {
  it('rejects a non-ADMIN user', async () => {
    const { user, rawPassword } = await createSupervisor()
    const { cookie } = await loginAs(user.email, rawPassword)
    const res = await api().get('/api/divisions').set('Cookie', cookie)
    expect(res.status).toBe(403)
  })

  it('returns a list of divisions', async () => {
    const { user, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(user.email, rawPassword)
    const company = await createCompany()
    await createDivision(company.id)

    const res = await api().get('/api/divisions').set('Cookie', cookie)
    expect(res.status).toBe(200)
    expect(res.body.data.data.length).toBeGreaterThanOrEqual(1)
  })
})

describe('GET /api/divisions/:id', () => {
  it('returns 404 for a nonexistent division', async () => {
    const { user, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(user.email, rawPassword)
    const res = await api().get('/api/divisions/999999').set('Cookie', cookie)
    expect(res.status).toBe(404)
  })

  it('returns the division', async () => {
    const { user, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(user.email, rawPassword)
    const company = await createCompany()
    const division = await createDivision(company.id)

    const res = await api().get(`/api/divisions/${division.id}`).set('Cookie', cookie)
    expect(res.status).toBe(200)
    expect(res.body.data.id).toBe(division.id)
  })
})

describe('GET /api/divisions/company/:companyId', () => {
  it('rejects a non-ADMIN user', async () => {
    const { user, rawPassword } = await createSupervisor()
    const { cookie } = await loginAs(user.email, rawPassword)
    const res = await api().get('/api/divisions/company/1').set('Cookie', cookie)
    expect(res.status).toBe(403)
  })

  it('returns 404 for a nonexistent company', async () => {
    const { user, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(user.email, rawPassword)
    const res = await api().get('/api/divisions/company/999999').set('Cookie', cookie)
    expect(res.status).toBe(404)
  })

  it('returns only divisions belonging to the given company', async () => {
    const { user, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(user.email, rawPassword)
    const companyA = await createCompany()
    const companyB = await createCompany()
    await createDivision(companyA.id)
    await createDivision(companyA.id)
    await createDivision(companyB.id)

    const res = await api().get(`/api/divisions/company/${companyA.id}`).set('Cookie', cookie)

    expect(res.status).toBe(200)
    expect(res.body.data.data.length).toBe(2)
    expect(res.body.data.data.every((d: any) => d.company_id === companyA.id)).toBe(true)
  })
})

describe('PUT /api/divisions/:id', () => {
  it('returns 404 for a nonexistent division', async () => {
    const { user, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(user.email, rawPassword)
    const res = await api().put('/api/divisions/999999').set('Cookie', cookie).send({ name: 'Updated Name' })
    expect(res.status).toBe(404)
  })

  it('rejects renaming to a name that already exists in the same company', async () => {
    const { user, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(user.email, rawPassword)
    const company = await createCompany()
    await createDivision(company.id, { name: 'Security' })
    const divisionB = await createDivision(company.id, { name: 'Kitchen' })

    const res = await api()
      .put(`/api/divisions/${divisionB.id}`)
      .set('Cookie', cookie)
      .send({ name: 'Security' })

    expect(res.status).toBe(409)
  })

  it('allows renaming to a name already used in a DIFFERENT company', async () => {
    const { user, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(user.email, rawPassword)
    const companyA = await createCompany()
    const companyB = await createCompany()
    await createDivision(companyA.id, { name: 'Security' })
    const divisionB = await createDivision(companyB.id, { name: 'Kitchen' })

    const res = await api()
      .put(`/api/divisions/${divisionB.id}`)
      .set('Cookie', cookie)
      .send({ name: 'Security' })

    expect(res.status).toBe(200)
  })

  it('updates a division successfully', async () => {
    const { user, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(user.email, rawPassword)
    const company = await createCompany()
    const division = await createDivision(company.id)

    const res = await api()
      .put(`/api/divisions/${division.id}`)
      .set('Cookie', cookie)
      .send({ name: 'Renamed Division' })

    expect(res.status).toBe(200)
    expect(res.body.data.name).toBe('Renamed Division')
  })
})

describe('DELETE /api/divisions/:id', () => {
  it('returns 404 for a nonexistent division', async () => {
    const { user, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(user.email, rawPassword)
    const res = await api().delete('/api/divisions/999999').set('Cookie', cookie)
    expect(res.status).toBe(404)
  })

  it('blocks deletion when staff are still actively assigned to the division', async () => {
    const { user: admin, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(admin.email, rawPassword)
    const company = await createCompany()
    const division = await createDivision(company.id)
    await createStaff(company.id, division.id)

    const res = await api().delete(`/api/divisions/${division.id}`).set('Cookie', cookie)

    expect(res.status).toBe(409)
    expect(res.body.message).toMatch(/staff member/i)

    const inDb = await prisma.division.findUnique({ where: { id: division.id } })
    expect(inDb?.is_deleted).toBe(false)
  })

  it('deletes a division successfully when it has no active staff', async () => {
    const { user: admin, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(admin.email, rawPassword)
    const company = await createCompany()
    const division = await createDivision(company.id)

    const res = await api().delete(`/api/divisions/${division.id}`).set('Cookie', cookie)
    expect(res.status).toBe(200)

    const inDb = await prisma.division.findUnique({ where: { id: division.id } })
    expect(inDb?.is_deleted).toBe(true)
  })
})