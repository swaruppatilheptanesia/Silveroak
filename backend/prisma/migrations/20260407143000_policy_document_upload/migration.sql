-- AlterTable
ALTER TABLE "policies"
ADD COLUMN     "document_url" TEXT,
ADD COLUMN     "document_name" VARCHAR(255),
ADD COLUMN     "document_mime_type" VARCHAR(150),
ADD COLUMN     "document_size" INTEGER;
