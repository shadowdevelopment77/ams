/*
  Warnings:

  - You are about to drop the column `status` on the `AbsentRequest` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Attendance` table. All the data in the column will be lost.
  - You are about to drop the column `working_days` on the `Division` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `EvidencePhoto` table. All the data in the column will be lost.
  - You are about to drop the column `file_type` on the `Report` table. All the data in the column will be lost.
  - You are about to drop the column `report_mode` on the `Report` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Report` table. All the data in the column will be lost.
  - You are about to drop the column `made_by` on the `ReportTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `report_mode` on the `ReportTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `template_style` on the `ReportTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `notify_before_minutes` on the `Shift` table. All the data in the column will be lost.
  - You are about to drop the column `update_at` on the `Shift` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `UserCompanyRole` table. All the data in the column will be lost.
  - You are about to drop the `Notification` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `status_id` to the `AbsentRequest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `AbsentRequest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `status_id` to the `Attendance` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `Attendance` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `ChecklistItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `ChecklistSubmission` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `Company` table without a default value. This is not possible if the table is not empty.
  - Added the required column `status_id` to the `EvidencePhoto` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `EvidencePhoto` table without a default value. This is not possible if the table is not empty.
  - Added the required column `file_type_id` to the `Report` table without a default value. This is not possible if the table is not empty.
  - Added the required column `report_mode_id` to the `Report` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `Report` table without a default value. This is not possible if the table is not empty.
  - Added the required column `report_mode_id` to the `ReportTemplate` table without a default value. This is not possible if the table is not empty.
  - Added the required column `template_style_id` to the `ReportTemplate` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `Shift` table without a default value. This is not possible if the table is not empty.
  - Added the required column `role_id` to the `UserCompanyRole` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `UserCompanyRole` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `VisitLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `WorkLogPhoto` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_user_id_fkey";

-- DropIndex
DROP INDEX "AbsentRequest_company_id_status_idx";

-- DropIndex
DROP INDEX "Company_code_key";

-- DropIndex
DROP INDEX "EvidencePhoto_submission_id_status_idx";

-- DropIndex
DROP INDEX "UserCompanyRole_company_id_role_idx";

-- AlterTable
ALTER TABLE "AbsentRequest" DROP COLUMN "status",
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "is_deleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "status_id" INTEGER NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Attendance" DROP COLUMN "status",
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "is_deleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "status_id" INTEGER NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "ChecklistItem" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "is_deleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "ChecklistSubmission" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "is_deleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "ChecklistTemplate" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "is_deleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "is_deleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Division" DROP COLUMN "working_days",
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "is_deleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "EvidencePhoto" DROP COLUMN "status",
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "is_deleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "status_id" INTEGER NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Report" DROP COLUMN "file_type",
DROP COLUMN "report_mode",
DROP COLUMN "status",
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "file_type_id" INTEGER NOT NULL,
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "is_deleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "report_mode_id" INTEGER NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "ReportTemplate" DROP COLUMN "made_by",
DROP COLUMN "report_mode",
DROP COLUMN "template_style",
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "is_deleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "report_mode_id" INTEGER NOT NULL,
ADD COLUMN     "template_style_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Shift" DROP COLUMN "notify_before_minutes",
DROP COLUMN "update_at",
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "is_deleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "UserCompanyRole" DROP COLUMN "role",
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "is_deleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "role_id" INTEGER NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "VisitLog" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "is_deleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "WorkLog" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "is_deleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "WorkLogPhoto" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "is_deleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- DropTable
DROP TABLE "Notification";

-- DropEnum
DROP TYPE "AbsentRequestStatus";

-- DropEnum
DROP TYPE "AttendanceStatus";

-- DropEnum
DROP TYPE "FileType";

-- DropEnum
DROP TYPE "NotificationType";

-- DropEnum
DROP TYPE "PhotoStatus";

-- DropEnum
DROP TYPE "ReportMode";

-- DropEnum
DROP TYPE "ReportStatus";

-- DropEnum
DROP TYPE "Role";

-- DropEnum
DROP TYPE "TemplateStyle";

-- CreateTable
CREATE TABLE "UserRole" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceStatus" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AbsentRequestStatus" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AbsentRequestStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhotoStatus" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhotoStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemplateStyle" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TemplateStyle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportMode" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportMode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FileType" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FileType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AbsentRequest_company_id_status_id_idx" ON "AbsentRequest"("company_id", "status_id");

-- CreateIndex
CREATE INDEX "EvidencePhoto_submission_id_status_id_idx" ON "EvidencePhoto"("submission_id", "status_id");

-- CreateIndex
CREATE INDEX "UserCompanyRole_company_id_role_id_idx" ON "UserCompanyRole"("company_id", "role_id");

-- AddForeignKey
ALTER TABLE "UserCompanyRole" ADD CONSTRAINT "UserCompanyRole_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "UserRole"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "AttendanceStatus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbsentRequest" ADD CONSTRAINT "AbsentRequest_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "AbsentRequestStatus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidencePhoto" ADD CONSTRAINT "EvidencePhoto_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "PhotoStatus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportTemplate" ADD CONSTRAINT "ReportTemplate_template_style_id_fkey" FOREIGN KEY ("template_style_id") REFERENCES "TemplateStyle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportTemplate" ADD CONSTRAINT "ReportTemplate_report_mode_id_fkey" FOREIGN KEY ("report_mode_id") REFERENCES "ReportMode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_report_mode_id_fkey" FOREIGN KEY ("report_mode_id") REFERENCES "ReportMode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_file_type_id_fkey" FOREIGN KEY ("file_type_id") REFERENCES "FileType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
