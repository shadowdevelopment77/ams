import request from 'supertest'
import app from '../../app'

export const api = () => request(app)

// SESSION_COOKIE_NAME must match whatever name auth.controller.ts sets and
// auth.middleware.ts reads. If you standardized on `session_id` instead of
// `sessionId` when fixing the mismatch, change this one constant.
export const SESSION_COOKIE_NAME = 'sessionId'

interface LoginResult {
  cookie: string
  body: any
  status: number
}

// Logs in via the real HTTP endpoint and returns a ready-to-use Cookie
// header value, e.g. request.get('/x').set('Cookie', result.cookie)
export async function loginAs(email: string, password: string): Promise<LoginResult> {
  const res = await api().post('/api/auth/login').send({ email, password })

  const rawCookie = (res.headers['set-cookie'] as unknown as string[] | undefined)?.find((c) =>
    c.startsWith(`${SESSION_COOKIE_NAME}=`)
  )

  if (!rawCookie) {
    throw new Error(
      `Login did not return a ${SESSION_COOKIE_NAME} cookie for ${email}. ` +
        `Status: ${res.status}, body: ${JSON.stringify(res.body)}`
    )
  }

  return {
    cookie: rawCookie.split(';')[0], // "sessionId=abc123"
    body: res.body,
    status: res.status,
  }
}

// For tests that need to attach a raw session id directly (e.g. a session
// created via factories.createSession, or a deliberately garbage value)
// without going through a real login.
export const cookieFor = (sessionId: string) => `${SESSION_COOKIE_NAME}=${sessionId}`