// Direct-to-DB fixture creators. These bypass the API on purpose — they're
// for setting up PRECONDITIONS a test needs (e.g. "an admin already exists"),
// not for testing the register/login endpoints themselves. That's what
// auth.test.ts is for.
//
// Why this matters here specifically: registration is admin-gated
// (`POST /register` requires an authenticated ADMIN). That means the very
// first admin in any test run can't be created through the API at all —
// there's nobody logged in yet to authorize it. These factories solve that
// chicken-and-egg problem.

import bcrypt from 'bcryptjs'
import prisma from '../../lib/prisma'

let counter = 0
const unique = (label: string) => `${label}-${Date.now()}-${counter++}`

export async function createRole(name: 'ADMIN' | 'SUPERVISOR' | 'STAFF') {
  const existing = await prisma.userRole.findFirst({ where: { name } })
  if (existing) return existing
  return prisma.userRole.create({ data: { name } })
}

export async function createCompany(overrides: Partial<{ name: string; code: string }> = {}) {
  return prisma.company.create({
    data: {
      name: overrides.name ?? unique('Company'),
      code: overrides.code ?? unique('CODE'),
    },
  })
}

export async function createDivision(
  companyId: number,
  overrides: Partial<{ name: string; late_tolerance_minutes: number }> = {}
) {
  return prisma.division.create({
    data: {
      company_id: companyId,
      name: overrides.name ?? unique('Division'),
      late_tolerance_minutes: overrides.late_tolerance_minutes ?? 0,
    },
  })
}

export async function createShift(
  companyId: number,
  divisionId: number,
  overrides: Partial<{ name: string; start_time: string; end_time: string }> = {}
) {
  return prisma.shift.create({
    data: {
      company_id: companyId,
      division_id: divisionId,
      name: overrides.name ?? unique('Shift'),
      start_time: overrides.start_time ?? '08:00',
      end_time: overrides.end_time ?? '16:00',
    },
  })
}

const DEFAULT_PASSWORD = 'Password123!'

interface CreateUserOptions {
  name?: string
  email?: string
  password?: string
  companyId?: number
  divisionId?: number
  isActive?: boolean
}

async function createUserWithRole(
  roleName: 'ADMIN' | 'SUPERVISOR' | 'STAFF',
  opts: CreateUserOptions = {}
) {
  const role = await createRole(roleName)
  const password = opts.password ?? DEFAULT_PASSWORD
  const hashed = await bcrypt.hash(password, 10)

  const user = await prisma.user.create({
    data: {
      name: opts.name ?? unique(`${roleName}-user`),
      email: opts.email ?? `${unique(roleName.toLowerCase())}@test.local`,
      password: hashed,
      is_active: opts.isActive ?? true,
    },
  })

  const companyRole = await prisma.userCompanyRole.create({
    data: {
      user_id: user.id,
      role_id: role.id,
      company_id: opts.companyId ?? null,
      division_id: opts.divisionId ?? null,
    },
  })

  return { user, companyRole, rawPassword: password }
}

// ADMIN and SUPERVISOR never have company/division per your business rules.
export const createAdmin = (opts: CreateUserOptions = {}) => createUserWithRole('ADMIN', opts)
export const createSupervisor = (opts: CreateUserOptions = {}) =>
  createUserWithRole('SUPERVISOR', opts)

// STAFF must have both company and division.
export async function createStaff(
  companyId: number,
  divisionId: number,
  opts: CreateUserOptions = {}
) {
  return createUserWithRole('STAFF', { ...opts, companyId, divisionId })
}

// Creates a session row directly — useful for testing expired/invalid
// session scenarios that the real login flow can't produce on demand.
export async function createSession(
  userId: string,
  overrides: Partial<{ expiresAt: Date }> = {}
) {
  return prisma.session.create({
    data: {
      user_id: userId,
      expires_at: overrides.expiresAt ?? new Date(Date.now() + 1000 * 60 * 60 * 2),
    },
  })
}

// AttendanceStatus rows (PRESENT/LATE) are seeded once in globalSetup and
// never wiped by cleanDatabase — this just fetches the existing row.
export async function getAttendanceStatus(name: 'PRESENT' | 'LATE') {
  const status = await prisma.attendanceStatus.findFirst({ where: { name } })
  if (!status) throw new Error(`AttendanceStatus "${name}" not seeded — check globalSetup.ts`)
  return status
}

// Creates an Attendance row directly via Prisma — bypasses the /checkin
// endpoint entirely. Use this when a test needs precise control over
// check-in time, late/early-leave state, or shift linkage (e.g. testing
// checkout behavior in isolation, without checkin's side effects also
// being exercised in the same test).
export async function createAttendance(
  userId: string,
  companyId: number,
  divisionId: number,
  shiftId: number,
  overrides: Partial<{
    date: Date
    checkInAt: Date
    checkOutAt: Date | null
    isLate: boolean
    earlyLeave: boolean
    photoUrl: string
  }> = {}
) {
  const status = await getAttendanceStatus(overrides.isLate ? 'LATE' : 'PRESENT')
  const today = new Date()
  const dateOnly = new Date(today.toISOString().split('T')[0] + 'T00:00:00.000Z')

  return prisma.attendance.create({
    data: {
      user_id: userId,
      company_id: companyId,
      division_id: divisionId,
      shift_id: shiftId,
      date: overrides.date ?? dateOnly,
      check_in_at: overrides.checkInAt ?? new Date(),
      check_out_at: overrides.checkOutAt ?? null,
      photo_url: overrides.photoUrl ?? 'https://fake-cdn.test/seed-photo.jpg',
      is_late: overrides.isLate ?? false,
      late_minutes: overrides.isLate ? 30 : 0,
      early_leave: overrides.earlyLeave ?? false,
      status_id: status.id,
    },
  })
}

export async function createChecklistTemplate(
  companyId: number,
  divisionId: number,
  overrides: Partial<{ title: string }> = {}
) {
  return prisma.checklistTemplate.create({
    data: {
      company_id: companyId,
      division_id: divisionId,
      title: overrides.title ?? unique('Checklist'),
    },
  })
}

export async function createChecklistItem(
  templateId: number,
  overrides: Partial<{ order_no: number; description: string; requires_photo: boolean }> = {}
) {
  return prisma.checklistItem.create({
    data: {
      template_id: templateId,
      order_no: overrides.order_no ?? 1,
      description: overrides.description ?? unique('Item'),
      requires_photo: overrides.requires_photo ?? true,
    },
  })
}

// Bypasses POST /api/visit — useful for admin-side read/delete tests that
// need existing visit logs without exercising the create flow every time.
export async function createVisitLog(
  userId: string,
  companyId: number,
  overrides: Partial<{ notes: string; photoUrl: string; visitedAt: Date }> = {}
) {
  const today = new Date()
  const dateOnly = new Date(today.toISOString().split('T')[0] + 'T00:00:00.000Z')

  return prisma.visitLog.create({
    data: {
      user_id: userId,
      company_id: companyId,
      date: dateOnly,
      photo_url: overrides.photoUrl ?? 'https://fake-cdn.test/seed-visit.jpg',
      notes: overrides.notes ?? null,
      visited_at: overrides.visitedAt ?? today,
    },
  })
}