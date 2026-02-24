-- ============================================================
-- GrantsHub V2 Schema — Decision Engine Foundation
-- ============================================================

-- ============================================================
-- 1. PublicGrant additions
-- ============================================================
ALTER TABLE "PublicGrant"
  ADD COLUMN IF NOT EXISTS "rawContent"         TEXT,
  ADD COLUMN IF NOT EXISTS "deadlineType"       TEXT DEFAULT 'fixed',
  ADD COLUMN IF NOT EXISTS "deadlineMilestones" JSONB,
  ADD COLUMN IF NOT EXISTS "amountMin"          INTEGER,
  ADD COLUMN IF NOT EXISTS "amountMax"          INTEGER,
  ADD COLUMN IF NOT EXISTS "amountTypical"      INTEGER,
  ADD COLUMN IF NOT EXISTS "coFundingRequired"  BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS "coFundingPercent"   INTEGER,
  ADD COLUMN IF NOT EXISTS "indirectCostCap"    TEXT,
  ADD COLUMN IF NOT EXISTS "disbursementType"   TEXT,
  ADD COLUMN IF NOT EXISTS "renewalPossible"    BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS "applicantGeo"       TEXT[],
  ADD COLUMN IF NOT EXISTS "projectGeo"         TEXT[],
  ADD COLUMN IF NOT EXISTS "tags"               TEXT[],
  ADD COLUMN IF NOT EXISTS "sourceId"           UUID REFERENCES "GrantSource"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "canonicalId"        UUID,
  ADD COLUMN IF NOT EXISTS "version"            INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "verifiedAt"         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "verifiedBy"         TEXT,
  ADD COLUMN IF NOT EXISTS "confidenceScore"    INTEGER DEFAULT 50,
  ADD COLUMN IF NOT EXISTS "reviewStatus"       TEXT DEFAULT 'auto',
  ADD COLUMN IF NOT EXISTS "reviewNotes"        TEXT;

-- Expand status values (comment for reference):
-- 'discovered' | 'open' | 'closing_soon' | 'closed' | 'archived' | 'recurring' | 'scraped' | 'enriched'

CREATE INDEX IF NOT EXISTS idx_pg_tags        ON "PublicGrant" USING GIN("tags");
CREATE INDEX IF NOT EXISTS idx_pg_applicant   ON "PublicGrant" USING GIN("applicantGeo");
CREATE INDEX IF NOT EXISTS idx_pg_source      ON "PublicGrant"("sourceId");
CREATE INDEX IF NOT EXISTS idx_pg_canonical   ON "PublicGrant"("canonicalId");
CREATE INDEX IF NOT EXISTS idx_pg_review      ON "PublicGrant"("reviewStatus");

-- ============================================================
-- 2. GrantEligibilityRule — atomic criteria per grant
-- ============================================================
CREATE TABLE IF NOT EXISTS "GrantEligibilityRule" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "publicGrantId"   UUID NOT NULL REFERENCES "PublicGrant"("id") ON DELETE CASCADE,
  "field"           TEXT NOT NULL,
  -- e.g. legalStructure, jurisdiction, annualRevenue, employeeCount,
  --      taxStatus, yearsOperating, projectGeo, beneficiaryType,
  --      coFundingAvailable, hasAuditedAccounts, industry
  "operator"        TEXT NOT NULL DEFAULT 'eq',
  -- eq | in | gte | lte | contains | not_in | exists
  "value"           TEXT,
  -- stored as text; arrays as comma-separated or JSON string
  "valueType"       TEXT DEFAULT 'string',
  -- string | number | boolean | array
  "isMandatory"     BOOLEAN NOT NULL DEFAULT true,
  "confidenceLevel" TEXT NOT NULL DEFAULT 'certain',
  -- certain | likely | uncertain | unknown
  "evidenceText"    TEXT,
  -- exact quote from source that supports this rule
  "notes"           TEXT,
  "reviewStatus"    TEXT DEFAULT 'auto',
  -- auto | reviewed | flagged
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ger_grant      ON "GrantEligibilityRule"("publicGrantId");
CREATE INDEX IF NOT EXISTS idx_ger_field      ON "GrantEligibilityRule"("field");
CREATE INDEX IF NOT EXISTS idx_ger_mandatory  ON "GrantEligibilityRule"("isMandatory");

