/*
  Warnings:

  - You are about to drop the column `not0es` on the `ChecklistSubmission` table. All the data in the column will be lost.
  - You are about to drop the column `photo_url_1` on the `ChecklistSubmission` table. All the data in the column will be lost.
  - You are about to drop the column `photo_url_2` on the `ChecklistSubmission` table. All the data in the column will be lost.
  - You are about to drop the column `photo_url_3` on the `ChecklistSubmission` table. All the data in the column will be lost.
  - You are about to drop the column `reject_reason` on the `ChecklistSubmission` table. All the data in the column will be lost.
  - You are about to drop the column `reviewed_at` on the `ChecklistSubmission` table. All the data in the column will be lost.
  - You are about to drop the column `reviewed_by` on the `ChecklistSubmission` table. All the data in the column will be lost.
  - You are about to drop the column `status_id` on the `ChecklistSubmission` table. All the data in the column will be lost.
  - You are about to drop the `SubmissionStatus` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ChecklistSubmission" DROP CONSTRAINT "ChecklistSubmission_reviewed_by_fkey";

-- DropForeignKey
ALTER TABLE "ChecklistSubmission" DROP CONSTRAINT "ChecklistSubmission_status_id_fkey";

-- AlterTable
ALTER TABLE "ChecklistSubmission" DROP COLUMN "not0es",
DROP COLUMN "photo_url_1",
DROP COLUMN "photo_url_2",
DROP COLUMN "photo_url_3",
DROP COLUMN "reject_reason",
DROP COLUMN "reviewed_at",
DROP COLUMN "reviewed_by",
DROP COLUMN "status_id";

-- DropTable
DROP TABLE "SubmissionStatus";

-- CreateTable
CREATE TABLE "ChecklistPhoto" (
    "id" SERIAL NOT NULL,
    "submission_id" INTEGER NOT NULL,
    "photo_url" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChecklistPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChecklistPhoto_submission_id_idx" ON "ChecklistPhoto"("submission_id");

-- AddForeignKey
ALTER TABLE "ChecklistPhoto" ADD CONSTRAINT "ChecklistPhoto_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "ChecklistSubmission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
