ALTER TABLE "students"
ADD COLUMN "no_dues_enabled" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "students_tenant_id_no_dues_enabled_idx" ON "students"("tenant_id", "no_dues_enabled");
