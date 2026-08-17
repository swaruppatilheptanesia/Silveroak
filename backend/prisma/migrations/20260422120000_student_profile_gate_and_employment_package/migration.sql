-- Add student profile block fields
ALTER TABLE "students"
ADD COLUMN IF NOT EXISTS "profile_blocked" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "students"
ADD COLUMN IF NOT EXISTS "profile_block_reason" TEXT;

CREATE INDEX IF NOT EXISTS "students_tenant_id_profile_blocked_idx"
ON "students" ("tenant_id", "profile_blocked");

-- Add employment package field
ALTER TABLE "current_employment"
ADD COLUMN IF NOT EXISTS "package_lpa" DECIMAL(10,2);
