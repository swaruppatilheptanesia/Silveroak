ALTER TABLE "no_dues_requests"
ADD COLUMN "proof_url" TEXT;

ALTER TABLE "portfolios"
ALTER COLUMN "status" SET DEFAULT 'published';
