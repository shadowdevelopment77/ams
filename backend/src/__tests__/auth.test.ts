import prisma from '../lib/prisma'
import { api, loginAs, cookieFor } from './helpers/request'
import { createAdmin, createStaff, createSupervisor, createCompany, createDivision, createSession } from './helpers/factories'

describe('POST /api/auth/register', () => {
  it('rejects an unauthenticated request even with a valid body', async () => {
    // Fully valid body on purpose -- validation runs before adminOnly on this
    // route, so an invalid body would 400 before the auth gate is even tested.
    const company = await createCompany()
    const division = await createDivision(company.id)

    const res = await api().post('/api/auth/register').send({
      name: 'New Guy',
      email: 'newguy@test.local',
      password: 'Password123!',
      role: 'STAFF',
      company_id: company.id,
      division_id: division.id,
    })

    expect(res.status).toBe(401)
    expect(res.body.success).toBe(false)
  })

  it('rejects an unauthenticated request with 401 even when the body also fails validation', async () => {
    // Proves adminOnly runs before validateRegister -- otherwise this invalid
    // body would 400 before the auth check, leaking validation feedback to an anonymous caller.
    const res = await api().post('/api/auth/register').send({
      name: 'A', // too short
      email: 'not-an-email',
      password: '123', // too short
      role: '',
    })

    expect(res.status).toBe(401)
    expect(res.body.success).toBe(false)
  })

  it('rejects registration from a non-admin (STAFF) user', async () => {
    const company = await createCompany()
    const division = await createDivision(company.id)
    const { user, rawPassword } = await createStaff(company.id, division.id)
    const { cookie } = await loginAs(user.email, rawPassword)

    const targetCompany = await createCompany()
    const targetDivision = await createDivision(targetCompany.id)

    const res = await api()
      .post('/api/auth/register')
      .set('Cookie', cookie)
      .send({
        name: 'New Guy',
        email: 'newguy2@test.local',
        password: 'Password123!',
        role: 'STAFF',
        company_id: targetCompany.id,
        division_id: targetDivision.id,
      })

    expect(res.status).toBe(403)
    expect(res.body.success).toBe(false)
  })

  it('rejects registration from a SUPERVISOR user', async () => {
    const { user, rawPassword } = await createSupervisor()
    const { cookie } = await loginAs(user.email, rawPassword)

    const company = await createCompany()
    const division = await createDivision(company.id)

    const res = await api()
      .post('/api/auth/register')
      .set('Cookie', cookie)
      .send({
        name: 'New Guy',
        email: 'newguy3@test.local',
        password: 'Password123!',
        role: 'STAFF',
        company_id: company.id,
        division_id: division.id,
      })

    expect(res.status).toBe(403)
  })

  it('allows an ADMIN to register a new STAFF user with company + division', async () => {
    const { user: admin, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(admin.email, rawPassword)

    const company = await createCompany()
    const division = await createDivision(company.id)

    const res = await api()
      .post('/api/auth/register')
      .set('Cookie', cookie)
      .send({
        name: 'Staff One',
        email: 'staff-one@test.local',
        password: 'Password123!',
        role: 'STAFF',
        company_id: company.id,
        division_id: division.id,
      })

    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
    expect(res.body.data).toMatchObject({
      name: 'Staff One',
      email: 'staff-one@test.local',
    })

    const created = await prisma.user.findUnique({ where: { email: 'staff-one@test.local' } })
    expect(created).not.toBeNull()

    const role = await prisma.userCompanyRole.findFirst({ where: { user_id: created!.id } })
    expect(role?.company_id).toBe(company.id)
    expect(role?.division_id).toBe(division.id)
  })

  it('allows an ADMIN to register another ADMIN (no company/division)', async () => {
    const { user: admin, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(admin.email, rawPassword)

    const res = await api()
      .post('/api/auth/register')
      .set('Cookie', cookie)
      .send({
        name: 'Second Admin',
        email: 'second-admin@test.local',
        password: 'Password123!',
        role: 'ADMIN',
      })

    expect(res.status).toBe(201)

    const created = await prisma.user.findUnique({ where: { email: 'second-admin@test.local' } })
    const role = await prisma.userCompanyRole.findFirst({ where: { user_id: created!.id } })
    expect(role?.company_id).toBeNull()
    expect(role?.division_id).toBeNull()
  })

  it('rejects a duplicate email', async () => {
    const { user: admin, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(admin.email, rawPassword)

    const payload = {
      name: 'Dup',
      email: 'dup@test.local',
      password: 'Password123!',
      role: 'STAFF',
    }
    const company = await createCompany()
    const division = await createDivision(company.id)

    const first = await api()
      .post('/api/auth/register')
      .set('Cookie', cookie)
      .send({ ...payload, company_id: company.id, division_id: division.id })
    expect(first.status).toBe(201)

    const second = await api()
      .post('/api/auth/register')
      .set('Cookie', cookie)
      .send({ ...payload, company_id: company.id, division_id: division.id })

    expect(second.status).toBe(409)
    expect(second.body.message).toMatch(/already registered/i)
  })

  it('rejects a role name that does not exist', async () => {
    const { user: admin, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(admin.email, rawPassword)

    const res = await api()
      .post('/api/auth/register')
      .set('Cookie', cookie)
      .send({
        name: 'Ghost Role',
        email: 'ghost@test.local',
        password: 'Password123!',
        role: 'MANAGER', // not a seeded role
      })

    expect(res.status).toBe(404)
    expect(res.body.message).toMatch(/role not found/i)
  })

  it('rejects an invalid body with a 400 and validation issues', async () => {
    const { user: admin, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(admin.email, rawPassword)

    const res = await api().post('/api/auth/register').set('Cookie', cookie).send({
      name: 'A', // too short
      email: 'not-an-email',
      password: '123', // too short
      role: '',
    })

    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
    expect(Array.isArray(res.body.errors)).toBe(true)
    expect(res.body.errors.length).toBeGreaterThan(0)
  })

  it('rejects registering an ADMIN with a company_id attached', async () => {
    const { user: admin, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(admin.email, rawPassword)
    const company = await createCompany()

    const res = await api().post('/api/auth/register').set('Cookie', cookie).send({
      name: 'Bad Admin',
      email: 'bad-admin@test.local',
      password: 'Password123!',
      role: 'ADMIN',
      company_id: company.id,
    })

    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
    const messages = res.body.errors.map((e: any) => e.message).join(' ')
    expect(messages).toMatch(/cannot be assigned a company or division/i)
  })

  it('rejects registering a SUPERVISOR with a division_id attached', async () => {
    const { user: admin, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(admin.email, rawPassword)
    const company = await createCompany()
    const division = await createDivision(company.id)

    const res = await api().post('/api/auth/register').set('Cookie', cookie).send({
      name: 'Bad Supervisor',
      email: 'bad-supervisor@test.local',
      password: 'Password123!',
      role: 'SUPERVISOR',
      division_id: division.id,
    })

    expect(res.status).toBe(400)
    const messages = res.body.errors.map((e: any) => e.message).join(' ')
    expect(messages).toMatch(/cannot be assigned a company or division/i)
  })

  it('rejects registering a STAFF with no company_id or division_id', async () => {
    const { user: admin, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(admin.email, rawPassword)

    const res = await api().post('/api/auth/register').set('Cookie', cookie).send({
      name: 'Homeless Staff',
      email: 'homeless-staff@test.local',
      password: 'Password123!',
      role: 'STAFF',
    })

    expect(res.status).toBe(400)
    const messages = res.body.errors.map((e: any) => e.message).join(' ')
    expect(messages).toMatch(/must be assigned a company/i)
    expect(messages).toMatch(/must be assigned a division/i)
  })

  it('rejects a STAFF whose division belongs to a different company', async () => {
    const { user: admin, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(admin.email, rawPassword)

    const companyA = await createCompany()
    const companyB = await createCompany()
    const divisionOfB = await createDivision(companyB.id)

    const res = await api().post('/api/auth/register').set('Cookie', cookie).send({
      name: 'Mismatched Staff',
      email: 'mismatched-staff@test.local',
      password: 'Password123!',
      role: 'STAFF',
      company_id: companyA.id,
      division_id: divisionOfB.id,
    })

    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/does not belong to the specified company/i)
  })

  it('accepts a role name in a different case (normalizes to uppercase)', async () => {
    const { user: admin, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(admin.email, rawPassword)

    const res = await api().post('/api/auth/register').set('Cookie', cookie).send({
      name: 'Lowercase Role',
      email: 'lowercase-role@test.local',
      password: 'Password123!',
      role: 'admin', // lowercase on purpose
    })

    expect(res.status).toBe(201)

    const created = await prisma.user.findUnique({ where: { email: 'lowercase-role@test.local' } })
    const role = await prisma.userCompanyRole.findFirst({
      where: { user_id: created!.id },
      include: { userRole: true },
    })
    expect(role?.userRole.name).toBe('ADMIN')
  })

  it('handles two simultaneous registrations with the same email — exactly one succeeds', async () => {
    const { user: admin, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(admin.email, rawPassword)

    const payload = {
      name: 'Race Condition',
      email: 'race-condition@test.local',
      password: 'Password123!',
      role: 'ADMIN',
    }

    // Fired truly concurrently via Promise.all — both requests reach the
    // findByEmail check before either write lands, so this actually
    // exercises the P2002 fallback, not just the earlier friendly check.
    const [resA, resB] = await Promise.all([
      api().post('/api/auth/register').set('Cookie', cookie).send(payload),
      api().post('/api/auth/register').set('Cookie', cookie).send(payload),
    ])

    const statuses = [resA.status, resB.status].sort()
    expect(statuses).toEqual([201, 409])

    const loser = resA.status === 409 ? resA : resB
    expect(loser.body.message).toMatch(/already registered/i)

    const count = await prisma.user.count({ where: { email: 'race-condition@test.local' } })
    expect(count).toBe(1)
  })
})

describe('POST /api/auth/login', () => {
  it('logs in with correct credentials and sets a session cookie', async () => {
    const { user, rawPassword } = await createAdmin({ email: 'login-ok@test.local' })

    const res = await api()
      .post('/api/auth/login')
      .send({ email: user.email, password: rawPassword })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.user).toMatchObject({
      email: user.email,
      role: 'ADMIN',
    })
    // password must never leak into the response
    expect(res.body.data.user.password).toBeUndefined()

    const setCookie = res.headers['set-cookie'] as unknown as string[]
    expect(setCookie).toBeDefined()
    expect(setCookie.some((c) => c.startsWith('sessionId='))).toBe(true)
    expect(setCookie.some((c) => c.toLowerCase().includes('httponly'))).toBe(true)

    const sessionCount = await prisma.session.count({ where: { user_id: user.id } })
    expect(sessionCount).toBe(1)
  })

  it('sets sameSite=lax, non-secure in non-production', async () => {
    const { user, rawPassword } = await createAdmin({ email: 'cookie-dev@test.local' })

    const res = await api().post('/api/auth/login').send({ email: user.email, password: rawPassword })

    const setCookie = (res.headers['set-cookie'] as unknown as string[]).find((c) =>
      c.startsWith('sessionId=')
    )!
    expect(setCookie.toLowerCase()).toMatch(/samesite=lax/)
    expect(setCookie.toLowerCase()).not.toMatch(/secure/)
  })

  it('sets sameSite=none, secure in production (required for a cross-site deploy)', async () => {
    const { user, rawPassword } = await createAdmin({ email: 'cookie-prod@test.local' })

    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    try {
      const res = await api().post('/api/auth/login').send({ email: user.email, password: rawPassword })

      const setCookie = (res.headers['set-cookie'] as unknown as string[]).find((c) =>
        c.startsWith('sessionId=')
      )!
      expect(setCookie.toLowerCase()).toMatch(/samesite=none/)
      expect(setCookie.toLowerCase()).toMatch(/secure/)
    } finally {
      process.env.NODE_ENV = originalEnv
    }
  })

  it('rejects a wrong password', async () => {
    const { user } = await createAdmin({ email: 'wrongpw@test.local' })

    const res = await api()
      .post('/api/auth/login')
      .send({ email: user.email, password: 'TotallyWrongPassword!' })

    expect(res.status).toBe(401)
    expect(res.body.message).toMatch(/invalid email or password/i)
  })

  it('rejects a nonexistent email with the same message as wrong password (no user enumeration)', async () => {
    const res = await api()
      .post('/api/auth/login')
      .send({ email: 'nobody-here@test.local', password: 'Whatever123!' })

    expect(res.status).toBe(401)
    expect(res.body.message).toMatch(/invalid email or password/i)
  })

  it('rejects login for an inactive account', async () => {
    const { user, rawPassword } = await createAdmin({
      email: 'inactive@test.local',
      isActive: false,
    })

    const res = await api()
      .post('/api/auth/login')
      .send({ email: user.email, password: rawPassword })

    expect(res.status).toBe(403)
    expect(res.body.message).toMatch(/inactive/i)
  })

  it('rejects login for a user with no role assigned', async () => {
    // Created directly via Prisma, bypassing the role-assigning factory —
    // simulates a data-integrity edge case (orphaned user record).
    const bcrypt = require('bcryptjs')
    const password = 'Password123!'
    const user = await prisma.user.create({
      data: {
        name: 'No Role',
        email: 'norole@test.local',
        password: await bcrypt.hash(password, 10),
      },
    })

    const res = await api().post('/api/auth/login').send({ email: user.email, password })

    expect(res.status).toBe(403)
    expect(res.body.message).toMatch(/no role assigned/i)
  })

  it('rejects an invalid body (bad email format, empty password)', async () => {
    const res = await api()
      .post('/api/auth/login')
      .send({ email: 'not-an-email', password: '' })

    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
  })
})

describe('GET /api/auth/me', () => {
  it('rejects an unauthenticated request', async () => {
    const res = await api().get('/api/auth/me')

    expect(res.status).toBe(401)
    expect(res.body.success).toBe(false)
  })

  it('returns the current user for a valid session', async () => {
    const { user, rawPassword } = await createAdmin({ email: 'me@test.local', name: 'Me Admin' })
    const { cookie } = await loginAs(user.email, rawPassword)

    const res = await api().get('/api/auth/me').set('Cookie', cookie)

    expect(res.status).toBe(200)
    expect(res.body.data).toMatchObject({
      id:    user.id,
      name:  'Me Admin',
      email: 'me@test.local',
      role:  'ADMIN',
    })
    expect(res.body.data.password).toBeUndefined()
  })
})

describe('POST /api/auth/logout', () => {
  it('logs out, clears the cookie, and invalidates the session server-side', async () => {
    const { user, rawPassword } = await createAdmin({ email: 'logout-me@test.local' })
    const { cookie } = await loginAs(user.email, rawPassword)

    const logoutRes = await api().post('/api/auth/logout').set('Cookie', cookie)
    expect(logoutRes.status).toBe(200)
    expect(logoutRes.body.success).toBe(true)

    const sessionCount = await prisma.session.count({ where: { user_id: user.id } })
    expect(sessionCount).toBe(0)

    // the same cookie must no longer work on a protected route
    const followUp = await api().get('/api/users').set('Cookie', cookie)
    expect(followUp.status).toBe(401)
  })

  it('returns 400 when no session cookie is present', async () => {
    const res = await api().post('/api/auth/logout')
    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/no session found/i)
  })

  it('is not rate-limited by authLimiter -- many accounts logging out from one IP must not 429', async () => {
    // Regression test: authLimiter's keyGenerator falls back to raw IP when
    // there's no email in the body (true of every logout request), so
    // mounting authLimiter (10 req/15min) on this route meant every account
    // sharing one browser/IP drew from the same bucket. Logout must rely
    // only on the global, identity-keyed apiLimiter instead.
    const accounts = await Promise.all(
      Array.from({ length: 12 }, (_, i) => createAdmin({ email: `logout-burst-${i}@test.local` }))
    )

    for (const { user } of accounts) {
      const session = await createSession(user.id)
      const res = await api().post('/api/auth/logout').set('Cookie', cookieFor(session.id))
      expect(res.status).toBe(200)
    }
  })
})

describe('session handling on protected routes', () => {
  it('rejects an expired session', async () => {
    const { user } = await createAdmin({ email: 'expired@test.local' })
    const session = await createSession(user.id, {
      expiresAt: new Date(Date.now() - 1000 * 60), // 1 minute in the past
    })

    const res = await api().get('/api/users').set('Cookie', cookieFor(session.id))

    expect(res.status).toBe(401)
    expect(res.body.message).toMatch(/session expired/i)

    // expired session should be cleaned up on access
    const stillExists = await prisma.session.findUnique({ where: { id: session.id } })
    expect(stillExists).toBeNull()
  })

  it('rejects a session id that does not exist at all', async () => {
    const res = await api().get('/api/users').set('Cookie', cookieFor('nonexistent-session-id'))
    expect(res.status).toBe(401)
  })

  it('rejects a request with no session cookie at all', async () => {
    const res = await api().get('/api/users')
    expect(res.status).toBe(401)
  })
})