-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STAFF', 'SUPERVISOR', 'ADMIN', 'CLIENT');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('EXPECTED', 'PRESENT', 'LATE', 'ABSENT');

-- CreateEnum
CREATE TYPE "PhotoStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('STAFF_NOT_CHECKIN', 'CHECKLIST_INCOMPLETE', 'PHOTO_PENDING_REVIEW', 'SHIFT_REMINDER', 'PHOTO_APPROVED', 'PHOTO_REJECTED');

-- CreateEnum
CREATE TYPE "TemplateStyle" AS ENUM ('FORMAL_STRUCTURED', 'PHOTO_GRID', 'DAILY_LOG', 'COMBINED_FULL', 'MINIMAL');

-- CreateEnum
CREATE TYPE "ReportMode" AS ENUM ('NARRATIVE_ONLY', 'PHOTO_ONLY', 'COMBINED');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('DRAFT', 'GENERATED', 'PRINTED');

-- CreateEnum
CREATE TYPE "FileType" AS ENUM ('PDF', 'DOCX');

-- CreateTable
CREATE TABLE "Company" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "logo_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Division" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "has_checklist" BOOLEAN NOT NULL DEFAULT true,
    "has_evidence_photo" BOOLEAN NOT NULL DEFAULT true,
    "has_work_log" BOOLEAN NOT NULL DEFAULT false,
    "min_photo_per_day" INTEGER NOT NULL DEFAULT 1,
    "photo_highlight_only" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Division_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "division_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "phone" TEXT,
    "photo_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserCompanyRole" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "company_id" INTEGER NOT NULL,
    "role" "Role" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserCompanyRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "company_id" INTEGER NOT NULL,
    "shift_id" INTEGER,
    "check_in_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "check_out_at" TIMESTAMP(3),
    "photo_url" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "is_late" BOOLEAN NOT NULL DEFAULT false,
    "late_minutes" INTEGER,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'EXPECTED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shift" (
    "id" SERIAL NOT NULL,
    "division_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "notify_before_minutes" INTEGER NOT NULL DEFAULT 60,

    CONSTRAINT "Shift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistTemplate" (
    "id" SERIAL NOT NULL,
    "division_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChecklistTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistItem" (
    "id" SERIAL NOT NULL,
    "template_id" INTEGER NOT NULL,
    "order_no" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "requires_photo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistSubmission" (
    "id" SERIAL NOT NULL,
    "attendance_id" INTEGER NOT NULL,
    "item_id" INTEGER NOT NULL,
    "is_done" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChecklistSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvidencePhoto" (
    "id" SERIAL NOT NULL,
    "submission_id" INTEGER NOT NULL,
    "photo_url" TEXT NOT NULL,
    "status" "PhotoStatus" NOT NULL DEFAULT 'PENDING',
    "reviewed_by" INTEGER,
    "reviewed_at" TIMESTAMP(3),
    "reject_reason" TEXT,
    "is_highlighted" BOOLEAN NOT NULL DEFAULT false,
    "highlighted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvidencePhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkLog" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "attendance_id" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkLogPhoto" (
    "id" SERIAL NOT NULL,
    "work_log_id" INTEGER NOT NULL,
    "photo_url" TEXT NOT NULL,
    "caption" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkLogPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "recipient_role" "Role" NOT NULL,
    "type" "NotificationType" NOT NULL,
    "message" TEXT NOT NULL,
    "meta" JSONB,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportTemplate" (
    "id" SERIAL NOT NULL,
    "division_id" INTEGER NOT NULL,
    "template_style" "TemplateStyle" NOT NULL DEFAULT 'FORMAL_STRUCTURED',
    "report_mode" "ReportMode" NOT NULL DEFAULT 'COMBINED',
    "report_title" TEXT,
    "client_name" TEXT,
    "show_logo" BOOLEAN NOT NULL DEFAULT true,
    "section_intro" TEXT,
    "section_background" TEXT,
    "section_purpose" TEXT,
    "section_duties" TEXT,
    "section_scope" TEXT,
    "section_schedule" TEXT,
    "section_evaluation" TEXT,
    "section_suggestion" TEXT,
    "section_closing" TEXT,
    "section_config" JSONB,
    "photos_per_row" INTEGER NOT NULL DEFAULT 2,
    "show_photo_caption" BOOLEAN NOT NULL DEFAULT true,
    "photo_caption_template" TEXT,
    "signers" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "division_id" INTEGER NOT NULL,
    "period_month" INTEGER NOT NULL,
    "period_year" INTEGER NOT NULL,
    "report_mode" "ReportMode" NOT NULL,
    "snapshot_narrative" JSONB,
    "file_url" TEXT,
    "file_type" "FileType" NOT NULL DEFAULT 'DOCX',
    "status" "ReportStatus" NOT NULL DEFAULT 'DRAFT',
    "generated_by" INTEGER NOT NULL,
    "generated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Company_code_key" ON "Company"("code");

-- CreateIndex
CREATE INDEX "Division_company_id_idx" ON "Division"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_division_id_idx" ON "User"("division_id");

-- CreateIndex
CREATE INDEX "UserCompanyRole_company_id_role_idx" ON "UserCompanyRole"("company_id", "role");

-- CreateIndex
CREATE UNIQUE INDEX "UserCompanyRole_user_id_company_id_key" ON "UserCompanyRole"("user_id", "company_id");

-- CreateIndex
CREATE INDEX "Session_user_id_idx" ON "Session"("user_id");

-- CreateIndex
CREATE INDEX "Attendance_user_id_check_in_at_idx" ON "Attendance"("user_id", "check_in_at");

-- CreateIndex
CREATE INDEX "Attendance_company_id_check_in_at_idx" ON "Attendance"("company_id", "check_in_at");

-- CreateIndex
CREATE INDEX "Shift_division_id_idx" ON "Shift"("division_id");

-- CreateIndex
CREATE INDEX "ChecklistTemplate_division_id_idx" ON "ChecklistTemplate"("division_id");

-- CreateIndex
CREATE INDEX "ChecklistItem_template_id_idx" ON "ChecklistItem"("template_id");

-- CreateIndex
CREATE INDEX "ChecklistSubmission_attendance_id_idx" ON "ChecklistSubmission"("attendance_id");

-- CreateIndex
CREATE INDEX "EvidencePhoto_submission_id_status_idx" ON "EvidencePhoto"("submission_id", "status");

-- CreateIndex
CREATE INDEX "EvidencePhoto_is_highlighted_idx" ON "EvidencePhoto"("is_highlighted");

-- CreateIndex
CREATE INDEX "WorkLog_user_id_date_idx" ON "WorkLog"("user_id", "date");

-- CreateIndex
CREATE INDEX "WorkLog_attendance_id_idx" ON "WorkLog"("attendance_id");

-- CreateIndex
CREATE INDEX "Notification_user_id_is_read_idx" ON "Notification"("user_id", "is_read");

-- CreateIndex
CREATE INDEX "Notification_created_at_idx" ON "Notification"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "ReportTemplate_division_id_key" ON "ReportTemplate"("division_id");

-- CreateIndex
CREATE INDEX "Report_company_id_period_year_period_month_idx" ON "Report"("company_id", "period_year", "period_month");

-- CreateIndex
CREATE UNIQUE INDEX "Report_company_id_division_id_period_month_period_year_key" ON "Report"("company_id", "division_id", "period_month", "period_year");

-- AddForeignKey
ALTER TABLE "Division" ADD CONSTRAINT "Division_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_division_id_fkey" FOREIGN KEY ("division_id") REFERENCES "Division"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCompanyRole" ADD CONSTRAINT "UserCompanyRole_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCompanyRole" ADD CONSTRAINT "UserCompanyRole_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "Shift"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_division_id_fkey" FOREIGN KEY ("division_id") REFERENCES "Division"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistTemplate" ADD CONSTRAINT "ChecklistTemplate_division_id_fkey" FOREIGN KEY ("division_id") REFERENCES "Division"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistItem" ADD CONSTRAINT "ChecklistItem_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "ChecklistTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistSubmission" ADD CONSTRAINT "ChecklistSubmission_attendance_id_fkey" FOREIGN KEY ("attendance_id") REFERENCES "Attendance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistSubmission" ADD CONSTRAINT "ChecklistSubmission_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "ChecklistItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidencePhoto" ADD CONSTRAINT "EvidencePhoto_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "ChecklistSubmission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkLog" ADD CONSTRAINT "WorkLog_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkLog" ADD CONSTRAINT "WorkLog_attendance_id_fkey" FOREIGN KEY ("attendance_id") REFERENCES "Attendance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkLogPhoto" ADD CONSTRAINT "WorkLogPhoto_work_log_id_fkey" FOREIGN KEY ("work_log_id") REFERENCES "WorkLog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportTemplate" ADD CONSTRAINT "ReportTemplate_division_id_fkey" FOREIGN KEY ("division_id") REFERENCES "Division"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_division_id_fkey" FOREIGN KEY ("division_id") REFERENCES "Division"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_generated_by_fkey" FOREIGN KEY ("generated_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
