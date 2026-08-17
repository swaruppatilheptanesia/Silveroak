-- CreateEnum
CREATE TYPE "MasterCategory" AS ENUM ('technology', 'skill', 'interest', 'branch');

-- CreateTable
CREATE TABLE "master_options" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "category" "MasterCategory" NOT NULL,
    "value" VARCHAR(150) NOT NULL,
    "normalized_value" VARCHAR(150) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "master_options_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "master_options_tenant_id_category_is_active_idx" ON "master_options"("tenant_id", "category", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "master_options_tenant_id_category_normalized_value_key" ON "master_options"("tenant_id", "category", "normalized_value");

-- AddForeignKey
ALTER TABLE "master_options" ADD CONSTRAINT "master_options_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "master_options" ADD CONSTRAINT "master_options_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
