import prisma from '../lib/prisma'
import { api, loginAs } from './helpers/request'
import {
  createAdmin,
  createSupervisor,
  createStaff,
  createCompany,
  createDivision,
} from './helpers/factories'

describe('GET /api/users', () => {
  it('rejects an unauthenticated request', async () => {
    const res = await api().get('/api/users')
    expect(res.status).toBe(401)
  })

  it('rejects a non-ADMIN user', async () => {
    const { user, rawPassword } = await createSupervisor()
    const { cookie } = await loginAs(user.email, rawPassword)
    const res = await api().get('/api/users').set('Cookie', cookie)
    expect(res.status).toBe(403)
  })

  it('returns users without leaking the password field', async () => {
    const { user, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(user.email, rawPassword)

    const res = await api().get('/api/users').set('Cookie', cookie)

    expect(res.status).toBe(200)
    expect(res.body.data.data.length).toBeGreaterThanOrEqual(1)
    expect(res.body.data.data.every((u: any) => !('password' in u))).toBe(true)
  })
})

describe('GET /api/users/:id', () => {
  it('returns 404 for a nonexistent user', async () => {
    const { user, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(user.email, rawPassword)
    const res = await api().get('/api/users/00000000-0000-0000-0000-000000000000').set('Cookie', cookie)
    expect(res.status).toBe(404)
  })

  it('returns the user without a password field', async () => {
    const { user: admin, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(admin.email, rawPassword)
    const company = await createCompany()
    const division = await createDivision(company.id)
    const { user: staff } = await createStaff(company.id, division.id)

    const res = await api().get(`/api/users/${staff.id}`).set('Cookie', cookie)

    expect(res.status).toBe(200)
    expect(res.body.data.id).toBe(staff.id)
    expect(res.body.data.password).toBeUndefined()
  })
})

describe('GET /api/users/company/:companyId/division/:divisionId', () => {
  it('rejects a non-ADMIN user', async () => {
    const { user, rawPassword } = await createSupervisor()
    const { cookie } = await loginAs(user.email, rawPassword)
    const res = await api().get('/api/users/company/1/division/1').set('Cookie', cookie)
    expect(res.status).toBe(403)
  })

  it('returns 404 for a nonexistent company', async () => {
    const { user, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(user.email, rawPassword)
    const res = await api().get('/api/users/company/999999/division/1').set('Cookie', cookie)
    expect(res.status).toBe(404)
  })

  it('returns staff belonging to the given company/division', async () => {
    const { user: admin, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(admin.email, rawPassword)
    const company = await createCompany()
    const division = await createDivision(company.id)
    await createStaff(company.id, division.id)

    const res = await api()
      .get(`/api/users/company/${company.id}/division/${division.id}`)
      .set('Cookie', cookie)

    expect(res.status).toBe(200)
    expect(res.body.data.data.length).toBeGreaterThanOrEqual(1)
  })
})

describe('PUT /api/users/:id/move-company', () => {
  it('rejects an unauthenticated request', async () => {
    const res = await api().put('/api/users/some-id/move-company').send({ company_id: 1, division_id: 1 })
    expect(res.status).toBe(401)
  })

  it('rejects a non-ADMIN user', async () => {
    const { user, rawPassword } = await createSupervisor()
    const { cookie } = await loginAs(user.email, rawPassword)
    const res = await api()
      .put('/api/users/some-id/move-company')
      .set('Cookie', cookie)
      .send({ company_id: 1, division_id: 1 })
    expect(res.status).toBe(403)
  })

  it('rejects a missing company_id or division_id', async () => {
    const { user, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(user.email, rawPassword)
    const res = await api()
      .put('/api/users/some-id/move-company')
      .set('Cookie', cookie)
      .send({ company_id: 1 })
    expect(res.status).toBe(400)
  })

  it('returns 404 for a target user that does not exist', async () => {
    const { user: admin, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(admin.email, rawPassword)
    const company = await createCompany()
    const division = await createDivision(company.id)

    const res = await api()
      .put('/api/users/00000000-0000-0000-0000-000000000000/move-company')
      .set('Cookie', cookie)
      .send({ company_id: company.id, division_id: division.id })

    expect(res.status).toBe(404)
    expect(res.body.message).toMatch(/user not found/i)
  })

  it('returns 404 for a target company that does not exist', async () => {
    const { user: admin, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(admin.email, rawPassword)
    const oldCompany = await createCompany()
    const oldDivision = await createDivision(oldCompany.id)
    const { user: staff } = await createStaff(oldCompany.id, oldDivision.id)

    const res = await api()
      .put(`/api/users/${staff.id}/move-company`)
      .set('Cookie', cookie)
      .send({ company_id: 999999, division_id: oldDivision.id })

    expect(res.status).toBe(404)
    expect(res.body.message).toMatch(/company not found/i)
  })

  it('rejects a division that does not belong to the target company', async () => {
    const { user: admin, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(admin.email, rawPassword)
    const oldCompany = await createCompany()
    const oldDivision = await createDivision(oldCompany.id)
    const { user: staff } = await createStaff(oldCompany.id, oldDivision.id)

    const newCompany = await createCompany()
    const divisionOfSomeOtherCompany = await createDivision(oldCompany.id) // belongs to oldCompany, not newCompany

    const res = await api()
      .put(`/api/users/${staff.id}/move-company`)
      .set('Cookie', cookie)
      .send({ company_id: newCompany.id, division_id: divisionOfSomeOtherCompany.id })

    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/does not belong to this company/i)
  })

  it('rejects moving an ADMIN into a company/division', async () => {
    const { user: admin, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(admin.email, rawPassword)
    const { user: targetAdmin } = await createAdmin()
    const company = await createCompany()
    const division = await createDivision(company.id)

    const res = await api()
      .put(`/api/users/${targetAdmin.id}/move-company`)
      .set('Cookie', cookie)
      .send({ company_id: company.id, division_id: division.id })

    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/only staff can be assigned/i)
  })

  it('rejects moving a SUPERVISOR into a company/division', async () => {
    const { user: admin, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(admin.email, rawPassword)
    const { user: supervisor } = await createSupervisor()
    const company = await createCompany()
    const division = await createDivision(company.id)

    const res = await api()
      .put(`/api/users/${supervisor.id}/move-company`)
      .set('Cookie', cookie)
      .send({ company_id: company.id, division_id: division.id })

    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/only staff can be assigned/i)
  })

  it('moves a STAFF member to a new company and division successfully', async () => {
    const { user: admin, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(admin.email, rawPassword)
    const oldCompany = await createCompany()
    const oldDivision = await createDivision(oldCompany.id)
    const { user: staff } = await createStaff(oldCompany.id, oldDivision.id)

    const newCompany = await createCompany()
    const newDivision = await createDivision(newCompany.id)

    const res = await api()
      .put(`/api/users/${staff.id}/move-company`)
      .set('Cookie', cookie)
      .send({ company_id: newCompany.id, division_id: newDivision.id })

    expect(res.status).toBe(200)

    const role = await prisma.userCompanyRole.findFirst({ where: { user_id: staff.id } })
    expect(role?.company_id).toBe(newCompany.id)
    expect(role?.division_id).toBe(newDivision.id)
  })
})

describe('DELETE /api/users/:id', () => {
  it('rejects an unauthenticated request', async () => {
    const res = await api().delete('/api/users/some-id')
    expect(res.status).toBe(401)
  })

  it('rejects a non-ADMIN user', async () => {
    const { user, rawPassword } = await createSupervisor()
    const { cookie } = await loginAs(user.email, rawPassword)
    const res = await api().delete('/api/users/some-id').set('Cookie', cookie)
    expect(res.status).toBe(403)
  })

  it('returns 404 for a nonexistent user', async () => {
    const { user, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(user.email, rawPassword)
    const res = await api().delete('/api/users/00000000-0000-0000-0000-000000000000').set('Cookie', cookie)
    expect(res.status).toBe(404)
  })

  it('soft-deletes the user and invalidates their existing session', async () => {
    const { user: admin, rawPassword: adminPw } = await createAdmin()
    const { cookie: adminCookie } = await loginAs(admin.email, adminPw)

    const company = await createCompany()
    const division = await createDivision(company.id)
    const { user: staff, rawPassword: staffPw } = await createStaff(company.id, division.id)
    const { cookie: staffCookie } = await loginAs(staff.email, staffPw)

    // staff is genuinely logged in before deletion
    const before = await prisma.session.count({ where: { user_id: staff.id } })
    expect(before).toBe(1)

    const res = await api().delete(`/api/users/${staff.id}`).set('Cookie', adminCookie)
    expect(res.status).toBe(200)

    const inDb = await prisma.user.findUnique({ where: { id: staff.id } })
    expect(inDb?.is_deleted).toBe(true)

    const after = await prisma.session.count({ where: { user_id: staff.id } })
    expect(after).toBe(0)

    // the staff member's old session cookie must no longer work
    const followUp = await api().get('/api/attendance').set('Cookie', staffCookie)
    expect(followUp.status).toBe(401)
  })
})