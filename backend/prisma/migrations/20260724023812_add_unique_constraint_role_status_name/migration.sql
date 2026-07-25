-- Prevents the seed script's createMany({ skipDuplicates: true }) from
-- silently no-oping: without a unique constraint on `name`, every re-run
-- inserted fresh duplicate rows (found in the dev DB: 6 UserRole rows and
-- 4 AttendanceStatus rows instead of 3 and 2). Duplicates were already
-- cleaned up manually before this migration.
CREATE UNIQUE INDEX "UserRole_name_key" ON "UserRole"("name");
CREATE UNIQUE INDEX "AttendanceStatus_name_key" ON "AttendanceStatus"("name");
