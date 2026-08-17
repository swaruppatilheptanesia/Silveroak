-- AlterTable
ALTER TABLE "policies" ADD COLUMN     "posting_type_master_id" TEXT;

-- CreateIndex
CREATE INDEX "policies_posting_type_master_id_idx" ON "policies"("posting_type_master_id");

-- AddForeignKey
ALTER TABLE "policies" ADD CONSTRAINT "policies_posting_type_master_id_fkey" FOREIGN KEY ("posting_type_master_id") REFERENCES "master_options"("id") ON DELETE SET NULL ON UPDATE CASCADE;
