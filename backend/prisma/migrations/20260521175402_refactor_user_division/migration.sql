/*
  Warnings:

  - You are about to drop the column `is_system` on the `Division` table. All the data in the column will be lost.
  - You are about to drop the column `client_name` on the `ReportTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `division_id` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[company_id,name]` on the table `Division` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `company_id` to the `ChecklistTemplate` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_division_id_fkey";

-- DropIndex
DROP INDEX "User_division_id_idx";

-- AlterTable
ALTER TABLE "ChecklistTemplate" ADD COLUMN     "company_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Division" DROP COLUMN "is_system";

-- AlterTable
ALTER TABLE "ReportTemplate" DROP COLUMN "client_name",
ADD COLUMN     "made_by" TEXT;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "division_id";

-- AlterTable
ALTER TABLE "UserCompanyRole" ADD COLUMN     "division_id" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Division_company_id_name_key" ON "Division"("company_id", "name");

-- CreateIndex
CREATE INDEX "UserCompanyRole_division_id_idx" ON "UserCompanyRole"("division_id");

-- AddForeignKey
ALTER TABLE "UserCompanyRole" ADD CONSTRAINT "UserCompanyRole_division_id_fkey" FOREIGN KEY ("division_id") REFERENCES "Division"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistTemplate" ADD CONSTRAINT "ChecklistTemplate_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
