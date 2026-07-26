import prisma from '../lib/prisma'
import { api, loginAs } from './helpers/request'
import {
  createStaff,
  createSupervisor,
  createAdmin,
  createCompany,
  createDivision,
  createShift,
  createAttendance,
  createChecklistTemplate,
  createChecklistItem,
} from './helpers/factories'

// Shift start/end times deliberately pushed to the extreme edges of the day
// (00:01 / 23:59) so "late" / "on time" / "early leave" / "not early" are
// deterministic regardless of what real wall-clock time the test suite
// happens to run at — without needing to fake global timers (which risks
// interfering with Prisma's own internal timers). This has a theoretical
// ~1-2 minute flake window right at UTC midnight, which is an acceptable
// tradeoff for this test suite's scope.
const ALWAYS_ALREADY_STARTED = '00:01' // any real checkin time is after this -> late
const ALWAYS_NOT_YET_STARTED = '23:59' // any real checkin time is before this -> on time
const ALWAYS_NOT_YET_ENDED = '23:59' // any real checkout time is before this -> early leave
// Note: there's no standalone ALWAYS_ALREADY_ENDED constant — isNightShift()
// compares end_time vs start_time numerically, so an "already ended" end_time
// must be paired with a start_time that keeps end > start, or it gets
// (correctly) treated as an overnight shift. See the "NOT marked early_leave"
// test below for the safe pairing.

const fakePhoto = () => Buffer.from('fake-image-bytes')

// GPS is mandatory on checkin/checkout -- needed to get past validation.
const FAKE_LAT = -6.2088
const FAKE_LNG = 106.8456

