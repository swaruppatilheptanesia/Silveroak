ALTER TABLE "noc_requests"
  ALTER COLUMN "program" TYPE VARCHAR(150)
  USING "program"::text;

DROP TYPE IF EXISTS "NocProgram";
