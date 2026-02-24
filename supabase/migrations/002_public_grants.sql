-- Public Grants: admin-curated grant database visible to all users
CREATE TABLE IF NOT EXISTS "PublicGrant" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "founder" TEXT,
  "url" TEXT,
  "deadlineDate" TEXT,
  "howToApply" TEXT,
  "geographicScope" TEXT,
  "country" TEXT,
  "industry" TEXT,
  "eligibility" TEXT,
  "amount" TEXT,
  "projectDuration" TEXT,
  "description" TEXT,
  "requirements" TEXT,
  "contactInfo" TEXT,
  "sourceUrl" TEXT,
  "scrapedRaw" JSONB,
  "enriched" BOOLEAN NOT NULL DEFAULT false,
  "enrichedAt" TIMESTAMPTZ,
  "enrichedBy" UUID REFERENCES "User"("id"),
  "status" TEXT NOT NULL DEFAULT 'scraped',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for public grants
CREATE INDEX IF NOT EXISTS idx_pg_country ON "PublicGrant"("country");
CREATE INDEX IF NOT EXISTS idx_pg_industry ON "PublicGrant"("industry");
CREATE INDEX IF NOT EXISTS idx_pg_status ON "PublicGrant"("status");
CREATE INDEX IF NOT EXISTS idx_pg_enriched ON "PublicGrant"("enriched");
CREATE INDEX IF NOT EXISTS idx_pg_deadline ON "PublicGrant"("deadlineDate");

-- User's personal grant pipeline (references a public grant)
-- This replaces the company-scoped Grant for user CRM
ALTER TABLE "Grant" ADD COLUMN IF NOT EXISTS "publicGrantId" UUID REFERENCES "PublicGrant"("id") ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_grant_public ON "Grant"("publicGrantId");
