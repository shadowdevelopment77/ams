import prisma from '../lib/prisma'
import { api, loginAs } from './helpers/request'
import { createAdmin, createSupervisor, createStaff, createCompany, createDivision } from './helpers/factories'

describe('POST /api/company', () => {
  it('rejects an unauthenticated request', async () => {
    const res = await api().post('/api/company').send({ name: 'Acme Corp', code: 'ACME' })
    expect(res.status).toBe(401)
  })

  it('rejects a non-ADMIN user', async () => {
    const { user, rawPassword } = await createSupervisor()
    const { cookie } = await loginAs(user.email, rawPassword)

    const res = await api().post('/api/company').set('Cookie', cookie).send({ name: 'Acme Corp', code: 'ACME' })
    expect(res.status).toBe(403)
  })

  it('rejects a missing name or code', async () => {
    const { user, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(user.email, rawPassword)

    const res = await api().post('/api/company').set('Cookie', cookie).send({ name: '' })
    expect(res.status).toBe(400)
  })

  it('rejects an invalid email format', async () => {
    const { user, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(user.email, rawPassword)

    const res = await api()
      .post('/api/company')
      .set('Cookie', cookie)
      .send({ name: 'Acme Corp', code: 'ACME', email: 'not-an-email' })

    expect(res.status).toBe(400)
  })

  it('rejects a duplicate company name', async () => {
    const { user, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(user.email, rawPassword)

    const first = await api().post('/api/company').set('Cookie', cookie).send({ name: 'Duplicate Co', code: 'DUP1' })
    expect(first.status).toBe(201)

    const second = await api().post('/api/company').set('Cookie', cookie).send({ name: 'Duplicate Co', code: 'DUP2' })
    expect(second.status).toBe(409)
    expect(second.body.message).toMatch(/already exists/i)
  })

  it('creates a company successfully', async () => {
    const { user, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(user.email, rawPassword)

    const res = await api()
      .post('/api/company')
      .set('Cookie', cookie)
      .send({ name: 'New Company', code: 'NEWCO', address: '123 Main St' })

    expect(res.status).toBe(201)
    expect(res.body.data.name).toBe('New Company')
  })
})

describe('GET /api/company', () => {
  it('rejects an unauthenticated request', async () => {
    const res = await api().get('/api/company')
    expect(res.status).toBe(401)
  })

  it('rejects a non-ADMIN user', async () => {
    const { user, rawPassword } = await createSupervisor()
    const { cookie } = await loginAs(user.email, rawPassword)
    const res = await api().get('/api/company').set('Cookie', cookie)
    expect(res.status).toBe(403)
  })

  it('returns a list of companies', async () => {
    const { user, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(user.email, rawPassword)
    await createCompany()

    const res = await api().get('/api/company').set('Cookie', cookie)
    expect(res.status).toBe(200)
    expect(res.body.data.data.length).toBeGreaterThanOrEqual(1)
  })
})

describe('GET /api/company/:id', () => {
  it('rejects a non-ADMIN user', async () => {
    const { user, rawPassword } = await createSupervisor()
    const { cookie } = await loginAs(user.email, rawPassword)
    const res = await api().get('/api/company/1').set('Cookie', cookie)
    expect(res.status).toBe(403)
  })

  it('returns 404 for a nonexistent company', async () => {
    const { user, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(user.email, rawPassword)
    const res = await api().get('/api/company/999999').set('Cookie', cookie)
    expect(res.status).toBe(404)
  })

  it('returns the company', async () => {
    const { user, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(user.email, rawPassword)
    const company = await createCompany()

    const res = await api().get(`/api/company/${company.id}`).set('Cookie', cookie)
    expect(res.status).toBe(200)
    expect(res.body.data.id).toBe(company.id)
  })
})

describe('PUT /api/company/:id', () => {
  it('rejects a non-ADMIN user', async () => {
    const { user, rawPassword } = await createSupervisor()
    const { cookie } = await loginAs(user.email, rawPassword)
    const res = await api().put('/api/company/1').set('Cookie', cookie).send({ name: 'X' })
    expect(res.status).toBe(403)
  })

  it('returns 404 for a nonexistent company', async () => {
    const { user, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(user.email, rawPassword)
    const res = await api().put('/api/company/999999').set('Cookie', cookie).send({ name: 'X' })
    expect(res.status).toBe(404)
  })

  it('rejects renaming to a name that already belongs to another company', async () => {
    const { user, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(user.email, rawPassword)
    const companyA = await createCompany({ name: 'Existing Name' })
    const companyB = await createCompany()

    const res = await api()
      .put(`/api/company/${companyB.id}`)
      .set('Cookie', cookie)
      .send({ name: 'Existing Name' })

    expect(res.status).toBe(409)
  })

  it('updates a company successfully', async () => {
    const { user, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(user.email, rawPassword)
    const company = await createCompany()

    const res = await api()
      .put(`/api/company/${company.id}`)
      .set('Cookie', cookie)
      .send({ name: 'Renamed Company' })

    expect(res.status).toBe(200)
    expect(res.body.data.name).toBe('Renamed Company')
  })

  it('allows updating a company without changing its name (no false duplicate rejection)', async () => {
    const { user, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(user.email, rawPassword)
    const company = await createCompany({ name: 'Stable Name' })

    const res = await api()
      .put(`/api/company/${company.id}`)
      .set('Cookie', cookie)
      .send({ name: 'Stable Name', address: 'New Address' })

    expect(res.status).toBe(200)
  })
})

describe('DELETE /api/company/:id', () => {
  it('rejects a non-ADMIN user', async () => {
    const { user, rawPassword } = await createSupervisor()
    const { cookie } = await loginAs(user.email, rawPassword)
    const res = await api().delete('/api/company/1').set('Cookie', cookie)
    expect(res.status).toBe(403)
  })

  it('returns 404 for a nonexistent company', async () => {
    const { user, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(user.email, rawPassword)
    const res = await api().delete('/api/company/999999').set('Cookie', cookie)
    expect(res.status).toBe(404)
  })

  it('blocks deletion when staff are still actively assigned to the company', async () => {
    const { user: admin, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(admin.email, rawPassword)
    const company = await createCompany()
    const division = await createDivision(company.id)
    await createStaff(company.id, division.id)

    const res = await api().delete(`/api/company/${company.id}`).set('Cookie', cookie)

    expect(res.status).toBe(409)
    expect(res.body.message).toMatch(/staff member/i)

    const inDb = await prisma.company.findUnique({ where: { id: company.id } })
    expect(inDb?.is_deleted).toBe(false)
  })

  it('deletes a company successfully when it has no active staff', async () => {
    const { user: admin, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(admin.email, rawPassword)
    const company = await createCompany()

    const res = await api().delete(`/api/company/${company.id}`).set('Cookie', cookie)
    expect(res.status).toBe(200)

    const inDb = await prisma.company.findUnique({ where: { id: company.id } })
    expect(inDb?.is_deleted).toBe(true)
  })
})