/*
  Warnings:

  - You are about to drop the column `created_by` on the `ChecklistTemplate` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ChecklistTemplate" DROP COLUMN "created_by";

-- CreateIndex
CREATE INDEX "ChecklistTemplate_company_id_idx" ON "ChecklistTemplate"("company_id");
