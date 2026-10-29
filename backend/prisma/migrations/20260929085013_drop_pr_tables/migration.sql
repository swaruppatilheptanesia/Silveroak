/*
  Warnings:

  - You are about to drop the `pr_practice_videos` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `pr_question_banks` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `pr_questions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `pr_test_types` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `pr_video_categories` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `pr_video_subcategories` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "pr_practice_videos" DROP CONSTRAINT "pr_practice_videos_category_id_fkey";

-- DropForeignKey
ALTER TABLE "pr_practice_videos" DROP CONSTRAINT "pr_practice_videos_sub_category_id_fkey";

-- DropForeignKey
ALTER TABLE "pr_practice_videos" DROP CONSTRAINT "pr_practice_videos_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "pr_question_banks" DROP CONSTRAINT "pr_question_banks_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "pr_question_banks" DROP CONSTRAINT "pr_question_banks_test_type_id_fkey";

-- DropForeignKey
ALTER TABLE "pr_questions" DROP CONSTRAINT "pr_questions_bank_id_fkey";

-- DropForeignKey
ALTER TABLE "pr_test_types" DROP CONSTRAINT "pr_test_types_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "pr_video_categories" DROP CONSTRAINT "pr_video_categories_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "pr_video_subcategories" DROP CONSTRAINT "pr_video_subcategories_category_id_fkey";

-- DropTable
DROP TABLE "pr_practice_videos";

-- DropTable
DROP TABLE "pr_question_banks";

-- DropTable
DROP TABLE "pr_questions";

-- DropTable
DROP TABLE "pr_test_types";

-- DropTable
DROP TABLE "pr_video_categories";

-- DropTable
DROP TABLE "pr_video_subcategories";
