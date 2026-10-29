-- DropIndex
DROP INDEX "noc_requests_noc_number_key";

-- AlterTable
ALTER TABLE "noc_requests" ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "is_reissue" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "previous_noc_id" TEXT,
ADD COLUMN     "reason_for_company_change" TEXT,
ADD COLUMN     "termination_letter_name" VARCHAR(255),
ADD COLUMN     "termination_letter_url" TEXT;

-- CreateIndex
CREATE INDEX "noc_requests_tenant_id_noc_number_idx" ON "noc_requests"("tenant_id", "noc_number");

-- CreateIndex
CREATE INDEX "noc_requests_tenant_id_is_active_idx" ON "noc_requests"("tenant_id", "is_active");

-- AddForeignKey
ALTER TABLE "noc_requests" ADD CONSTRAINT "noc_requests_previous_noc_id_fkey" FOREIGN KEY ("previous_noc_id") REFERENCES "noc_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
