-- AlterTable
ALTER TABLE "postings" ADD COLUMN     "job_description_pdf_names" TEXT[] DEFAULT ARRAY[]::TEXT[];
