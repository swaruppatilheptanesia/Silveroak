-- AlterTable
ALTER TABLE "master_options" ADD COLUMN     "target_academic_years" TEXT[] DEFAULT ARRAY[]::TEXT[];
