// Jest `setupFilesAfterEnv` — runs before EACH test file, after the Jest
// framework (describe/it/beforeEach/etc.) is available.

import prisma from '../lib/prisma'

// ─── Mock all outbound network calls ───────────────────────────────────────
// uploadImage() hits real Cloudinary + runs sharp compression. reverseGeocode()
// hits the real Nominatim API. Neither should run in tests — we care about
// business logic, not third-party services being up. Every test file that
// imports a controller which imports these gets the mocked version
// automatically, since these mocks are registered before any test file body
// runs.
jest.mock('../utils/uploadImage', () => ({
  uploadImage: jest.fn().mockResolvedValue('https://fake-cdn.test/mock-photo.jpg'),
}))

jest.mock('../utils/geocode', () => ({
  reverseGeocode: jest.fn().mockResolvedValue('Mock Address, Test City'),
}))

// ─── DB cleanup between tests ──────────────────────────────────────────────
// Deletes rows (not schema) in FK-safe order: children before parents.
// UserRole and AttendanceStatus are lookup tables seeded once in
// globalSetup — intentionally NOT wiped here, every test needs them intact.
async function cleanDatabase() {
  await prisma.checklistPhoto.deleteMany()
  await prisma.checklistSubmission.deleteMany()
  await prisma.checklistItem.deleteMany()
  await prisma.checklistTemplate.deleteMany()
  await prisma.visitLog.deleteMany()
  await prisma.attendance.deleteMany()
  await prisma.shift.deleteMany()
  await prisma.session.deleteMany()
  await prisma.userCompanyRole.deleteMany()
  await prisma.division.deleteMany()
  await prisma.company.deleteMany()
  await prisma.user.deleteMany()
}

beforeEach(async () => {
  await cleanDatabase()
})

afterAll(async () => {
  await prisma.$disconnect()
})