describe('POST /api/attendance/checkin', () => {
  it('rejects an unauthenticated request', async () => {
    const res = await api()
      .post('/api/attendance/checkin')
      .field('shift_id', 1)
      .field('latitude', FAKE_LAT)
      .field('longitude', FAKE_LNG)
      .attach('photo', fakePhoto(), 'photo.jpg')

    expect(res.status).toBe(401)
  })

  it('rejects an unauthenticated request with 401 even when the body also fails validation (no shift_id, no photo)', async () => {
    // Order is multer, validateCheckIn, staffOnly -- must still 401, not leak
    // validation feedback to an anonymous caller via a 400 instead.
    const res = await api().post('/api/attendance/checkin')

    expect(res.status).toBe(401)
    expect(res.body.success).toBe(false)
  })

  it('rejects a non-STAFF user (ADMIN)', async () => {
    const { user, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(user.email, rawPassword)

    const res = await api()
      .post('/api/attendance/checkin')
      .set('Cookie', cookie)
      .field('shift_id', 1)
      .field('latitude', FAKE_LAT)
      .field('longitude', FAKE_LNG)
      .attach('photo', fakePhoto(), 'photo.jpg')

    expect(res.status).toBe(403)
  })

  it('rejects a non-STAFF user (SUPERVISOR)', async () => {
    const { user, rawPassword } = await createSupervisor()
    const { cookie } = await loginAs(user.email, rawPassword)

    const res = await api()
      .post('/api/attendance/checkin')
      .set('Cookie', cookie)
      .field('shift_id', 1)
      .field('latitude', FAKE_LAT)
      .field('longitude', FAKE_LNG)
      .attach('photo', fakePhoto(), 'photo.jpg')

    expect(res.status).toBe(403)
  })

  it('rejects checkin with no photo attached', async () => {
    const company = await createCompany()
    const division = await createDivision(company.id)
    const shift = await createShift(company.id, division.id)
    const { user, rawPassword } = await createStaff(company.id, division.id)
    const { cookie } = await loginAs(user.email, rawPassword)

    const res = await api()
      .post('/api/attendance/checkin')
      .set('Cookie', cookie)
      .field('shift_id', shift.id)
      .field('latitude', FAKE_LAT)
      .field('longitude', FAKE_LNG)

    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/photo is required/i)
  })

  it('rejects checkin with no shift_id', async () => {
    const company = await createCompany()
    const division = await createDivision(company.id)
    const { user, rawPassword } = await createStaff(company.id, division.id)
    const { cookie } = await loginAs(user.email, rawPassword)

    const res = await api()
      .post('/api/attendance/checkin')
      .set('Cookie', cookie)
      .field('latitude', FAKE_LAT)
      .field('longitude', FAKE_LNG)
      .attach('photo', fakePhoto(), 'photo.jpg')

    expect(res.status).toBe(400)
  })

  it('rejects checkin with a shift_id that does not exist', async () => {
    const company = await createCompany()
    const division = await createDivision(company.id)
    const { user, rawPassword } = await createStaff(company.id, division.id)
    const { cookie } = await loginAs(user.email, rawPassword)

    const res = await api()
      .post('/api/attendance/checkin')
      .set('Cookie', cookie)
      .field('shift_id', 999999)
      .field('latitude', FAKE_LAT)
      .field('longitude', FAKE_LNG)
      .attach('photo', fakePhoto(), 'photo.jpg')

    expect(res.status).toBe(404)
    expect(res.body.message).toMatch(/shift not found/i)
  })

  it('rejects a shift that belongs to a different company/division', async () => {
    const staffCompany = await createCompany()
    const staffDivision = await createDivision(staffCompany.id)
    const { user, rawPassword } = await createStaff(staffCompany.id, staffDivision.id)
    const { cookie } = await loginAs(user.email, rawPassword)

    const otherCompany = await createCompany()
    const otherDivision = await createDivision(otherCompany.id)
    const foreignShift = await createShift(otherCompany.id, otherDivision.id)

    const res = await api()
      .post('/api/attendance/checkin')
      .set('Cookie', cookie)
      .field('shift_id', foreignShift.id)
      .field('latitude', FAKE_LAT)
      .field('longitude', FAKE_LNG)
      .attach('photo', fakePhoto(), 'photo.jpg')

    expect(res.status).toBe(403)
    expect(res.body.message).toMatch(/does not belong to your division/i)
  })

  it('checks in successfully and stamps company/division from the session, not the body', async () => {
    const company = await createCompany()
    const division = await createDivision(company.id)
    const shift = await createShift(company.id, division.id, { start_time: ALWAYS_NOT_YET_STARTED })
    const { user, rawPassword } = await createStaff(company.id, division.id)
    const { cookie } = await loginAs(user.email, rawPassword)

    const res = await api()
      .post('/api/attendance/checkin')
      .set('Cookie', cookie)
      .field('shift_id', shift.id)
      .field('latitude', FAKE_LAT)
      .field('longitude', FAKE_LNG)
      .attach('photo', fakePhoto(), 'photo.jpg')

    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
    expect(res.body.data.user_id).toBe(user.id)
    expect(res.body.data.company_id).toBe(company.id)
    expect(res.body.data.division_id).toBe(division.id)
    expect(res.body.data.photo_url).toBe('https://fake-cdn.test/mock-photo.jpg') // from the uploadImage mock
    expect(res.body.data.is_late).toBe(false)

    const inDb = await prisma.attendance.findUnique({ where: { id: res.body.data.id } })
    expect(inDb).not.toBeNull()
  })

  it('marks checkin as late with a positive late_minutes when after shift start', async () => {
    const company = await createCompany()
    const division = await createDivision(company.id)
    const shift = await createShift(company.id, division.id, { start_time: ALWAYS_ALREADY_STARTED })
    const { user, rawPassword } = await createStaff(company.id, division.id)
    const { cookie } = await loginAs(user.email, rawPassword)

    const res = await api()
      .post('/api/attendance/checkin')
      .set('Cookie', cookie)
      .field('shift_id', shift.id)
      .field('latitude', FAKE_LAT)
      .field('longitude', FAKE_LNG)
      .attach('photo', fakePhoto(), 'photo.jpg')

    expect(res.status).toBe(201)
    expect(res.body.data.is_late).toBe(true)
    expect(res.body.data.late_minutes).toBeGreaterThan(0)
  })

  it('is not late when checking in before shift start', async () => {
    const company = await createCompany()
    const division = await createDivision(company.id)
    const shift = await createShift(company.id, division.id, { start_time: ALWAYS_NOT_YET_STARTED })
    const { user, rawPassword } = await createStaff(company.id, division.id)
    const { cookie } = await loginAs(user.email, rawPassword)

    const res = await api()
      .post('/api/attendance/checkin')
      .set('Cookie', cookie)
      .field('shift_id', shift.id)
      .field('latitude', FAKE_LAT)
      .field('longitude', FAKE_LNG)
      .attach('photo', fakePhoto(), 'photo.jpg')

    expect(res.status).toBe(201)
    expect(res.body.data.is_late).toBe(false)
    expect(res.body.data.late_minutes).toBe(0)
  })

  it('rejects a second checkin on the same day (one-per-day enforcement)', async () => {
    const company = await createCompany()
    const division = await createDivision(company.id)
    const shift = await createShift(company.id, division.id, { start_time: ALWAYS_NOT_YET_STARTED })
    const { user, rawPassword } = await createStaff(company.id, division.id)
    const { cookie } = await loginAs(user.email, rawPassword)

    const first = await api()
      .post('/api/attendance/checkin')
      .set('Cookie', cookie)
      .field('shift_id', shift.id)
      .field('latitude', FAKE_LAT)
      .field('longitude', FAKE_LNG)
      .attach('photo', fakePhoto(), 'photo.jpg')
    expect(first.status).toBe(201)

    const second = await api()
      .post('/api/attendance/checkin')
      .set('Cookie', cookie)
      .field('shift_id', shift.id)
      .field('latitude', FAKE_LAT)
      .field('longitude', FAKE_LNG)
      .attach('photo', fakePhoto(), 'photo.jpg')

    expect(second.status).toBe(409)
    expect(second.body.message).toMatch(/already checked in today/i)
  })

  it('bulk-creates checklist submissions for every item in the division template', async () => {
    const company = await createCompany()
    const division = await createDivision(company.id)
    const shift = await createShift(company.id, division.id, { start_time: ALWAYS_NOT_YET_STARTED })
    const { user, rawPassword } = await createStaff(company.id, division.id)
    const { cookie } = await loginAs(user.email, rawPassword)

    const template = await createChecklistTemplate(company.id, division.id)
    const itemA = await createChecklistItem(template.id, { order_no: 1 })
    const itemB = await createChecklistItem(template.id, { order_no: 2 })

    const res = await api()
      .post('/api/attendance/checkin')
      .set('Cookie', cookie)
      .field('shift_id', shift.id)
      .field('latitude', FAKE_LAT)
      .field('longitude', FAKE_LNG)
      .attach('photo', fakePhoto(), 'photo.jpg')

    expect(res.status).toBe(201)

    const submissions = await prisma.checklistSubmission.findMany({
      where: { attendance_id: res.body.data.id },
    })
    expect(submissions).toHaveLength(2)
    expect(submissions.every((s) => s.is_submitted === false)).toBe(true)
    expect(submissions.map((s) => s.item_id).sort()).toEqual([itemA.id, itemB.id].sort())
  })

  it('does not create checklist submissions when the division has no template', async () => {
    const company = await createCompany()
    const division = await createDivision(company.id)
    const shift = await createShift(company.id, division.id, { start_time: ALWAYS_NOT_YET_STARTED })
    const { user, rawPassword } = await createStaff(company.id, division.id)
    const { cookie } = await loginAs(user.email, rawPassword)

    const res = await api()
      .post('/api/attendance/checkin')
      .set('Cookie', cookie)
      .field('shift_id', shift.id)
      .field('latitude', FAKE_LAT)
      .field('longitude', FAKE_LNG)
      .attach('photo', fakePhoto(), 'photo.jpg')

    expect(res.status).toBe(201)

    const submissions = await prisma.checklistSubmission.findMany({
      where: { attendance_id: res.body.data.id },
    })
    expect(submissions).toHaveLength(0)
  })

  it('handles two simultaneous checkins from the same staff — exactly one succeeds', async () => {
    const company = await createCompany()
    const division = await createDivision(company.id)
    const shift = await createShift(company.id, division.id, { start_time: ALWAYS_NOT_YET_STARTED })
    const { user, rawPassword } = await createStaff(company.id, division.id)
    const { cookie } = await loginAs(user.email, rawPassword)

    // Fired truly concurrently — both requests can pass
    // checkUserDayAttendance's read before either write lands, so this
    // exercises the P2002 fallback on Attendance's @@unique([user_id, date]).
    const [resA, resB] = await Promise.all([
      api()
        .post('/api/attendance/checkin')
        .set('Cookie', cookie)
        .field('shift_id', shift.id)
        .field('latitude', FAKE_LAT)
      .field('longitude', FAKE_LNG)
      .attach('photo', fakePhoto(), 'photo.jpg'),
      api()
        .post('/api/attendance/checkin')
        .set('Cookie', cookie)
        .field('shift_id', shift.id)
        .field('latitude', FAKE_LAT)
      .field('longitude', FAKE_LNG)
      .attach('photo', fakePhoto(), 'photo.jpg'),
    ])

    const statuses = [resA.status, resB.status].sort()
    expect(statuses).toEqual([201, 409])

    const loser = resA.status === 409 ? resA : resB
    expect(loser.body.message).toMatch(/already checked in today/i)

    const count = await prisma.attendance.count({ where: { user_id: user.id } })
    expect(count).toBe(1)
  })
})

