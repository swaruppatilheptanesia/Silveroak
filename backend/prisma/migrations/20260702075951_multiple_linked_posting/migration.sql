-- AlterTable
ALTER TABLE "events" ADD COLUMN     "posting_ids" TEXT[] DEFAULT ARRAY[]::TEXT[];
