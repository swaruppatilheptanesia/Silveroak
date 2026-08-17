ALTER TABLE "interest_registrations"
ALTER COLUMN "interest_type" TYPE TEXT
USING "interest_type"::text;
