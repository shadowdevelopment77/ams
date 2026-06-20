/*
  Warnings:

  - You are about to drop the column `is_done` on the `ChecklistSubmission` table. All the data in the column will be lost.
  - You are about to drop the column `is_submitted` on the `ChecklistSubmission` table. All the data in the column will be lost.
  - You are about to drop the column `reject_reason` on the `EvidencePhoto` table. All the data in the column will be lost.
  - You are about to drop the column `reviewed_at` on the `EvidencePhoto` table. All the data in the column will be lost.
  - You are about to drop the column `reviewed_by` on the `EvidencePhoto` table. All the data in the column will be lost.
  - You are about to drop the column `status_id` on the `EvidencePhoto` table. All the data in the column will be lost.
  - You are about to drop the `PhotoStatus` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `status_id` to the `ChecklistSubmission` table without a default value. This is not possible if the table is not empty.
  - Added the required column `order` to the `EvidencePhoto` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "EvidencePhoto" DROP CONSTRAINT "EvidencePhoto_reviewed_by_fkey";

-- DropForeignKey
ALTER TABLE "EvidencePhoto" DROP CONSTRAINT "EvidencePhoto_status_id_fkey";

-- DropIndex
DROP INDEX "EvidencePhoto_submission_id_status_id_idx";

-- AlterTable
ALTER TABLE "ChecklistSubmission" DROP COLUMN "is_done",
DROP COLUMN "is_submitted",
ADD COLUMN     "reject_reason" TEXT,
ADD COLUMN     "reviewed_at" TIMESTAMP(3),
ADD COLUMN     "reviewed_by" TEXT,
ADD COLUMN     "status_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "EvidencePhoto" DROP COLUMN "reject_reason",
DROP COLUMN "reviewed_at",
DROP COLUMN "reviewed_by",
DROP COLUMN "status_id",
ADD COLUMN     "order" INTEGER NOT NULL;

-- DropTable
DROP TABLE "PhotoStatus";

-- CreateTable
CREATE TABLE "SubmissionStatus" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubmissionStatus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EvidencePhoto_submission_id_idx" ON "EvidencePhoto"("submission_id");

-- AddForeignKey
ALTER TABLE "ChecklistSubmission" ADD CONSTRAINT "ChecklistSubmission_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistSubmission" ADD CONSTRAINT "ChecklistSubmission_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "SubmissionStatus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
