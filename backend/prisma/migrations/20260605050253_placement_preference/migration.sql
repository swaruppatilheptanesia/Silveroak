-- AlterTable
ALTER TABLE "students" ADD COLUMN     "placement_opt_out" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "placement_opt_out_at" TIMESTAMP(3),
ADD COLUMN     "placement_opt_out_reason" TEXT;

-- CreateTable
CREATE TABLE "student_posting_type_preferences" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "posting_type_master_id" TEXT NOT NULL,
    "interested" BOOLEAN NOT NULL DEFAULT true,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_posting_type_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_placement_preference_history" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "scope" VARCHAR(20) NOT NULL,
    "posting_type_master_id" TEXT,
    "posting_type_label" VARCHAR(150),
    "interested" BOOLEAN NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_placement_preference_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "student_posting_type_preferences_student_id_idx" ON "student_posting_type_preferences"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_posting_type_preferences_student_id_posting_type_ma_key" ON "student_posting_type_preferences"("student_id", "posting_type_master_id");

-- CreateIndex
CREATE INDEX "student_placement_preference_history_student_id_created_at_idx" ON "student_placement_preference_history"("student_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "student_posting_type_preferences" ADD CONSTRAINT "student_posting_type_preferences_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_posting_type_preferences" ADD CONSTRAINT "student_posting_type_preferences_posting_type_master_id_fkey" FOREIGN KEY ("posting_type_master_id") REFERENCES "master_options"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_placement_preference_history" ADD CONSTRAINT "student_placement_preference_history_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
