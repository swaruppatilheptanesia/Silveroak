-- AlterTable
ALTER TABLE "students" ADD COLUMN     "branch" VARCHAR(200);

-- CreateIndex
CREATE INDEX "students_tenant_id_branch_idx" ON "students"("tenant_id", "branch");
