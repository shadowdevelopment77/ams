-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN     "reason" TEXT;

-- AlterTable
ALTER TABLE "Division" ADD COLUMN     "late_tolerance_minutes" INTEGER NOT NULL DEFAULT 15;
