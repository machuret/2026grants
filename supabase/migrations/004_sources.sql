-- Grant Sources table: websites the scraper uses as references
CREATE TABLE IF NOT EXISTS "GrantSource" (
  "id"            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name"          TEXT NOT NULL,
  "url"           TEXT NOT NULL,
  "country"       TEXT,
  "state"         TEXT,
  "industry"      TEXT,
  "description"   TEXT,
  "status"        TEXT NOT NULL DEFAULT 'pending',
  -- 'pending' | 'crawling' | 'learned' | 'error'
  "siteStructure" JSONB,
  -- AI-extracted structure: nav links, grant listing patterns, pagination, etc.
  "grantListUrl"  TEXT,
  -- The specific URL that lists grants (may differ from homepage)
  "crawlNotes"    TEXT,
  -- AI notes on how to extract grants from this site
  "lastCrawledAt" TIMESTAMPTZ,
  "lastScrapedAt" TIMESTAMPTZ,
  "grantsFound"   INTEGER DEFAULT 0,
  "active"        BOOLEAN NOT NULL DEFAULT true,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gs_country ON "GrantSource"("country");
CREATE INDEX IF NOT EXISTS idx_gs_active ON "GrantSource"("active");
CREATE INDEX IF NOT EXISTS idx_gs_status ON "GrantSource"("status");
