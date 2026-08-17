-- AlterTable
ALTER TABLE "events" ADD COLUMN     "target_branches" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "target_courses" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "target_institutes" TEXT[] DEFAULT ARRAY[]::TEXT[];
