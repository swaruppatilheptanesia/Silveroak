-- AlterTable
ALTER TABLE "postings" ADD COLUMN     "job_description_pdf_urls" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "locations" TEXT[] DEFAULT ARRAY[]::TEXT[];
