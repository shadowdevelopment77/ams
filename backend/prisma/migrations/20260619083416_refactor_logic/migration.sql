/*
  Warnings:

  - You are about to drop the column `highlighted_at` on the `EvidencePhoto` table. All the data in the column will be lost.
  - You are about to drop the column `is_highlighted` on the `EvidencePhoto` table. All the data in the column will be lost.
  - You are about to drop the `AbsentRequest` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AbsentRequestStatus` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `FileType` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Report` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ReportMode` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ReportTemplate` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TemplateStyle` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `WorkLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `WorkLogPhoto` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[user_id,date]` on the table `Attendance` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name]` on the table `Company` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `date` to the `Attendance` table without a default value. This is not possible if the table is not empty.
  - Made the column `company_id` on table `Attendance` required. This step will fail if there are existing NULL values in that column.
  - Made the column `shift_id` on table `Attendance` required. This step will fail if there are existing NULL values in that column.
  - Made the column `division_id` on table `Attendance` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `date` to the `VisitLog` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "AbsentRequest" DROP CONSTRAINT "AbsentRequest_company_id_fkey";

-- DropForeignKey
ALTER TABLE "AbsentRequest" DROP CONSTRAINT "AbsentRequest_division_id_fkey";

-- DropForeignKey
ALTER TABLE "AbsentRequest" DROP CONSTRAINT "AbsentRequest_shift_id_fkey";

-- DropForeignKey
ALTER TABLE "AbsentRequest" DROP CONSTRAINT "AbsentRequest_status_id_fkey";

-- DropForeignKey
ALTER TABLE "AbsentRequest" DROP CONSTRAINT "AbsentRequest_user_id_fkey";

-- DropForeignKey
ALTER TABLE "Attendance" DROP CONSTRAINT "Attendance_company_id_fkey";

-- DropForeignKey
ALTER TABLE "Attendance" DROP CONSTRAINT "Attendance_division_id_fkey";

-- DropForeignKey
ALTER TABLE "Attendance" DROP CONSTRAINT "Attendance_shift_id_fkey";

-- DropForeignKey
ALTER TABLE "Report" DROP CONSTRAINT "Report_company_id_fkey";

-- DropForeignKey
ALTER TABLE "Report" DROP CONSTRAINT "Report_division_id_fkey";

-- DropForeignKey
ALTER TABLE "Report" DROP CONSTRAINT "Report_file_type_id_fkey";

-- DropForeignKey
ALTER TABLE "Report" DROP CONSTRAINT "Report_generated_by_fkey";

-- DropForeignKey
ALTER TABLE "Report" DROP CONSTRAINT "Report_report_mode_id_fkey";

-- DropForeignKey
ALTER TABLE "ReportTemplate" DROP CONSTRAINT "ReportTemplate_division_id_fkey";

-- DropForeignKey
ALTER TABLE "ReportTemplate" DROP CONSTRAINT "ReportTemplate_report_mode_id_fkey";

-- DropForeignKey
ALTER TABLE "ReportTemplate" DROP CONSTRAINT "ReportTemplate_template_style_id_fkey";

-- DropForeignKey
ALTER TABLE "WorkLog" DROP CONSTRAINT "WorkLog_attendance_id_fkey";

-- DropForeignKey
ALTER TABLE "WorkLog" DROP CONSTRAINT "WorkLog_user_id_fkey";

-- DropForeignKey
ALTER TABLE "WorkLogPhoto" DROP CONSTRAINT "WorkLogPhoto_work_log_id_fkey";

-- DropIndex
DROP INDEX "Attendance_company_id_check_in_at_idx";

-- DropIndex
DROP INDEX "Attendance_division_id_check_in_at_idx";

-- DropIndex
DROP INDEX "Attendance_user_id_check_in_at_idx";

-- DropIndex
DROP INDEX "ChecklistTemplate_company_id_idx";

-- DropIndex
DROP INDEX "ChecklistTemplate_division_id_idx";

-- DropIndex
DROP INDEX "Company_name_code_key";

-- DropIndex
DROP INDEX "Division_company_id_name_key";

-- DropIndex
DROP INDEX "EvidencePhoto_is_highlighted_idx";

-- DropIndex
DROP INDEX "Shift_company_id_idx";

-- DropIndex
DROP INDEX "Shift_division_id_idx";

-- DropIndex
DROP INDEX "UserCompanyRole_company_id_role_id_idx";

-- DropIndex
DROP INDEX "UserCompanyRole_division_id_idx";

-- DropIndex
DROP INDEX "VisitLog_company_id_visited_at_idx";

-- DropIndex
DROP INDEX "VisitLog_user_id_visited_at_idx";

-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN     "checkout_address" TEXT,
ADD COLUMN     "date" DATE NOT NULL,
ADD COLUMN     "location_address" TEXT,
ALTER COLUMN "company_id" SET NOT NULL,
ALTER COLUMN "shift_id" SET NOT NULL,
ALTER COLUMN "division_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "EvidencePhoto" DROP COLUMN "highlighted_at",
DROP COLUMN "is_highlighted";

-- AlterTable
ALTER TABLE "VisitLog" ADD COLUMN     "date" DATE NOT NULL,
ADD COLUMN     "location_address" TEXT;

-- DropTable
DROP TABLE "AbsentRequest";

-- DropTable
DROP TABLE "AbsentRequestStatus";

-- DropTable
DROP TABLE "FileType";

-- DropTable
DROP TABLE "Report";

-- DropTable
DROP TABLE "ReportMode";

-- DropTable
DROP TABLE "ReportTemplate";

-- DropTable
DROP TABLE "TemplateStyle";

-- DropTable
DROP TABLE "WorkLog";

-- DropTable
DROP TABLE "WorkLogPhoto";

-- CreateIndex
CREATE INDEX "Attendance_company_id_division_id_date_is_late_idx" ON "Attendance"("company_id", "division_id", "date", "is_late");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_user_id_date_key" ON "Attendance"("user_id", "date");

-- CreateIndex
CREATE INDEX "ChecklistTemplate_company_id_division_id_idx" ON "ChecklistTemplate"("company_id", "division_id");

-- CreateIndex
CREATE UNIQUE INDEX "Company_name_key" ON "Company"("name");

-- CreateIndex
CREATE INDEX "Shift_company_id_division_id_idx" ON "Shift"("company_id", "division_id");

-- CreateIndex
CREATE INDEX "UserCompanyRole_company_id_division_id_idx" ON "UserCompanyRole"("company_id", "division_id");

-- CreateIndex
CREATE INDEX "VisitLog_user_id_company_id_date_idx" ON "VisitLog"("user_id", "company_id", "date");

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_division_id_fkey" FOREIGN KEY ("division_id") REFERENCES "Division"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "Shift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
