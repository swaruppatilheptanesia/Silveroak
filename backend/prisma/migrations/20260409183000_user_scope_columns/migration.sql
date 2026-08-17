-- AlterTable
ALTER TABLE "users"
ADD COLUMN     "institutes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "courses" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "branches" TEXT[] DEFAULT ARRAY[]::TEXT[];
