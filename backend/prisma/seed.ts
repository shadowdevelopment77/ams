import prisma from '../src/lib/prisma'

async function main() {
  await prisma.userRole.createMany({
    data: [
      { name: 'ADMIN' },
      { name: 'SUPERVISOR' },
      { name: 'STAFF' },
    ],
    skipDuplicates: true,
  })

  await prisma.attendanceStatus.createMany({
    data: [
      { name: 'PRESENT' },
      { name: 'LATE' },
    ],
    skipDuplicates: true,
  })

  console.log('Seed done')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
