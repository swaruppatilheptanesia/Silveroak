-- AlterTable
ALTER TABLE "master_options" ADD COLUMN     "semester_rules" JSONB NOT NULL DEFAULT '[]';
