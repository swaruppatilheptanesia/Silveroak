-- AlterEnum
ALTER TYPE "TargetAudienceType" ADD VALUE 'semester';

-- AlterTable
ALTER TABLE "announcements" ADD COLUMN     "attachment_mime_type" VARCHAR(120),
ADD COLUMN     "attachment_name" VARCHAR(255),
ADD COLUMN     "attachment_size" INTEGER,
ADD COLUMN     "attachment_url" TEXT,
ADD COLUMN     "target_semesters" TEXT[] DEFAULT ARRAY[]::TEXT[];