-- ============================================================
-- 3. GrantVersion — change history for critical fields
-- ============================================================
CREATE TABLE IF NOT EXISTS "GrantVersion" (
  "id"             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "publicGrantId"  UUID NOT NULL REFERENCES "PublicGrant"("id") ON DELETE CASCADE,
  "version"        INTEGER NOT NULL,
  "changedAt"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "changedFields"  TEXT[],
  "previousValues" JSONB,
  "newValues"      JSONB,
  "changeSource"   TEXT DEFAULT 'manual',
  -- manual | scraper | enricher | admin
  "changedBy"      UUID REFERENCES "User"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_gv_grant   ON "GrantVersion"("publicGrantId");
CREATE INDEX IF NOT EXISTS idx_gv_changed ON "GrantVersion"("changedAt");

-- ============================================================
-- 4. CompanyProfile — structured readiness profile
--    Extends/replaces the free-text GrantProfile
-- ============================================================
CREATE TABLE IF NOT EXISTS "CompanyProfile" (
  "id"                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId"                UUID NOT NULL REFERENCES "Company"("id") ON DELETE CASCADE,

  -- Legal & registration
  "legalEntityType"          TEXT,
  -- nonprofit | charity | pty_ltd | university | hospital | government | individual | other
  "jurisdiction"             TEXT,
  "registrationNumber"       TEXT,
  "registrationStatus"       TEXT DEFAULT 'active',
  "taxStatus"                TEXT,
  -- tax_exempt | taxable | deductible_gift_recipient | unknown
  "abn"                      TEXT,
  "acn"                      TEXT,

  -- Size & financials
  "yearsFounded"             INTEGER,
  "employeeCount"            INTEGER,
  "annualRevenue"            INTEGER,
  "annualBudget"             INTEGER,
  "hasAuditedAccounts"       BOOLEAN DEFAULT false,
  "hasFinancialStatements"   BOOLEAN DEFAULT false,
  "hasInsurance"             BOOLEAN DEFAULT false,
  "priorGrantWins"           INTEGER DEFAULT 0,
  "totalGrantFunding"        INTEGER,

  -- Mission & focus
  "missionStatement"         TEXT,
  "missionAreas"             TEXT[],
  "focusAreas"               TEXT[],
  "beneficiaryPopulation"    TEXT[],
  "geographiesServed"        TEXT[],
  "geographiesRegistered"    TEXT[],

  -- Capacity
  "proposalWriterAvailable"  BOOLEAN DEFAULT false,
  "hasLogicModel"            BOOLEAN DEFAULT false,
  "hasSafeguardingPolicy"    BOOLEAN DEFAULT false,
  "impactMetrics"            JSONB,
  -- e.g. {"peopleServed": 1200, "programsDelivered": 5}

  -- Computed
  "readinessScore"           INTEGER DEFAULT 0,
  -- 0-100, computed from profile completeness + doc inventory

  "createdAt"                TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"                TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE("companyId")
);

CREATE INDEX IF NOT EXISTS idx_cp_company ON "CompanyProfile"("companyId");
CREATE INDEX IF NOT EXISTS idx_cp_legal   ON "CompanyProfile"("legalEntityType");

-- ============================================================
-- 5. DocumentInventory — what docs the company has ready
-- ============================================================
CREATE TABLE IF NOT EXISTS "DocumentInventory" (
  "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId"   UUID NOT NULL REFERENCES "Company"("id") ON DELETE CASCADE,
  "docType"     TEXT NOT NULL,
  -- incorporation | tax_id | financial_statements | audit | board_list
  -- insurance | safeguarding_policy | impact_report | project_budget
  -- logic_model | cv_key_staff | letters_of_support | compliance_statement
  -- annual_report | constitution | strategic_plan
  "label"       TEXT,
  "available"   BOOLEAN NOT NULL DEFAULT false,
  "fileUrl"     TEXT,
  "expiresAt"   TIMESTAMPTZ,
  "notes"       TEXT,
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE("companyId", "docType")
);

CREATE INDEX IF NOT EXISTS idx_di_company ON "DocumentInventory"("companyId");
CREATE INDEX IF NOT EXISTS idx_di_type    ON "DocumentInventory"("docType");

-- ============================================================
-- 6. GrantMatch — pre-computed match scores per company × grant
-- ============================================================
CREATE TABLE IF NOT EXISTS "GrantMatch" (
  "id"                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId"           UUID NOT NULL REFERENCES "Company"("id") ON DELETE CASCADE,
  "publicGrantId"       UUID NOT NULL REFERENCES "PublicGrant"("id") ON DELETE CASCADE,

  -- Scores (0-100)
  "overallScore"        INTEGER DEFAULT 0,
  "eligibilityScore"    INTEGER DEFAULT 0,
  "readinessScore"      INTEGER DEFAULT 0,
  "fitScore"            INTEGER DEFAULT 0,

  -- Detail
  "matchedCriteria"     JSONB,
  "unmatchedCriteria"   JSONB,
  "unknownCriteria"     JSONB,
  "riskFlags"           JSONB,
  "documentGaps"        TEXT[],
  "explanation"         TEXT,

  -- Meta
  "computedAt"          TIMESTAMPTZ NOT NULL DEFAULT now(),
  "stale"               BOOLEAN NOT NULL DEFAULT false,

  UNIQUE("companyId", "publicGrantId")
);

CREATE INDEX IF NOT EXISTS idx_gm_company   ON "GrantMatch"("companyId");
CREATE INDEX IF NOT EXISTS idx_gm_grant     ON "GrantMatch"("publicGrantId");
CREATE INDEX IF NOT EXISTS idx_gm_score     ON "GrantMatch"("overallScore" DESC);
CREATE INDEX IF NOT EXISTS idx_gm_stale     ON "GrantMatch"("stale");

-- ============================================================
-- 7. GrantOutcome — feedback loop for win/loss tracking
-- ============================================================
CREATE TABLE IF NOT EXISTS "GrantOutcome" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId"       UUID NOT NULL REFERENCES "Company"("id") ON DELETE CASCADE,
  "publicGrantId"   UUID REFERENCES "PublicGrant"("id") ON DELETE SET NULL,
  "grantId"         UUID REFERENCES "Grant"("id") ON DELETE SET NULL,
  "submittedAt"     TIMESTAMPTZ,
  "outcome"         TEXT,
  -- won | lost | withdrawn | pending | not_submitted
  "awardAmount"     INTEGER,
  "rejectionReason" TEXT,
  "notes"           TEXT,
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_go_company ON "GrantOutcome"("companyId");
CREATE INDEX IF NOT EXISTS idx_go_outcome ON "GrantOutcome"("outcome");
