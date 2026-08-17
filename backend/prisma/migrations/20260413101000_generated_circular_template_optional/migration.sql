-- Allow generated circulars to be created without a backing template.
ALTER TABLE "generated_circulars" ALTER COLUMN "template_id" DROP NOT NULL;

ALTER TABLE "generated_circulars" DROP CONSTRAINT IF EXISTS "generated_circulars_template_id_fkey";

ALTER TABLE "generated_circulars"
ADD CONSTRAINT "generated_circulars_template_id_fkey"
FOREIGN KEY ("template_id") REFERENCES "circular_templates"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
