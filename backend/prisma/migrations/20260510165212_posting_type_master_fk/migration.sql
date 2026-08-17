-- Replace Posting.type ENUM with FK to MasterOption (posting_type category).
-- Steps:
--   1. Add the new posting_type_master_id column (nullable for now).
--   2. Auto-seed the legacy 3 master rows per tenant if absent.
--   3. Backfill the FK column from the existing type::text value.
--   4. Make the column NOT NULL.
--   5. Add the FK constraint (ON DELETE RESTRICT).
--   6. Add the supporting index.
--   7. Drop the old type column and the @@index([tenant_id, type]) it was part of.
--   8. Drop the PostingType enum type.

-- Step 1: add nullable column
ALTER TABLE "postings" ADD COLUMN "posting_type_master_id" TEXT;

-- Step 2: ensure each tenant has the 3 legacy master rows for posting_type
INSERT INTO "master_options" (id, tenant_id, category, value, normalized_value, is_active, created_at, updated_at)
SELECT gen_random_uuid()::text, t.id, 'posting_type', v.value, v.value, TRUE, NOW(), NOW()
FROM "tenants" t
CROSS JOIN (VALUES ('job'), ('internship'), ('stipend_internship')) AS v(value)
WHERE NOT EXISTS (
  SELECT 1 FROM "master_options" m
  WHERE m.tenant_id = t.id
    AND m.category = 'posting_type'
    AND m.normalized_value = v.value
);

-- Step 3: backfill FK from old type column
UPDATE "postings" p
SET "posting_type_master_id" = m.id
FROM "master_options" m
WHERE m.tenant_id = p.tenant_id
  AND m.category = 'posting_type'
  AND m.normalized_value = p."type"::text;

-- Step 4: enforce NOT NULL (migration fails if any row is unmatched -> intentional)
ALTER TABLE "postings" ALTER COLUMN "posting_type_master_id" SET NOT NULL;

-- Step 5: drop the old @@index([tenant_id, type]) before dropping the column
DROP INDEX IF EXISTS "postings_tenant_id_type_idx";

-- Step 6: add FK constraint
ALTER TABLE "postings"
  ADD CONSTRAINT "postings_posting_type_master_id_fkey"
  FOREIGN KEY ("posting_type_master_id")
  REFERENCES "master_options"(id)
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

-- Step 7: add the new index
CREATE INDEX "postings_tenant_id_posting_type_master_id_idx"
  ON "postings"("tenant_id", "posting_type_master_id");

-- Step 8: drop old column and enum
ALTER TABLE "postings" DROP COLUMN "type";
DROP TYPE "PostingType";
