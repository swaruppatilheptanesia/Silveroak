-- Add posting student-targeting fields
ALTER TABLE "postings"
ADD COLUMN     "target_institutes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "target_courses" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "target_branches" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "target_semesters" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Add posting type master student-targeting fields
ALTER TABLE "master_options"
ADD COLUMN     "target_institutes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "target_courses" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "target_branches" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "target_semesters" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Extend the shared student projects table before migrating legacy portfolio projects.
ALTER TABLE "student_projects"
ADD COLUMN     "portfolio_id" TEXT,
ADD COLUMN     "role" VARCHAR(200),
ADD COLUMN     "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "live_url" TEXT,
ADD COLUMN     "attachments" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "display_order" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "student_projects_portfolio_id_idx" ON "student_projects"("portfolio_id");

ALTER TABLE "student_projects" ADD CONSTRAINT "student_projects_portfolio_id_fkey" FOREIGN KEY ("portfolio_id") REFERENCES "portfolios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill legacy portfolio projects into the shared student_projects table.
INSERT INTO "student_projects" (
  "id",
  "student_id",
  "portfolio_id",
  "title",
  "description",
  "role",
  "technologies",
  "keywords",
  "github_url",
  "demo_url",
  "live_url",
  "start_date",
  "end_date",
  "is_ongoing",
  "attachments",
  "display_order",
  "created_at",
  "updated_at"
)
SELECT
  p."id",
  port."student_id",
  p."portfolio_id",
  p."title",
  p."description",
  p."role",
  p."technologies",
  p."keywords",
  p."github_url",
  NULL,
  p."live_url",
  p."start_date",
  p."end_date",
  p."is_ongoing",
  '[]'::jsonb,
  p."display_order",
  p."created_at",
  p."updated_at"
FROM "portfolio_projects" p
INNER JOIN "portfolios" port ON port."id" = p."portfolio_id"
WHERE NOT EXISTS (
  SELECT 1
  FROM "student_projects" sp
  WHERE sp."student_id" = port."student_id"
    AND lower(btrim(sp."title")) = lower(btrim(p."title"))
);

DROP TABLE "portfolio_projects";
