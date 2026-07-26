-- Soft-delete duplicate active ChecklistTemplate rows, keeping only the
-- most-recently-created one per division (matches current real behavior --
-- bulkCreateChecklist already picks the newest template for new check-ins,
-- so this doesn't change what new staff experience, just formalizes it).
UPDATE "ChecklistTemplate" t1
SET is_deleted = true, deleted_at = now()
WHERE t1.is_deleted = false
  AND EXISTS (
    SELECT 1 FROM "ChecklistTemplate" t2
    WHERE t2.company_id = t1.company_id
      AND t2.division_id = t1.division_id
      AND t2.is_deleted = false
      AND (t2.created_at, t2.id) > (t1.created_at, t1.id)
  );

-- Partial unique index (not a blanket @@unique) -- a soft-deleted template
-- must not block creating a fresh one for that division afterward.
CREATE UNIQUE INDEX "ChecklistTemplate_company_division_active_key"
  ON "ChecklistTemplate" (company_id, division_id)
  WHERE is_deleted = false;