describe('PATCH /api/attendance/checkout/:id — auth-before-upload ordering', () => {
  it('rejects an unauthenticated request with 401 before multer ever processes the file', async () => {
    const res = await api()
      .patch('/api/attendance/checkout/some-nonexistent-id')
      .attach('checkout_photo', Buffer.from('not-an-image'), {
        filename: 'malware.exe',
        contentType: 'application/x-msdownload',
      })

    expect(res.status).toBe(401)
    expect(res.body.success).toBe(false)
  })
})

describe('POST /api/attendance/checkin — malformed upload handling', () => {
  it('rejects a disallowed file type with a structured 400 response, not a generic 500', async () => {
    const company = await createCompany()
    const division = await createDivision(company.id)
    const shift = await createShift(company.id, division.id)
    const { user, rawPassword } = await createStaff(company.id, division.id)
    const { cookie } = await loginAs(user.email, rawPassword)

    const res = await api()
      .post('/api/attendance/checkin')
      .set('Cookie', cookie)
      .field('shift_id', shift.id)
      .attach('photo', Buffer.from('not-an-image'), {
        filename: 'malware.exe',
        contentType: 'application/x-msdownload',
      })

    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
    expect(res.body.message).toMatch(/jpeg, png, and webp/i)
  })

  it('rejects a file over the 1MB limit with a structured 413 response, not a generic 500', async () => {
    const company = await createCompany()
    const division = await createDivision(company.id)
    const shift = await createShift(company.id, division.id)
    const { user, rawPassword } = await createStaff(company.id, division.id)
    const { cookie } = await loginAs(user.email, rawPassword)

    const oversized = Buffer.alloc(1 * 1024 * 1024 + 1, 'a') // 1 byte over MAX_SIZE

    const res = await api()
      .post('/api/attendance/checkin')
      .set('Cookie', cookie)
      .field('shift_id', shift.id)
      .attach('photo', oversized, { filename: 'huge.jpg', contentType: 'image/jpeg' })

    expect(res.status).toBe(413)
    expect(res.body.success).toBe(false)
    expect(res.body.message).toMatch(/file too large/i)
  })
})

