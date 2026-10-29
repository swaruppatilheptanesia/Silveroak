-- CreateTable
CREATE TABLE "pr_test_types" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "label" VARCHAR(120) NOT NULL,
    "description" TEXT,
    "is_standard" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_ai" BOOLEAN NOT NULL DEFAULT false,
    "ai_prompt" TEXT,
    "ai_reference_docs" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pr_test_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pr_question_banks" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "test_type_id" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pr_question_banks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pr_questions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "bank_id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "question_type_key" VARCHAR(60) NOT NULL,
    "difficulty" VARCHAR(20) NOT NULL,
    "options" JSONB NOT NULL DEFAULT '[]',
    "correct" JSONB,
    "marks" INTEGER NOT NULL DEFAULT 1,
    "reference_answer" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pr_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pr_video_categories" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pr_video_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pr_video_subcategories" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pr_video_subcategories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pr_practice_videos" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "title" VARCHAR(300) NOT NULL,
    "url" TEXT NOT NULL,
    "source" VARCHAR(40) NOT NULL DEFAULT 'youtube',
    "duration" VARCHAR(40),
    "category_id" TEXT,
    "sub_category_id" TEXT,
    "note" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pr_practice_videos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pr_test_types_tenant_id_is_active_idx" ON "pr_test_types"("tenant_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "pr_test_types_tenant_id_name_key" ON "pr_test_types"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "pr_question_banks_tenant_id_idx" ON "pr_question_banks"("tenant_id");

-- CreateIndex
CREATE INDEX "pr_question_banks_test_type_id_idx" ON "pr_question_banks"("test_type_id");

-- CreateIndex
CREATE INDEX "pr_questions_tenant_id_idx" ON "pr_questions"("tenant_id");

-- CreateIndex
CREATE INDEX "pr_questions_bank_id_idx" ON "pr_questions"("bank_id");

-- CreateIndex
CREATE INDEX "pr_video_categories_tenant_id_idx" ON "pr_video_categories"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "pr_video_categories_tenant_id_name_key" ON "pr_video_categories"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "pr_video_subcategories_tenant_id_idx" ON "pr_video_subcategories"("tenant_id");

-- CreateIndex
CREATE INDEX "pr_video_subcategories_category_id_idx" ON "pr_video_subcategories"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "pr_video_subcategories_category_id_name_key" ON "pr_video_subcategories"("category_id", "name");

-- CreateIndex
CREATE INDEX "pr_practice_videos_tenant_id_is_active_idx" ON "pr_practice_videos"("tenant_id", "is_active");

-- CreateIndex
CREATE INDEX "pr_practice_videos_category_id_idx" ON "pr_practice_videos"("category_id");

-- AddForeignKey
ALTER TABLE "pr_test_types" ADD CONSTRAINT "pr_test_types_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pr_question_banks" ADD CONSTRAINT "pr_question_banks_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pr_question_banks" ADD CONSTRAINT "pr_question_banks_test_type_id_fkey" FOREIGN KEY ("test_type_id") REFERENCES "pr_test_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pr_questions" ADD CONSTRAINT "pr_questions_bank_id_fkey" FOREIGN KEY ("bank_id") REFERENCES "pr_question_banks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pr_video_categories" ADD CONSTRAINT "pr_video_categories_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pr_video_subcategories" ADD CONSTRAINT "pr_video_subcategories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "pr_video_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pr_practice_videos" ADD CONSTRAINT "pr_practice_videos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pr_practice_videos" ADD CONSTRAINT "pr_practice_videos_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "pr_video_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pr_practice_videos" ADD CONSTRAINT "pr_practice_videos_sub_category_id_fkey" FOREIGN KEY ("sub_category_id") REFERENCES "pr_video_subcategories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
