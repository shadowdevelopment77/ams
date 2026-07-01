/*
  Warnings:

  - You are about to drop the column `has_checklist` on the `Division` table. All the data in the column will be lost.
  - You are about to drop the column `has_evidence_photo` on the `Division` table. All the data in the column will be lost.
  - You are about to drop the column `has_work_log` on the `Division` table. All the data in the column will be lost.
  - You are about to drop the column `min_photo_per_day` on the `Division` table. All the data in the column will be lost.
  - You are about to drop the column `photo_highlight_only` on the `Division` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Division" DROP COLUMN "has_checklist",
DROP COLUMN "has_evidence_photo",
DROP COLUMN "has_work_log",
DROP COLUMN "min_photo_per_day",
DROP COLUMN "photo_highlight_only";
