-- DropForeignKey
ALTER TABLE "ChecklistSubmission" DROP CONSTRAINT "ChecklistSubmission_status_id_fkey";

-- AlterTable
ALTER TABLE "ChecklistSubmission" ADD COLUMN     "is_submitted" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "status_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "ChecklistSubmission" ADD CONSTRAINT "ChecklistSubmission_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "SubmissionStatus"("id") ON DELETE SET NULL ON UPDATE CASCADE;
