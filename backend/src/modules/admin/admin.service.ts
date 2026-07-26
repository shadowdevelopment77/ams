import bcrypt from 'bcryptjs'
import prisma from '../../lib/prisma'
import cloudinary from '../../lib/cloudinary'
import { extractCloudinaryPublicId } from '../../utils/cloudinaryUrl'

// The only two admin accounts this job ever creates or touches. Any OTHER
// admin account (the dev-seed admin@ams.local, or one you register for
// yourself with a real email) is never deleted or modified by this job --
// the wipe below only ever targets STAFF/SUPERVISOR users, never ADMIN.
const DEMO_ADMINS = [
  { name: 'Demo Admin One', email: 'admin.demo1@ams.local' },
  { name: 'Demo Admin Two', email: 'admin.demo2@ams.local' },
]
const DEMO_ADMIN_PASSWORD = 'DemoAdmin123!'

// Cloudinary's delete_resources caps at 100 public_ids per call.
const CLOUDINARY_DELETE_CHUNK_SIZE = 100

async function deleteCloudinaryPhotos(urls: (string | null | undefined)[]) {
  const publicIds = urls.map(extractCloudinaryPublicId).filter((id): id is string => !!id)
  if (publicIds.length === 0) return { attempted: 0, deleted: 0 }

  let deleted = 0
  for (let i = 0; i < publicIds.length; i += CLOUDINARY_DELETE_CHUNK_SIZE) {
    const chunk = publicIds.slice(i, i + CLOUDINARY_DELETE_CHUNK_SIZE)
    const result = await cloudinary.api.delete_resources(chunk)
    deleted += Object.values(result.deleted ?? {}).filter((status) => status === 'deleted').length
  }
  return { attempted: publicIds.length, deleted }
}

async function wipeTransactionalAndDemoData() {
  // 1. Collect every photo URL about to be orphaned, before deleting rows.
  const [attendances, checklistPhotos, visits] = await Promise.all([
    prisma.attendance.findMany({ select: { photo_url: true, checkout_photo_url: true } }),
    prisma.checklistPhoto.findMany({ select: { photo_url: true } }),
    prisma.visitLog.findMany({ select: { photo_url: true } }),
  ])
  const photoUrls = [
    ...attendances.flatMap((a) => [a.photo_url, a.checkout_photo_url]),
    ...checklistPhotos.map((p) => p.photo_url),
    ...visits.map((v) => v.photo_url),
  ]
  const cloudinaryResult = await deleteCloudinaryPhotos(photoUrls)

  // 2. Delete DB rows child-first, respecting FK constraints (UserCompanyRole
  // has onDelete: Restrict on company/division, so those roles must go
  // before Division/Company can be deleted).
  await prisma.checklistPhoto.deleteMany({})
  await prisma.checklistSubmission.deleteMany({})
  await prisma.attendance.deleteMany({})
  await prisma.visitLog.deleteMany({})
  await prisma.checklistItem.deleteMany({})
  await prisma.checklistTemplate.deleteMany({})
  await prisma.shift.deleteMany({})

  const nonAdminRoles = await prisma.userCompanyRole.findMany({
    where: { userRole: { name: { in: ['STAFF', 'SUPERVISOR'] } } },
    select: { id: true, user_id: true },
  })
  const nonAdminUserIds = nonAdminRoles.map((r) => r.user_id)
  const nonAdminRoleIds = nonAdminRoles.map((r) => r.id)

  await prisma.session.deleteMany({ where: { user_id: { in: nonAdminUserIds } } })
  await prisma.userCompanyRole.deleteMany({ where: { id: { in: nonAdminRoleIds } } })
  await prisma.user.deleteMany({ where: { id: { in: nonAdminUserIds } } })

  await prisma.division.deleteMany({})
  await prisma.company.deleteMany({})

  return { cloudinaryResult, usersRemoved: nonAdminUserIds.length }
}

async function ensureDemoAdmins() {
  const adminRole = await prisma.userRole.findFirstOrThrow({ where: { name: 'ADMIN' } })
  const hashed = await bcrypt.hash(DEMO_ADMIN_PASSWORD, 10)

  for (const demo of DEMO_ADMINS) {
    const existing = await prisma.user.findUnique({ where: { email: demo.email } })
    if (existing) {
      await prisma.user.update({ where: { id: existing.id }, data: { password: hashed, is_active: true } })
    } else {
      const user = await prisma.user.create({
        data: { name: demo.name, email: demo.email, password: hashed, is_active: true },
      })
      await prisma.userCompanyRole.create({
        data: { user_id: user.id, role_id: adminRole.id, company_id: null, division_id: null },
      })
    }
  }
  return { emails: DEMO_ADMINS.map((d) => d.email), password: DEMO_ADMIN_PASSWORD }
}

export async function resetDemo() {
  const wipeResult = await wipeTransactionalAndDemoData()
  const adminsResult = await ensureDemoAdmins()

  return { wipeResult, adminsResult }
}
