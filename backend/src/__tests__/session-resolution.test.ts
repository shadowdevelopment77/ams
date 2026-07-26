// Phase: rate-limiter identity keying. authMiddleware and resolveUser
// (mounted ahead of apiLimiter so it can key by user id instead of raw IP)
// now share one lookup implementation, resolveSessionUser. These tests
// cover that shared function directly, plus resolveUser's specific
// "never rejects" contract in isolation.
import express from 'express'
import request from 'supertest'
import prisma from '../lib/prisma'
import { resolveSessionUser } from '../middlewares/auth.middleware'
import { resolveUser } from '../middlewares/resolve-user.middleware'
import { createStaff, createCompany, createDivision, createSession } from './helpers/factories'

function fakeReq(sessionId?: string) {
  return { cookies: sessionId ? { sessionId } : {} } as any
}

describe('resolveSessionUser', () => {
  it('returns no_session when there is no sessionId cookie at all', async () => {
    const result = await resolveSessionUser(fakeReq())
    expect(result).toEqual({ ok: false, reason: 'no_session' })
  })

  it('returns invalid_session for a sessionId that does not exist', async () => {
    const result = await resolveSessionUser(fakeReq('00000000-0000-0000-0000-000000000000'))
    expect(result).toEqual({ ok: false, reason: 'invalid_session' })
  })

  it('returns expired for a past expiry, without deleting the row itself', async () => {
    // Deletion is authMiddleware's job on the reject path, not this shared
    // read function's -- resolveUser (best-effort, runs on every request
    // ahead of apiLimiter) shares this function too, and it must never
    // mutate state just from resolving who's calling.
    const company = await createCompany()
    const division = await createDivision(company.id)
    const { user } = await createStaff(company.id, division.id)
    const session = await createSession(user.id, { expiresAt: new Date(Date.now() - 1000) })

    const result = await resolveSessionUser(fakeReq(session.id))
    expect(result).toEqual({ ok: false, reason: 'expired' })

    const inDb = await prisma.session.findUnique({ where: { id: session.id } })
    expect(inDb).not.toBeNull()
  })

  it('returns no_role for a user with no UserCompanyRole row', async () => {
    const bareUser = await prisma.user.create({
      data: { name: 'No Role User', email: `no-role-${Date.now()}@test.local`, password: 'x' },
    })
    const session = await createSession(bareUser.id)

    const result = await resolveSessionUser(fakeReq(session.id))
    expect(result).toEqual({ ok: false, reason: 'no_role' })
  })

  it('resolves a valid session to the correct user, role, company, and division', async () => {
    const company = await createCompany()
    const division = await createDivision(company.id)
    const { user } = await createStaff(company.id, division.id)
    const session = await createSession(user.id)

    const result = await resolveSessionUser(fakeReq(session.id))
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('expected ok')
    expect(result.user).toEqual({
      id: user.id,
      role: 'STAFF',
      companyId: company.id,
      divisionId: division.id,
    })
    expect(result.sessionId).toBe(session.id)
  })
})

describe('resolveUser middleware', () => {
  // Minimal standalone app -- just resolveUser + a handler that echoes
  // req.user, so we can assert the "never rejects, just sets req.user
  // when possible" contract in isolation from apiLimiter/full app wiring.
  const testApp = express()
  testApp.use((req, _res, next) => {
    // supertest sends cookies as a raw header; parse the one we care about
    // without pulling in cookie-parser for this tiny harness.
    const raw = req.headers.cookie ?? ''
    const match = raw.match(/sessionId=([^;]+)/)
    ;(req as any).cookies = match ? { sessionId: match[1] } : {}
    next()
  })
  testApp.use(resolveUser)
  testApp.get('/whoami', (req, res) => res.json({ user: req.user ?? null }))

  it('leaves req.user unset and still responds when there is no session', async () => {
    const res = await request(testApp).get('/whoami')
    expect(res.status).toBe(200)
    expect(res.body.user).toBeNull()
  })

  it('leaves req.user unset (no error thrown) for a garbage session id', async () => {
    const res = await request(testApp).get('/whoami').set('Cookie', 'sessionId=not-a-real-session')
    expect(res.status).toBe(200)
    expect(res.body.user).toBeNull()
  })

  it('sets req.user for a valid session', async () => {
    const company = await createCompany()
    const division = await createDivision(company.id)
    const { user } = await createStaff(company.id, division.id)
    const session = await createSession(user.id)

    const res = await request(testApp).get('/whoami').set('Cookie', `sessionId=${session.id}`)
    expect(res.status).toBe(200)
    expect(res.body.user).toEqual({
      id: user.id,
      role: 'STAFF',
      companyId: company.id,
      divisionId: division.id,
    })
  })
})
