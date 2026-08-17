-- AlterTable
ALTER TABLE "no_dues_requests" ADD COLUMN     "additional_details" TEXT,
ADD COLUMN     "company_address" TEXT,
ADD COLUMN     "company_sector" VARCHAR(200),
ADD COLUMN     "examination_name" VARCHAR(300),
ADD COLUMN     "language_test" VARCHAR(200),
ADD COLUMN     "sou_passing_year" VARCHAR(20),
ADD COLUMN     "university_address" TEXT;
