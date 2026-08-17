-- CreateEnum
CREATE TYPE "CompanySource" AS ENUM ('admin', 'student', 'recruiter', 'import');

-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "city" VARCHAR(100),
ADD COLUMN     "gst" VARCHAR(30),
ADD COLUMN     "pan" VARCHAR(20),
ADD COLUMN     "source" "CompanySource" NOT NULL DEFAULT 'admin',
ADD COLUMN     "state" VARCHAR(100),
ADD COLUMN     "verification_status" "CompanyVerificationStatus" NOT NULL DEFAULT 'verified';

-- AlterTable
ALTER TABLE "noc_requests" ADD COLUMN     "company_gst" VARCHAR(30),
ADD COLUMN     "company_id" TEXT,
ADD COLUMN     "company_pan" VARCHAR(20),
ADD COLUMN     "supporting_document_name" VARCHAR(255),
ADD COLUMN     "supporting_document_url" TEXT,
ALTER COLUMN "end_date" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "noc_requests_company_id_idx" ON "noc_requests"("company_id");

-- AddForeignKey
ALTER TABLE "noc_requests" ADD CONSTRAINT "noc_requests_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
