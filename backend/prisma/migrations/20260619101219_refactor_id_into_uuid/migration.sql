/*
  Warnings:

  - The primary key for the `Attendance` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `User` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE "Attendance" DROP CONSTRAINT "Attendance_user_id_fkey";

-- DropForeignKey
ALTER TABLE "ChecklistSubmission" DROP CONSTRAINT "ChecklistSubmission_attendance_id_fkey";

-- DropForeignKey
ALTER TABLE "EvidencePhoto" DROP CONSTRAINT "EvidencePhoto_reviewed_by_fkey";

-- DropForeignKey
ALTER TABLE "UserCompanyRole" DROP CONSTRAINT "UserCompanyRole_user_id_fkey";

-- DropForeignKey
ALTER TABLE "VisitLog" DROP CONSTRAINT "VisitLog_user_id_fkey";

-- AlterTable
ALTER TABLE "Attendance" DROP CONSTRAINT "Attendance_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "user_id" SET DATA TYPE TEXT,
ADD CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Attendance_id_seq";

-- AlterTable
ALTER TABLE "ChecklistSubmission" ALTER COLUMN "attendance_id" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "EvidencePhoto" ALTER COLUMN "reviewed_by" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "User" DROP CONSTRAINT "User_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "User_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "User_id_seq";

-- AlterTable
ALTER TABLE "UserCompanyRole" ALTER COLUMN "user_id" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "VisitLog" ALTER COLUMN "user_id" SET DATA TYPE TEXT;

-- AddForeignKey
ALTER TABLE "UserCompanyRole" ADD CONSTRAINT "UserCompanyRole_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitLog" ADD CONSTRAINT "VisitLog_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistSubmission" ADD CONSTRAINT "ChecklistSubmission_attendance_id_fkey" FOREIGN KEY ("attendance_id") REFERENCES "Attendance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidencePhoto" ADD CONSTRAINT "EvidencePhoto_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
