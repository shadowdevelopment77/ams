/*
  Warnings:

  - The values [OFF] on the enum `AttendanceStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `reason` on the `Attendance` table. All the data in the column will be lost.
  - You are about to drop the column `shift_id` on the `UserCompanyRole` table. All the data in the column will be lost.
  - Added the required column `division_id` to the `AbsentRequest` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "AttendanceStatus_new" AS ENUM ('PRESENT', 'LATE');
ALTER TABLE "public"."Attendance" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Attendance" ALTER COLUMN "status" TYPE "AttendanceStatus_new" USING ("status"::text::"AttendanceStatus_new");
ALTER TYPE "AttendanceStatus" RENAME TO "AttendanceStatus_old";
ALTER TYPE "AttendanceStatus_new" RENAME TO "AttendanceStatus";
DROP TYPE "public"."AttendanceStatus_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "Attendance" DROP CONSTRAINT "Attendance_company_id_fkey";

-- DropForeignKey
ALTER TABLE "UserCompanyRole" DROP CONSTRAINT "UserCompanyRole_company_id_fkey";

-- DropForeignKey
ALTER TABLE "UserCompanyRole" DROP CONSTRAINT "UserCompanyRole_shift_id_fkey";

-- DropIndex
DROP INDEX "UserCompanyRole_user_id_company_id_key";

-- AlterTable
ALTER TABLE "AbsentRequest" ADD COLUMN     "division_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Attendance" DROP COLUMN "reason",
ADD COLUMN     "division_id" INTEGER,
ALTER COLUMN "company_id" DROP NOT NULL,
ALTER COLUMN "status" DROP DEFAULT;

-- AlterTable
ALTER TABLE "UserCompanyRole" DROP COLUMN "shift_id",
ALTER COLUMN "company_id" DROP NOT NULL;

-- CreateTable
CREATE TABLE "VisitLog" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "company_id" INTEGER NOT NULL,
    "photo_url" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "notes" TEXT,
    "visited_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisitLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VisitLog_user_id_visited_at_idx" ON "VisitLog"("user_id", "visited_at");

-- CreateIndex
CREATE INDEX "VisitLog_company_id_visited_at_idx" ON "VisitLog"("company_id", "visited_at");

-- CreateIndex
CREATE INDEX "Attendance_division_id_check_in_at_idx" ON "Attendance"("division_id", "check_in_at");

-- CreateIndex
CREATE INDEX "UserCompanyRole_user_id_idx" ON "UserCompanyRole"("user_id");

-- AddForeignKey
ALTER TABLE "UserCompanyRole" ADD CONSTRAINT "UserCompanyRole_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_division_id_fkey" FOREIGN KEY ("division_id") REFERENCES "Division"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitLog" ADD CONSTRAINT "VisitLog_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitLog" ADD CONSTRAINT "VisitLog_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbsentRequest" ADD CONSTRAINT "AbsentRequest_division_id_fkey" FOREIGN KEY ("division_id") REFERENCES "Division"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
