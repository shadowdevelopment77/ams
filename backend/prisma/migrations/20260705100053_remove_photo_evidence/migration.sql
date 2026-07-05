/*
  Warnings:

  - You are about to drop the column `notes` on the `ChecklistSubmission` table. All the data in the column will be lost.
  - You are about to drop the `EvidencePhoto` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "EvidencePhoto" DROP CONSTRAINT "EvidencePhoto_submission_id_fkey";

-- AlterTable
ALTER TABLE "ChecklistSubmission" DROP COLUMN "notes",
ADD COLUMN     "not0es" TEXT,
ADD COLUMN     "photo_url_1" TEXT,
ADD COLUMN     "photo_url_2" TEXT,
ADD COLUMN     "photo_url_3" TEXT;

-- DropTable
DROP TABLE "EvidencePhoto";