describe('PATCH /api/attendance/checkout/:id', () => {
  it('rejects an unauthenticated request', async () => {
    const res = await api()
      .patch('/api/attendance/checkout/some-id')
      .field('checkout_latitude', FAKE_LAT)
      .field('checkout_longitude', FAKE_LNG)
      .attach('checkout_photo', fakePhoto(), 'photo.jpg')

    expect(res.status).toBe(401)
  })

  it('rejects a non-STAFF user', async () => {
    const { user, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(user.email, rawPassword)

    const res = await api()
      .patch('/api/attendance/checkout/some-id')
      .set('Cookie', cookie)
      .field('checkout_latitude', FAKE_LAT)
      .field('checkout_longitude', FAKE_LNG)
      .attach('checkout_photo', fakePhoto(), 'photo.jpg')

    expect(res.status).toBe(403)
  })

  it('rejects checkout with no photo attached', async () => {
    const company = await createCompany()
    const division = await createDivision(company.id)
    const { user, rawPassword } = await createStaff(company.id, division.id)
    const { cookie } = await loginAs(user.email, rawPassword)

    // GPS is required now, so a bare {} would fail validation before ever
    // reaching the controller's `if (!req.file)` check -- send valid lat/lng
    // so validation passes and this actually tests the photo-required path.
    const res = await api()
      .patch('/api/attendance/checkout/some-id')
      .set('Cookie', cookie)
      .send({ checkout_latitude: FAKE_LAT, checkout_longitude: FAKE_LNG })

    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/photo is required/i)
  })

  it('returns 404 for an attendance id that does not exist', async () => {
    const company = await createCompany()
    const division = await createDivision(company.id)
    const { user, rawPassword } = await createStaff(company.id, division.id)
    const { cookie } = await loginAs(user.email, rawPassword)

    const res = await api()
      .patch('/api/attendance/checkout/00000000-0000-0000-0000-000000000000')
      .set('Cookie', cookie)
      .field('checkout_latitude', FAKE_LAT)
      .field('checkout_longitude', FAKE_LNG)
      .attach('checkout_photo', fakePhoto(), 'photo.jpg')

    expect(res.status).toBe(404)
    expect(res.body.message).toMatch(/attendance not found/i)
  })

  it("rejects checkout on another staff member's attendance (ownership check)", async () => {
    const company = await createCompany()
    const division = await createDivision(company.id)
    const shift = await createShift(company.id, division.id)

    const { user: owner } = await createStaff(company.id, division.id)
    const attendance = await createAttendance(owner.id, company.id, division.id, shift.id)

    const { user: intruder, rawPassword: intruderPw } = await createStaff(company.id, division.id)
    const { cookie } = await loginAs(intruder.email, intruderPw)

    const res = await api()
      .patch(`/api/attendance/checkout/${attendance.id}`)
      .set('Cookie', cookie)
      .field('checkout_latitude', FAKE_LAT)
      .field('checkout_longitude', FAKE_LNG)
      .attach('checkout_photo', fakePhoto(), 'photo.jpg')

    expect(res.status).toBe(403)
    expect(res.body.message).toMatch(/access denied/i)
  })

  it('rejects a second checkout on an attendance that already has one', async () => {
    const company = await createCompany()
    const division = await createDivision(company.id)
    const shift = await createShift(company.id, division.id)
    const { user, rawPassword } = await createStaff(company.id, division.id)
    const { cookie } = await loginAs(user.email, rawPassword)

    const attendance = await createAttendance(user.id, company.id, division.id, shift.id, {
      checkOutAt: new Date(), // already checked out
    })

    const res = await api()
      .patch(`/api/attendance/checkout/${attendance.id}`)
      .set('Cookie', cookie)
      .field('checkout_latitude', FAKE_LAT)
      .field('checkout_longitude', FAKE_LNG)
      .attach('checkout_photo', fakePhoto(), 'photo.jpg')

    expect(res.status).toBe(409)
    expect(res.body.message).toMatch(/already checked out/i)
  })

  it('checks out successfully and is NOT marked early_leave when after shift end', async () => {
    const company = await createCompany()
    const division = await createDivision(company.id)
    // start=00:01, end=00:02 -> same-day shift (NOT a night shift; end > start
    // numerically), and both times are almost always already in the past
    // relative to whenever this test actually runs.
    const shift = await createShift(company.id, division.id, {
      start_time: '00:01',
      end_time: '00:02',
    })
    const { user, rawPassword } = await createStaff(company.id, division.id)
    const { cookie } = await loginAs(user.email, rawPassword)

    const attendance = await createAttendance(user.id, company.id, division.id, shift.id)

    const res = await api()
      .patch(`/api/attendance/checkout/${attendance.id}`)
      .set('Cookie', cookie)
      .field('checkout_latitude', FAKE_LAT)
      .field('checkout_longitude', FAKE_LNG)
      .attach('checkout_photo', fakePhoto(), 'photo.jpg')

    expect(res.status).toBe(200)
    expect(res.body.data.early_leave).toBe(false)
    expect(res.body.data.checkout_photo_url).toBe('https://fake-cdn.test/mock-photo.jpg')
    expect(res.body.data.check_out_at).not.toBeNull()
  })

  it('marks early_leave true when checking out before shift end', async () => {
    const company = await createCompany()
    const division = await createDivision(company.id)
    const shift = await createShift(company.id, division.id, { end_time: ALWAYS_NOT_YET_ENDED })
    const { user, rawPassword } = await createStaff(company.id, division.id)
    const { cookie } = await loginAs(user.email, rawPassword)

    const attendance = await createAttendance(user.id, company.id, division.id, shift.id)

    const res = await api()
      .patch(`/api/attendance/checkout/${attendance.id}`)
      .set('Cookie', cookie)
      .field('checkout_latitude', FAKE_LAT)
      .field('checkout_longitude', FAKE_LNG)
      .attach('checkout_photo', fakePhoto(), 'photo.jpg')

    expect(res.status).toBe(200)
    expect(res.body.data.early_leave).toBe(true)
  })

  it('accounts for a night shift crossing midnight when deciding early_leave', async () => {
    // start=22:00, end=06:00 -> isNightShift() is true -> shiftEnd rolls to
    // "tomorrow" 06:00, which is always in the future relative to "now" ->
    // checking out now should always register as early_leave.
    const company = await createCompany()
    const division = await createDivision(company.id)
    const shift = await createShift(company.id, division.id, {
      start_time: '22:00',
      end_time: '06:00',
    })
    const { user, rawPassword } = await createStaff(company.id, division.id)
    const { cookie } = await loginAs(user.email, rawPassword)

    const attendance = await createAttendance(user.id, company.id, division.id, shift.id)

    const res = await api()
      .patch(`/api/attendance/checkout/${attendance.id}`)
      .set('Cookie', cookie)
      .field('checkout_latitude', FAKE_LAT)
      .field('checkout_longitude', FAKE_LNG)
      .attach('checkout_photo', fakePhoto(), 'photo.jpg')

    expect(res.status).toBe(200)
    expect(res.body.data.early_leave).toBe(true)
  })
})

