/*
  Warnings:

  - The values [EXPECTED,ABSENT] on the enum `AttendanceStatus` will be removed. If these variants are still used in the database, this will fail.
  - Made the column `late_minutes` on table `Attendance` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `company_id` to the `Shift` table without a default value. This is not possible if the table is not empty.
  - Added the required column `update_at` to the `Shift` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "AbsentRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum
BEGIN;
CREATE TYPE "AttendanceStatus_new" AS ENUM ('PRESENT', 'LATE', 'OFF');
ALTER TABLE "public"."Attendance" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Attendance" ALTER COLUMN "status" TYPE "AttendanceStatus_new" USING ("status"::text::"AttendanceStatus_new");
ALTER TYPE "AttendanceStatus" RENAME TO "AttendanceStatus_old";
ALTER TYPE "AttendanceStatus_new" RENAME TO "AttendanceStatus";
DROP TYPE "public"."AttendanceStatus_old";
ALTER TABLE "Attendance" ALTER COLUMN "status" SET DEFAULT 'OFF';
COMMIT;

-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN     "early_leave" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "early_leave_reason" TEXT,
ALTER COLUMN "late_minutes" SET NOT NULL,
ALTER COLUMN "late_minutes" SET DEFAULT 0,
ALTER COLUMN "status" SET DEFAULT 'OFF';

-- AlterTable
ALTER TABLE "Division" ADD COLUMN     "working_days" TEXT[],
ALTER COLUMN "late_tolerance_minutes" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "Shift" ADD COLUMN     "company_id" INTEGER NOT NULL,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "update_at" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "notify_before_minutes" SET DEFAULT 30;

-- AlterTable
ALTER TABLE "UserCompanyRole" ADD COLUMN     "shift_id" INTEGER;

-- CreateTable
CREATE TABLE "AbsentRequest" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "company_id" INTEGER NOT NULL,
    "shift_id" INTEGER,
    "date" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "proof_url" TEXT,
    "status" "AbsentRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewed_by" INTEGER,
    "reviewed_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AbsentRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AbsentRequest_user_id_date_idx" ON "AbsentRequest"("user_id", "date");

-- CreateIndex
CREATE INDEX "AbsentRequest_company_id_status_idx" ON "AbsentRequest"("company_id", "status");

-- CreateIndex
CREATE INDEX "Shift_company_id_idx" ON "Shift"("company_id");

-- AddForeignKey
ALTER TABLE "UserCompanyRole" ADD CONSTRAINT "UserCompanyRole_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "Shift"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbsentRequest" ADD CONSTRAINT "AbsentRequest_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbsentRequest" ADD CONSTRAINT "AbsentRequest_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbsentRequest" ADD CONSTRAINT "AbsentRequest_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "Shift"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
