-- Add SEO + URL slug fields to PublicGrant
ALTER TABLE "PublicGrant"
  ADD COLUMN IF NOT EXISTS "slug" TEXT,
  ADD COLUMN IF NOT EXISTS "state" TEXT,
  ADD COLUMN IF NOT EXISTS "seoTitle" TEXT,
  ADD COLUMN IF NOT EXISTS "seoDescription" TEXT,
  ADD COLUMN IF NOT EXISTS "seoKeywords" TEXT,
  ADD COLUMN IF NOT EXISTS "published" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "publishedAt" TIMESTAMPTZ;

-- Unique slug per country+state+industry combination
CREATE UNIQUE INDEX IF NOT EXISTS idx_pg_slug_unique ON "PublicGrant"("slug") WHERE "slug" IS NOT NULL;

-- Indexes for public URL routing
CREATE INDEX IF NOT EXISTS idx_pg_country_lower ON "PublicGrant"(lower("country"));
CREATE INDEX IF NOT EXISTS idx_pg_state_lower ON "PublicGrant"(lower("state"));
CREATE INDEX IF NOT EXISTS idx_pg_industry_lower ON "PublicGrant"(lower("industry"));
CREATE INDEX IF NOT EXISTS idx_pg_published ON "PublicGrant"("published");
