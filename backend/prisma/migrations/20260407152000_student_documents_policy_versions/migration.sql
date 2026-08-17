ALTER TABLE "certifications"
ADD COLUMN     "document_url" TEXT,
ADD COLUMN     "document_name" VARCHAR(255),
ADD COLUMN     "document_mime_type" VARCHAR(150),
ADD COLUMN     "document_size" INTEGER;

ALTER TABLE "policy_acceptances"
ADD COLUMN     "policy_id" TEXT,
ADD COLUMN     "policy_version" VARCHAR(20),
ADD COLUMN     "policy_updated_at" TIMESTAMP(3);

CREATE INDEX "policy_acceptances_policy_id_idx" ON "policy_acceptances"("policy_id");
CREATE INDEX "policy_acceptances_student_id_policy_id_idx" ON "policy_acceptances"("student_id", "policy_id");

ALTER TABLE "policy_acceptances"
ADD CONSTRAINT "policy_acceptances_policy_id_fkey"
FOREIGN KEY ("policy_id") REFERENCES "policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
