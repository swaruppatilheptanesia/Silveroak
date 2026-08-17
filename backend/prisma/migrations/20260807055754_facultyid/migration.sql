-- AlterTable
ALTER TABLE "events" ADD COLUMN     "faculty_coordinator_ids" TEXT[] DEFAULT ARRAY[]::TEXT[];
