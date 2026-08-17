/*
  Warnings:

  - You are about to drop the column `duration` on the `current_employment` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "current_employment_student_id_key";

-- AlterTable
ALTER TABLE "current_employment" DROP COLUMN "duration",
ADD COLUMN     "closed_at" TIMESTAMP(3),
ADD COLUMN     "completion_proof_name" VARCHAR(255),
ADD COLUMN     "completion_proof_url" TEXT,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "status" VARCHAR(20) NOT NULL DEFAULT 'active';

-- CreateIndex
CREATE INDEX "current_employment_student_id_idx" ON "current_employment"("student_id");
