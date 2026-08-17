-- CreateEnum
CREATE TYPE "CompletionCertStatus" AS ENUM ('pending', 'approved', 'rejected');

-- AlterTable
ALTER TABLE "noc_requests" ADD COLUMN     "completion_certificate_mime_type" VARCHAR(150),
ADD COLUMN     "completion_certificate_name" VARCHAR(255),
ADD COLUMN     "completion_certificate_size" INTEGER,
ADD COLUMN     "completion_certificate_url" TEXT,
ADD COLUMN     "completion_due_notified_at" TIMESTAMP(3),
ADD COLUMN     "completion_remarks" TEXT,
ADD COLUMN     "completion_reviewed_at" TIMESTAMP(3),
ADD COLUMN     "completion_reviewed_by" TEXT,
ADD COLUMN     "completion_reviewed_by_name" VARCHAR(200),
ADD COLUMN     "completion_status" "CompletionCertStatus",
ADD COLUMN     "completion_submitted_at" TIMESTAMP(3);
