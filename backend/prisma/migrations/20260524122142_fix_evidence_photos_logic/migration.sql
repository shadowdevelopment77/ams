-- AlterTable
ALTER TABLE "ChecklistSubmission" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "is_submitted" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "submitted_at" DROP NOT NULL,
ALTER COLUMN "submitted_at" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "EvidencePhoto" ADD CONSTRAINT "EvidencePhoto_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
