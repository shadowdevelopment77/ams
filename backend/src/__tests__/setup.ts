// Jest `setupFilesAfterEnv` — runs before EACH test file, after the Jest
// framework (describe/it/beforeEach/etc.) is available.

import prisma, { disconnectPrisma } from '../lib/prisma'

// ─── Mock all outbound network calls ───────────────────────────────────────
// uploadImage() hits Cloudinary, reverseGeocode() hits Nominatim -- neither
// should run for real in tests. Registered before any test file body runs,
// so every controller that imports these gets the mock automatically.
jest.mock('../utils/uploadImage', () => ({
  uploadImage: jest.fn().mockResolvedValue('https://fake-cdn.test/mock-photo.jpg'),
}))

jest.mock('../utils/geocode', () => ({
  reverseGeocode: jest.fn().mockResolvedValue('Mock Address, Test City'),
}))

// The reset-demo job calls cloudinary.api.delete_resources() directly
// (not through uploadImage) -- mocked separately so it's never a real call.
jest.mock('../lib/cloudinary', () => ({
  __esModule: true,
  default: {
    api: {
      delete_resources: jest.fn().mockResolvedValue({ deleted: {} }),
    },
  },
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
  await disconnectPrisma()
})