describe('PATCH /api/attendance/early-leave/:id', () => {
  it('rejects an unauthenticated request', async () => {
    const res = await api()
      .patch('/api/attendance/early-leave/some-id')
      .send({ early_leave_reason: 'Family emergency' })

    expect(res.status).toBe(401)
  })

  it('rejects an unauthenticated request with 401 even when the body also fails validation (empty reason)', async () => {
    // Must still 401, not leak validation feedback via a 400 to an anonymous caller.
    const res = await api()
      .patch('/api/attendance/early-leave/some-id')
      .send({ early_leave_reason: '' })

    expect(res.status).toBe(401)
    expect(res.body.success).toBe(false)
  })

  it('rejects a non-STAFF user', async () => {
    const { user, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(user.email, rawPassword)

    const res = await api()
      .patch('/api/attendance/early-leave/some-id')
      .set('Cookie', cookie)
      .send({ early_leave_reason: 'Family emergency' })

    expect(res.status).toBe(403)
  })

  it('rejects an empty reason', async () => {
    const company = await createCompany()
    const division = await createDivision(company.id)
    const { user, rawPassword } = await createStaff(company.id, division.id)
    const { cookie } = await loginAs(user.email, rawPassword)

    const res = await api()
      .patch('/api/attendance/early-leave/some-id')
      .set('Cookie', cookie)
      .send({ early_leave_reason: '' })

    expect(res.status).toBe(400)
  })

  it('returns 404 for a nonexistent attendance id', async () => {
    const company = await createCompany()
    const division = await createDivision(company.id)
    const { user, rawPassword } = await createStaff(company.id, division.id)
    const { cookie } = await loginAs(user.email, rawPassword)

    const res = await api()
      .patch('/api/attendance/early-leave/00000000-0000-0000-0000-000000000000')
      .set('Cookie', cookie)
      .send({ early_leave_reason: 'Family emergency' })

    expect(res.status).toBe(404)
  })

  it("rejects submitting a reason on another staff member's attendance", async () => {
    const company = await createCompany()
    const division = await createDivision(company.id)
    const shift = await createShift(company.id, division.id)
    const { user: owner } = await createStaff(company.id, division.id)
    const attendance = await createAttendance(owner.id, company.id, division.id, shift.id, {
      earlyLeave: true,
    })

    const { user: intruder, rawPassword: intruderPw } = await createStaff(company.id, division.id)
    const { cookie } = await loginAs(intruder.email, intruderPw)

    const res = await api()
      .patch(`/api/attendance/early-leave/${attendance.id}`)
      .set('Cookie', cookie)
      .send({ early_leave_reason: 'Not mine to submit' })

    expect(res.status).toBe(403)
  })

  it('rejects submitting a reason when the attendance was not actually an early leave', async () => {
    const company = await createCompany()
    const division = await createDivision(company.id)
    const shift = await createShift(company.id, division.id)
    const { user, rawPassword } = await createStaff(company.id, division.id)
    const { cookie } = await loginAs(user.email, rawPassword)

    const attendance = await createAttendance(user.id, company.id, division.id, shift.id, {
      earlyLeave: false,
    })

    const res = await api()
      .patch(`/api/attendance/early-leave/${attendance.id}`)
      .set('Cookie', cookie)
      .send({ early_leave_reason: 'Should not be allowed' })

    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/not an early leave/i)
  })

  it('successfully submits a reason for a genuine early leave', async () => {
    const company = await createCompany()
    const division = await createDivision(company.id)
    const shift = await createShift(company.id, division.id)
    const { user, rawPassword } = await createStaff(company.id, division.id)
    const { cookie } = await loginAs(user.email, rawPassword)

    const attendance = await createAttendance(user.id, company.id, division.id, shift.id, {
      earlyLeave: true,
    })

    const res = await api()
      .patch(`/api/attendance/early-leave/${attendance.id}`)
      .set('Cookie', cookie)
      .send({ early_leave_reason: 'Doctor appointment' })

    expect(res.status).toBe(200)

    const inDb = await prisma.attendance.findUnique({ where: { id: attendance.id } })
    expect(inDb?.early_leave_reason).toBe('Doctor appointment')
  })
})

