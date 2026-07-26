import prisma from '../lib/prisma'
import { api, loginAs } from './helpers/request'
import {
  createAdmin,
  createStaff,
  createSupervisor,
  createCompany,
  createDivision,
  createShift,
  createAttendance,
  createChecklistTemplate,
  createChecklistItem,
  createChecklistSubmission,
  createChecklistPhoto,
} from './helpers/factories'

const fakePhoto = () => Buffer.from('fake-image-bytes')

// ─── Templates (admin) ──────────────────────────────────────────────────────

describe('POST /api/checklist/templates', () => {
  it('rejects an unauthenticated request', async () => {
    const res = await api().post('/api/checklist/templates').send({ company_id: 1, division_id: 1, title: 'X' })
    expect(res.status).toBe(401)
  })

  it('rejects a non-ADMIN user', async () => {
    const { user, rawPassword } = await createSupervisor()
    const { cookie } = await loginAs(user.email, rawPassword)

    const res = await api()
      .post('/api/checklist/templates')
      .set('Cookie', cookie)
      .send({ company_id: 1, division_id: 1, title: 'X' })

    expect(res.status).toBe(403)
  })

  it('rejects a company_id that does not exist', async () => {
    const { user, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(user.email, rawPassword)

    const res = await api()
      .post('/api/checklist/templates')
      .set('Cookie', cookie)
      .send({ company_id: 999999, division_id: 1, title: 'Opening Checklist' })

    expect(res.status).toBe(404)
    expect(res.body.message).toMatch(/company not found/i)
  })

  it('creates a template successfully', async () => {
    const { user, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(user.email, rawPassword)
    const company = await createCompany()
    const division = await createDivision(company.id)

    const res = await api()
      .post('/api/checklist/templates')
      .set('Cookie', cookie)
      .send({ company_id: company.id, division_id: division.id, title: 'Opening Checklist' })

    expect(res.status).toBe(201)
    expect(res.body.data.title).toBe('Opening Checklist')
  })
})

describe('GET /api/checklist/templates', () => {
  it('rejects an unauthenticated request', async () => {
    const res = await api().get('/api/checklist/templates?companyId=1&divisionId=1')
    expect(res.status).toBe(401)
  })

  it('rejects a non-ADMIN user', async () => {
    const company = await createCompany()
    const division = await createDivision(company.id)
    const { user, rawPassword } = await createStaff(company.id, division.id)
    const { cookie } = await loginAs(user.email, rawPassword)
    const res = await api().get('/api/checklist/templates?companyId=1&divisionId=1').set('Cookie', cookie)
    expect(res.status).toBe(403)
  })

  it('returns templates for the given company/division', async () => {
    const { user, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(user.email, rawPassword)
    const company = await createCompany()
    const division = await createDivision(company.id)
    await createChecklistTemplate(company.id, division.id)

    const res = await api()
      .get(`/api/checklist/templates?companyId=${company.id}&divisionId=${division.id}`)
      .set('Cookie', cookie)

    expect(res.status).toBe(200)
    expect(res.body.data.length).toBeGreaterThanOrEqual(1)
  })
})

describe('PUT /api/checklist/templates/:id', () => {
  it('rejects a non-ADMIN user', async () => {
    const { user, rawPassword } = await createSupervisor()
    const { cookie } = await loginAs(user.email, rawPassword)
    const res = await api().put('/api/checklist/templates/1').set('Cookie', cookie).send({ title: 'New' })
    expect(res.status).toBe(403)
  })

  it('returns 404 for a nonexistent template', async () => {
    const { user, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(user.email, rawPassword)
    const res = await api().put('/api/checklist/templates/999999').set('Cookie', cookie).send({ title: 'New' })
    expect(res.status).toBe(404)
  })

  it('updates a template successfully', async () => {
    const { user, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(user.email, rawPassword)
    const company = await createCompany()
    const division = await createDivision(company.id)
    const template = await createChecklistTemplate(company.id, division.id)

    const res = await api()
      .put(`/api/checklist/templates/${template.id}`)
      .set('Cookie', cookie)
      .send({ title: 'Renamed Checklist' })

    expect(res.status).toBe(200)
    expect(res.body.data.title).toBe('Renamed Checklist')
  })
})

describe('DELETE /api/checklist/templates/:id', () => {
  it('rejects a non-ADMIN user', async () => {
    const { user, rawPassword } = await createSupervisor()
    const { cookie } = await loginAs(user.email, rawPassword)
    const res = await api().delete('/api/checklist/templates/1').set('Cookie', cookie)
    expect(res.status).toBe(403)
  })

  it('returns 404 for a nonexistent template', async () => {
    const { user, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(user.email, rawPassword)
    const res = await api().delete('/api/checklist/templates/999999').set('Cookie', cookie)
    expect(res.status).toBe(404)
  })

  it('soft-deletes a template', async () => {
    const { user, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(user.email, rawPassword)
    const company = await createCompany()
    const division = await createDivision(company.id)
    const template = await createChecklistTemplate(company.id, division.id)

    const res = await api().delete(`/api/checklist/templates/${template.id}`).set('Cookie', cookie)
    expect(res.status).toBe(200)

    const inDb = await prisma.checklistTemplate.findUnique({ where: { id: template.id } })
    expect(inDb?.is_deleted).toBe(true)
  })
})

// ─── Items (admin) ───────────────────────────────────────────────────────────

describe('POST /api/checklist/items', () => {
  it('rejects a non-ADMIN user', async () => {
    const { user, rawPassword } = await createSupervisor()
    const { cookie } = await loginAs(user.email, rawPassword)
    const res = await api()
      .post('/api/checklist/items')
      .set('Cookie', cookie)
      .send({ template_id: 1, order_no: 1, description: 'Check fire extinguisher', requires_photo: true })
    expect(res.status).toBe(403)
  })

  it('rejects a template_id that does not exist', async () => {
    const { user, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(user.email, rawPassword)

    const res = await api()
      .post('/api/checklist/items')
      .set('Cookie', cookie)
      .send({ template_id: 999999, order_no: 1, description: 'Check fire extinguisher', requires_photo: true })

    expect(res.status).toBe(404)
  })

  it('creates an item successfully', async () => {
    const { user, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(user.email, rawPassword)
    const company = await createCompany()
    const division = await createDivision(company.id)
    const template = await createChecklistTemplate(company.id, division.id)

    const res = await api()
      .post('/api/checklist/items')
      .set('Cookie', cookie)
      .send({
        template_id: template.id,
        order_no: 1,
        description: 'Check fire extinguisher',
        requires_photo: true,
      })

    expect(res.status).toBe(201)
    expect(res.body.data.description).toBe('Check fire extinguisher')
  })
})

describe('GET /api/checklist/items/template/:templateId', () => {
  it('rejects a non-ADMIN user', async () => {
    const { user, rawPassword } = await createSupervisor()
    const { cookie } = await loginAs(user.email, rawPassword)
    const res = await api().get('/api/checklist/items/template/1').set('Cookie', cookie)
    expect(res.status).toBe(403)
  })

  it('returns 404 for a nonexistent template', async () => {
    const { user, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(user.email, rawPassword)
    const res = await api().get('/api/checklist/items/template/999999').set('Cookie', cookie)
    expect(res.status).toBe(404)
  })

  it('returns items for the given template', async () => {
    const { user, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(user.email, rawPassword)
    const company = await createCompany()
    const division = await createDivision(company.id)
    const template = await createChecklistTemplate(company.id, division.id)
    await createChecklistItem(template.id)

    const res = await api().get(`/api/checklist/items/template/${template.id}`).set('Cookie', cookie)
    expect(res.status).toBe(200)
  })
})

describe('PUT /api/checklist/items/:id and DELETE /api/checklist/items/:id', () => {
  it('updates an item successfully', async () => {
    const { user, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(user.email, rawPassword)
    const company = await createCompany()
    const division = await createDivision(company.id)
    const template = await createChecklistTemplate(company.id, division.id)
    const item = await createChecklistItem(template.id)

    const res = await api()
      .put(`/api/checklist/items/${item.id}`)
      .set('Cookie', cookie)
      .send({ description: 'Updated description' })

    expect(res.status).toBe(200)
    expect(res.body.data.description).toBe('Updated description')
  })

  it('soft-deletes an item', async () => {
    const { user, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(user.email, rawPassword)
    const company = await createCompany()
    const division = await createDivision(company.id)
    const template = await createChecklistTemplate(company.id, division.id)
    const item = await createChecklistItem(template.id)

    const res = await api().delete(`/api/checklist/items/${item.id}`).set('Cookie', cookie)
    expect(res.status).toBe(200)

    const inDb = await prisma.checklistItem.findUnique({ where: { id: item.id } })
    expect(inDb?.is_deleted).toBe(true)
  })
})

// ─── Staff: my checklist ─────────────────────────────────────────────────────

describe('GET /api/checklist/my-checklist', () => {
  it('rejects an unauthenticated request', async () => {
    const res = await api().get('/api/checklist/my-checklist')
    expect(res.status).toBe(401)
  })

  it('rejects a non-STAFF user', async () => {
    const { user, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(user.email, rawPassword)
    const res = await api().get('/api/checklist/my-checklist').set('Cookie', cookie)
    expect(res.status).toBe(403)
  })

  it('rejects when staff has not checked in today', async () => {
    const company = await createCompany()
    const division = await createDivision(company.id)
    const { user, rawPassword } = await createStaff(company.id, division.id)
    const { cookie } = await loginAs(user.email, rawPassword)

    const res = await api().get('/api/checklist/my-checklist').set('Cookie', cookie)

    expect(res.status).toBe(404)
    expect(res.body.message).toMatch(/please check in first/i)
  })

  it("returns today's checklist submissions after checking in", async () => {
    const company = await createCompany()
    const division = await createDivision(company.id)
    const shift = await createShift(company.id, division.id)
    const { user, rawPassword } = await createStaff(company.id, division.id)
    const { cookie } = await loginAs(user.email, rawPassword)

    const template = await createChecklistTemplate(company.id, division.id)
    const item = await createChecklistItem(template.id)
    const attendance = await createAttendance(user.id, company.id, division.id, shift.id)
    await createChecklistSubmission(attendance.id, item.id)

    const res = await api().get('/api/checklist/my-checklist').set('Cookie', cookie)

    expect(res.status).toBe(200)
    expect(res.body.data.length).toBe(1)
  })
})

// ─── Staff: upload photo ─────────────────────────────────────────────────────

describe('POST /api/checklist/:attendanceId/items/:itemId/photo', () => {
  async function setupStaffWithSubmission(overrides: { attendanceDate?: Date } = {}) {
    const company = await createCompany()
    const division = await createDivision(company.id)
    const shift = await createShift(company.id, division.id)
    const { user, rawPassword } = await createStaff(company.id, division.id)
    const template = await createChecklistTemplate(company.id, division.id)
    const item = await createChecklistItem(template.id)
    const attendance = await createAttendance(user.id, company.id, division.id, shift.id, {
      date: overrides.attendanceDate,
    })
    const submission = await createChecklistSubmission(attendance.id, item.id)
    return { user, rawPassword, attendance, item, submission }
  }

  it('rejects an unauthenticated request', async () => {
    const res = await api()
      .post('/api/checklist/some-id/items/1/photo')
      .attach('photo', fakePhoto(), 'photo.jpg')
    expect(res.status).toBe(401)
  })

  it('rejects a non-STAFF user', async () => {
    const { user, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(user.email, rawPassword)
    const res = await api()
      .post('/api/checklist/some-id/items/1/photo')
      .set('Cookie', cookie)
      .attach('photo', fakePhoto(), 'photo.jpg')
    expect(res.status).toBe(403)
  })

  it('rejects an upload with no photo attached', async () => {
    const { user, rawPassword, attendance, item } = await setupStaffWithSubmission()
    const { cookie } = await loginAs(user.email, rawPassword)

    const res = await api()
      .post(`/api/checklist/${attendance.id}/items/${item.id}/photo`)
      .set('Cookie', cookie)

    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/photo is required/i)
  })

  it('returns 404 for a nonexistent attendance id', async () => {
    const company = await createCompany()
    const division = await createDivision(company.id)
    const { user, rawPassword } = await createStaff(company.id, division.id)
    const { cookie } = await loginAs(user.email, rawPassword)

    const res = await api()
      .post('/api/checklist/00000000-0000-0000-0000-000000000000/items/1/photo')
      .set('Cookie', cookie)
      .attach('photo', fakePhoto(), 'photo.jpg')

    expect(res.status).toBe(404)
    expect(res.body.message).toMatch(/attendance not found/i)
  })

  it("rejects uploading a photo to another staff member's attendance (ownership)", async () => {
    const { attendance, item } = await setupStaffWithSubmission()
    const intruderCompany = await createCompany()
    const intruderDivision = await createDivision(intruderCompany.id)
    const { user: intruder, rawPassword: intruderPw } = await createStaff(
      intruderCompany.id,
      intruderDivision.id
    )
    const { cookie } = await loginAs(intruder.email, intruderPw)

    const res = await api()
      .post(`/api/checklist/${attendance.id}/items/${item.id}/photo`)
      .set('Cookie', cookie)
      .attach('photo', fakePhoto(), 'photo.jpg')

    expect(res.status).toBe(403)
    expect(res.body.message).toMatch(/access denied/i)
  })

  it('rejects when the attendance is not from today', async () => {
    const yesterday = new Date(Date.now() - 1000 * 60 * 60 * 24)
    const yesterdayDateOnly = new Date(yesterday.toISOString().split('T')[0] + 'T00:00:00.000Z')
    const { user, rawPassword, attendance, item } = await setupStaffWithSubmission({
      attendanceDate: yesterdayDateOnly,
    })
    const { cookie } = await loginAs(user.email, rawPassword)

    const res = await api()
      .post(`/api/checklist/${attendance.id}/items/${item.id}/photo`)
      .set('Cookie', cookie)
      .attach('photo', fakePhoto(), 'photo.jpg')

    expect(res.status).toBe(403)
  })

  it('returns 404 when the item does not belong to a submission on this attendance', async () => {
    const { user, rawPassword, attendance } = await setupStaffWithSubmission()
    const { cookie } = await loginAs(user.email, rawPassword)

    const res = await api()
      .post(`/api/checklist/${attendance.id}/items/999999/photo`)
      .set('Cookie', cookie)
      .attach('photo', fakePhoto(), 'photo.jpg')

    expect(res.status).toBe(404)
    expect(res.body.message).toMatch(/checklist submission not found/i)
  })

  it('rejects uploading once the submission is already marked submitted', async () => {
    const { user, rawPassword, attendance, item, submission } = await setupStaffWithSubmission()
    await prisma.checklistSubmission.update({
      where: { id: submission.id },
      data: { is_submitted: true },
    })
    const { cookie } = await loginAs(user.email, rawPassword)

    const res = await api()
      .post(`/api/checklist/${attendance.id}/items/${item.id}/photo`)
      .set('Cookie', cookie)
      .attach('photo', fakePhoto(), 'photo.jpg')

    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/already submitted/i)
  })

  it('rejects a 4th photo once the max of 3 is reached', async () => {
    const { user, rawPassword, attendance, item, submission } = await setupStaffWithSubmission()
    await createChecklistPhoto(submission.id, { order: 1 })
    await createChecklistPhoto(submission.id, { order: 2 })
    await createChecklistPhoto(submission.id, { order: 3 })
    const { cookie } = await loginAs(user.email, rawPassword)

    const res = await api()
      .post(`/api/checklist/${attendance.id}/items/${item.id}/photo`)
      .set('Cookie', cookie)
      .attach('photo', fakePhoto(), 'photo.jpg')

    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/maximum 3 photos/i)
  })

  it('uploads a photo successfully with the correct order number', async () => {
    const { user, rawPassword, attendance, item, submission } = await setupStaffWithSubmission()
    await createChecklistPhoto(submission.id, { order: 1 })
    const { cookie } = await loginAs(user.email, rawPassword)

    const res = await api()
      .post(`/api/checklist/${attendance.id}/items/${item.id}/photo`)
      .set('Cookie', cookie)
      .attach('photo', fakePhoto(), 'photo.jpg')

    expect(res.status).toBe(201)
    expect(res.body.data.order).toBe(2)
    expect(res.body.data.photo_url).toBe('https://fake-cdn.test/mock-photo.jpg')
  })
})

// ─── Staff: submit all ───────────────────────────────────────────────────────

describe('POST /api/checklist/:attendanceId/submit', () => {
  it('rejects an unauthenticated request', async () => {
    const res = await api().post('/api/checklist/some-id/submit')
    expect(res.status).toBe(401)
  })

  it('rejects a non-STAFF user', async () => {
    const { user, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(user.email, rawPassword)
    const res = await api().post('/api/checklist/some-id/submit').set('Cookie', cookie)
    expect(res.status).toBe(403)
  })

  it('returns 404 when there are no checklist items for this attendance', async () => {
    const company = await createCompany()
    const division = await createDivision(company.id)
    const shift = await createShift(company.id, division.id)
    const { user, rawPassword } = await createStaff(company.id, division.id)
    const attendance = await createAttendance(user.id, company.id, division.id, shift.id)
    const { cookie } = await loginAs(user.email, rawPassword)

    const res = await api().post(`/api/checklist/${attendance.id}/submit`).set('Cookie', cookie)

    expect(res.status).toBe(404)
    expect(res.body.message).toMatch(/no checklist items found/i)
  })

  it('rejects submitting when any item is missing a photo', async () => {
    const company = await createCompany()
    const division = await createDivision(company.id)
    const shift = await createShift(company.id, division.id)
    const { user, rawPassword } = await createStaff(company.id, division.id)
    const template = await createChecklistTemplate(company.id, division.id)
    const itemWithPhoto = await createChecklistItem(template.id, { order_no: 1 })
    const itemWithoutPhoto = await createChecklistItem(template.id, { order_no: 2 })
    const attendance = await createAttendance(user.id, company.id, division.id, shift.id)
    const submissionA = await createChecklistSubmission(attendance.id, itemWithPhoto.id)
    await createChecklistSubmission(attendance.id, itemWithoutPhoto.id) // no photo
    await createChecklistPhoto(submissionA.id)

    const { cookie } = await loginAs(user.email, rawPassword)
    const res = await api().post(`/api/checklist/${attendance.id}/submit`).set('Cookie', cookie)

    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/at least one photo/i)
  })

  it('rejects submitting twice', async () => {
    const company = await createCompany()
    const division = await createDivision(company.id)
    const shift = await createShift(company.id, division.id)
    const { user, rawPassword } = await createStaff(company.id, division.id)
    const template = await createChecklistTemplate(company.id, division.id)
    const item = await createChecklistItem(template.id)
    const attendance = await createAttendance(user.id, company.id, division.id, shift.id)
    const submission = await createChecklistSubmission(attendance.id, item.id)
    await createChecklistPhoto(submission.id)
    const { cookie } = await loginAs(user.email, rawPassword)

    const first = await api().post(`/api/checklist/${attendance.id}/submit`).set('Cookie', cookie)
    expect(first.status).toBe(200)

    const second = await api().post(`/api/checklist/${attendance.id}/submit`).set('Cookie', cookie)
    expect(second.status).toBe(409)
    expect(second.body.message).toMatch(/already submitted/i)
  })

  it('submits successfully when every item has at least one photo', async () => {
    const company = await createCompany()
    const division = await createDivision(company.id)
    const shift = await createShift(company.id, division.id)
    const { user, rawPassword } = await createStaff(company.id, division.id)
    const template = await createChecklistTemplate(company.id, division.id)
    const itemA = await createChecklistItem(template.id, { order_no: 1 })
    const itemB = await createChecklistItem(template.id, { order_no: 2 })
    const attendance = await createAttendance(user.id, company.id, division.id, shift.id)
    const submissionA = await createChecklistSubmission(attendance.id, itemA.id)
    const submissionB = await createChecklistSubmission(attendance.id, itemB.id)
    await createChecklistPhoto(submissionA.id)
    await createChecklistPhoto(submissionB.id)

    const { cookie } = await loginAs(user.email, rawPassword)
    const res = await api().post(`/api/checklist/${attendance.id}/submit`).set('Cookie', cookie)

    expect(res.status).toBe(200)

    const submissions = await prisma.checklistSubmission.findMany({
      where: { attendance_id: attendance.id },
    })
    expect(submissions.every((s) => s.is_submitted === true)).toBe(true)
  })
})

// ─── Admin: photo evidence, browsed by division ────────────────────────────

describe('GET /api/checklist/photos/by-division', () => {
  it('rejects an unauthenticated request', async () => {
    const res = await api().get('/api/checklist/photos/by-division?companyId=1&divisionId=1')
    expect(res.status).toBe(401)
  })

  it('rejects a non-ADMIN user', async () => {
    const { user: supervisor, rawPassword } = await createSupervisor()
    const { cookie } = await loginAs(supervisor.email, rawPassword)

    const res = await api()
      .get('/api/checklist/photos/by-division?companyId=1&divisionId=1')
      .set('Cookie', cookie)

    expect(res.status).toBe(403)
  })

  it('returns 404 for a company that does not exist', async () => {
    const { user, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(user.email, rawPassword)

    const res = await api()
      .get('/api/checklist/photos/by-division?companyId=999999&divisionId=1')
      .set('Cookie', cookie)

    expect(res.status).toBe(404)
    expect(res.body.message).toMatch(/company not found/i)
  })

  it('returns an empty list for a division with no submissions', async () => {
    const company = await createCompany()
    const division = await createDivision(company.id)
    const { user, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(user.email, rawPassword)

    const res = await api()
      .get(`/api/checklist/photos/by-division?companyId=${company.id}&divisionId=${division.id}`)
      .set('Cookie', cookie)

    expect(res.status).toBe(200)
    expect(res.body.data.data).toEqual([])
  })

  it('returns submitted photos with item, company, division and submitter context', async () => {
    const company = await createCompany({ name: 'Gamma Facilities' })
    const division = await createDivision(company.id, { name: 'Cleaning' })
    const shift = await createShift(company.id, division.id)
    const { user } = await createStaff(company.id, division.id, { name: 'Photo Staffer' })
    const template = await createChecklistTemplate(company.id, division.id)
    const item = await createChecklistItem(template.id, { description: 'Mop the lobby' })
    const attendance = await createAttendance(user.id, company.id, division.id, shift.id)
    const submission = await createChecklistSubmission(attendance.id, item.id, {
      isSubmitted: true,
      submittedAt: new Date(),
    })
    await createChecklistPhoto(submission.id, { order: 1 })
    await createChecklistPhoto(submission.id, { order: 2 })

    const { user: admin, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(admin.email, rawPassword)

    const res = await api()
      .get(`/api/checklist/photos/by-division?companyId=${company.id}&divisionId=${division.id}`)
      .set('Cookie', cookie)

    expect(res.status).toBe(200)
    expect(res.body.data.data).toHaveLength(1)
    const row = res.body.data.data[0]
    expect(row.item).toEqual({ id: item.id, description: 'Mop the lobby' })
    expect(row.company).toEqual({ id: company.id, name: 'Gamma Facilities' })
    expect(row.division).toEqual({ id: division.id, name: 'Cleaning' })
    expect(row.user).toEqual({ id: user.id, name: 'Photo Staffer' })
    expect(row.photos).toHaveLength(2)
  })

  it('does not return submissions from a different division', async () => {
    const company = await createCompany()
    const divisionA = await createDivision(company.id)
    const divisionB = await createDivision(company.id)
    const shiftA = await createShift(company.id, divisionA.id)
    const { user } = await createStaff(company.id, divisionA.id)
    const templateA = await createChecklistTemplate(company.id, divisionA.id)
    const itemA = await createChecklistItem(templateA.id)
    const attendance = await createAttendance(user.id, company.id, divisionA.id, shiftA.id)
    const submission = await createChecklistSubmission(attendance.id, itemA.id)
    await createChecklistPhoto(submission.id)

    const { user: admin, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(admin.email, rawPassword)

    const res = await api()
      .get(`/api/checklist/photos/by-division?companyId=${company.id}&divisionId=${divisionB.id}`)
      .set('Cookie', cookie)

    expect(res.status).toBe(200)
    expect(res.body.data.data).toEqual([])
  })
})

// ─── Admin: photo evidence, browsed by staff member ────────────────────────

describe('GET /api/checklist/photos/by-user/:userId', () => {
  it('rejects an unauthenticated request', async () => {
    const res = await api().get('/api/checklist/photos/by-user/some-id')
    expect(res.status).toBe(401)
  })

  it('rejects a non-ADMIN user', async () => {
    const { user, rawPassword } = await createSupervisor()
    const { cookie } = await loginAs(user.email, rawPassword)

    const res = await api().get(`/api/checklist/photos/by-user/${user.id}`).set('Cookie', cookie)

    expect(res.status).toBe(403)
  })

  it('returns 404 for a user that does not exist', async () => {
    const { user: admin, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(admin.email, rawPassword)

    const res = await api()
      .get('/api/checklist/photos/by-user/00000000-0000-0000-0000-000000000000')
      .set('Cookie', cookie)

    expect(res.status).toBe(404)
    expect(res.body.message).toMatch(/user not found/i)
  })

  it("returns the target staff member's checklist photos with item context", async () => {
    const company = await createCompany()
    const division = await createDivision(company.id)
    const shift = await createShift(company.id, division.id)
    const { user } = await createStaff(company.id, division.id)
    const template = await createChecklistTemplate(company.id, division.id)
    const item = await createChecklistItem(template.id, { description: 'Check fire extinguisher' })
    const attendance = await createAttendance(user.id, company.id, division.id, shift.id)
    const submission = await createChecklistSubmission(attendance.id, item.id)
    await createChecklistPhoto(submission.id)

    const { user: admin, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(admin.email, rawPassword)

    const res = await api().get(`/api/checklist/photos/by-user/${user.id}`).set('Cookie', cookie)

    expect(res.status).toBe(200)
    expect(res.body.data.data).toHaveLength(1)
    expect(res.body.data.data[0].item.description).toBe('Check fire extinguisher')
    expect(res.body.data.data[0].photos).toHaveLength(1)
  })

  it('does not return another staff member\'s checklist photos', async () => {
    const company = await createCompany()
    const division = await createDivision(company.id)
    const shift = await createShift(company.id, division.id)
    const { user: userA } = await createStaff(company.id, division.id)
    const { user: userB } = await createStaff(company.id, division.id)
    const template = await createChecklistTemplate(company.id, division.id)
    const item = await createChecklistItem(template.id)
    const attendance = await createAttendance(userA.id, company.id, division.id, shift.id)
    const submission = await createChecklistSubmission(attendance.id, item.id)
    await createChecklistPhoto(submission.id)

    const { user: admin, rawPassword } = await createAdmin()
    const { cookie } = await loginAs(admin.email, rawPassword)

    const res = await api().get(`/api/checklist/photos/by-user/${userB.id}`).set('Cookie', cookie)

    expect(res.status).toBe(200)
    expect(res.body.data.data).toEqual([])
  })
})