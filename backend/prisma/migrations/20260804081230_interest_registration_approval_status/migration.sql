-- CreateEnum
CREATE TYPE "InterestRegistrationStatus" AS ENUM ('pending', 'approved', 'withdrawn');

-- AlterTable
ALTER TABLE "interest_registrations" ADD COLUMN     "reviewed_at" TIMESTAMP(3),
ADD COLUMN     "reviewed_by" TEXT,
ADD COLUMN     "status" "InterestRegistrationStatus" NOT NULL DEFAULT 'approved',
ADD COLUMN     "status_reason" TEXT;

-- CreateIndex
CREATE INDEX "interest_registrations_student_id_status_idx" ON "interest_registrations"("student_id", "status");
