-- Enforce "exactly one UserCompanyRole row per user" and stop hard-deletes
-- of Company/Division from silently nulling out an assignment (the old
-- ON DELETE SET NULL let a raw DB delete bypass the app's soft-delete-only,
-- "blocked if active staff assigned" safeguard entirely).

-- DropForeignKey
ALTER TABLE "UserCompanyRole" DROP CONSTRAINT "UserCompanyRole_company_id_fkey";
ALTER TABLE "UserCompanyRole" DROP CONSTRAINT "UserCompanyRole_division_id_fkey";

-- DropIndex
DROP INDEX "UserCompanyRole_user_id_idx";

-- CreateIndex
CREATE UNIQUE INDEX "UserCompanyRole_user_id_key" ON "UserCompanyRole"("user_id");

-- AddForeignKey
ALTER TABLE "UserCompanyRole" ADD CONSTRAINT "UserCompanyRole_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UserCompanyRole" ADD CONSTRAINT "UserCompanyRole_division_id_fkey" FOREIGN KEY ("division_id") REFERENCES "Division"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