describe('GET /api/attendance/today', () => {
  it('rejects an unauthenticated request', async () => {
    const res = await api().get('/api/attendance/today')
    expect(res.status).toBe(401)
  })

  it('rejects a non-STAFF user (ADMIN)', async () => {
    const { user, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(user.email, rawPassword)
    const res = await api().get('/api/attendance/today').set('Cookie', cookie)
    expect(res.status).toBe(403)
  })

  it('returns null when the caller has not checked in today', async () => {
    const company = await createCompany()
    const division = await createDivision(company.id)
    const { user, rawPassword } = await createStaff(company.id, division.id)
    const { cookie } = await loginAs(user.email, rawPassword)

    const res = await api().get('/api/attendance/today').set('Cookie', cookie)

    expect(res.status).toBe(200)
    expect(res.body.data).toBeNull()
  })

  it("returns the caller's own attendance row for today, not another user's", async () => {
    const company = await createCompany()
    const division = await createDivision(company.id)
    const shift = await createShift(company.id, division.id)
    const { user, rawPassword } = await createStaff(company.id, division.id)
    const otherStaff = await createStaff(company.id, division.id)
    const { cookie } = await loginAs(user.email, rawPassword)

    const attendance = await createAttendance(user.id, company.id, division.id, shift.id)
    await createAttendance(otherStaff.user.id, company.id, division.id, shift.id)

    const res = await api().get('/api/attendance/today').set('Cookie', cookie)

    expect(res.status).toBe(200)
    expect(res.body.data.id).toBe(attendance.id)
    expect(res.body.data.user_id).toBe(user.id)
  })
})

describe('GET /api/attendance/history', () => {
  it('rejects an unauthenticated request', async () => {
    const res = await api().get('/api/attendance/history')
    expect(res.status).toBe(401)
  })

  it('rejects a non-STAFF user (ADMIN)', async () => {
    const { user, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(user.email, rawPassword)
    const res = await api().get('/api/attendance/history').set('Cookie', cookie)
    expect(res.status).toBe(403)
  })

  it('returns an empty list when the caller has no attendance yet', async () => {
    const company = await createCompany()
    const division = await createDivision(company.id)
    const { user, rawPassword } = await createStaff(company.id, division.id)
    const { cookie } = await loginAs(user.email, rawPassword)

    const res = await api().get('/api/attendance/history').set('Cookie', cookie)

    expect(res.status).toBe(200)
    expect(res.body.data.data).toEqual([])
  })

  it("returns the caller's own history across multiple days, newest first, not another user's", async () => {
    const company = await createCompany()
    const division = await createDivision(company.id)
    const shift = await createShift(company.id, division.id)
    const { user, rawPassword } = await createStaff(company.id, division.id)
    const otherStaff = await createStaff(company.id, division.id)
    const { cookie } = await loginAs(user.email, rawPassword)

    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const older = await createAttendance(user.id, company.id, division.id, shift.id, { date: twoDaysAgo })
    const recent = await createAttendance(user.id, company.id, division.id, shift.id, { date: yesterday })
    await createAttendance(otherStaff.user.id, company.id, division.id, shift.id)

    const res = await api().get('/api/attendance/history').set('Cookie', cookie)

    expect(res.status).toBe(200)
    expect(res.body.data.data.length).toBe(2)
    expect(res.body.data.data[0].id).toBe(recent.id)
    expect(res.body.data.data[1].id).toBe(older.id)
    expect(res.body.data.data.every((a: any) => a.user_id === user.id)).toBe(true)
  })
})