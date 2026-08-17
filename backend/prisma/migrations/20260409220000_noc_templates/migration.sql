-- CreateTable
CREATE TABLE "noc_templates" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "posting_type_master_id" TEXT NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "subject" TEXT NOT NULL,
    "body_html" TEXT NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "noc_templates_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "noc_requests" ADD COLUMN "noc_template_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "noc_templates_tenant_id_posting_type_master_id_key" ON "noc_templates"("tenant_id", "posting_type_master_id");

-- CreateIndex
CREATE INDEX "noc_templates_tenant_id_idx" ON "noc_templates"("tenant_id");

-- CreateIndex
CREATE INDEX "noc_requests_noc_template_id_idx" ON "noc_requests"("noc_template_id");

-- AddForeignKey
ALTER TABLE "noc_templates" ADD CONSTRAINT "noc_templates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "noc_templates" ADD CONSTRAINT "noc_templates_posting_type_master_id_fkey" FOREIGN KEY ("posting_type_master_id") REFERENCES "master_options"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "noc_templates" ADD CONSTRAINT "noc_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "noc_templates" ADD CONSTRAINT "noc_templates_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "noc_requests" ADD CONSTRAINT "noc_requests_noc_template_id_fkey" FOREIGN KEY ("noc_template_id") REFERENCES "noc_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
