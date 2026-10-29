/*
  Warnings:

  - You are about to drop the column `semester_rules` on the `master_options` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "master_options" DROP COLUMN "semester_rules",
ADD COLUMN     "scope_rows" JSONB NOT NULL DEFAULT '[]';
