ALTER TABLE "current_employment"
ADD COLUMN IF NOT EXISTS "offer_letter_url" TEXT,
ADD COLUMN IF NOT EXISTS "business_proof_url" TEXT;
