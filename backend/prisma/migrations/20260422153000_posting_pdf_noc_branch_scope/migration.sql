-- Add posting application override and job description PDF support
ALTER TABLE "postings"
ADD COLUMN IF NOT EXISTS "job_description_pdf_url" TEXT;

ALTER TABLE "postings"
ADD COLUMN IF NOT EXISTS "application_override_enabled" BOOLEAN NOT NULL DEFAULT false;

-- Add branch scoping for NOC templates
ALTER TABLE "noc_templates"
ADD COLUMN IF NOT EXISTS "branch_scope" VARCHAR(200) NOT NULL DEFAULT 'ALL';

DROP INDEX IF EXISTS "noc_templates_tenant_id_posting_type_master_id_key";

CREATE UNIQUE INDEX IF NOT EXISTS "noc_templates_tenant_id_posting_type_master_id_branch_scope_key"
ON "noc_templates" ("tenant_id", "posting_type_master_id", "branch_scope");
