-- GrantsHub initial schema

-- Company table
CREATE TABLE IF NOT EXISTS "Company" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "industry" TEXT,
  "website" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Company info (extended profile for grant matching)
CREATE TABLE IF NOT EXISTS "CompanyInfo" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" UUID NOT NULL REFERENCES "Company"("id") ON DELETE CASCADE,
  "bulkContent" TEXT,
  "values" TEXT,
  "corePhilosophy" TEXT,
  "founders" TEXT,
  "achievements" TEXT,
  "products" TEXT,
  "targetAudience" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE("companyId")
);

-- Users
CREATE TABLE IF NOT EXISTS "User" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "authId" UUID NOT NULL UNIQUE,
  "email" TEXT NOT NULL,
  "name" TEXT,
  "role" TEXT NOT NULL DEFAULT 'USER',
  "companyId" UUID REFERENCES "Company"("id") ON DELETE SET NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Grants
CREATE TABLE IF NOT EXISTS "Grant" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" UUID NOT NULL REFERENCES "Company"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "founder" TEXT,
  "url" TEXT,
  "deadlineDate" TEXT,
  "howToApply" TEXT,
  "geographicScope" TEXT,
  "eligibility" TEXT,
  "amount" TEXT,
  "projectDuration" TEXT,
  "fitScore" INTEGER,
  "submissionEffort" TEXT,
  "decision" TEXT,
  "notes" TEXT,
  "aiScore" INTEGER,
  "aiVerdict" TEXT,
  "matchScore" INTEGER,
  "complexityScore" INTEGER,
  "complexityLabel" TEXT,
  "complexityNotes" TEXT,
  "crmStatus" TEXT,
  "crmNotes" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Grant Profile (for AI matching)
CREATE TABLE IF NOT EXISTS "GrantProfile" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" UUID NOT NULL REFERENCES "Company"("id") ON DELETE CASCADE,
  "orgDescription" TEXT,
  "missionStatement" TEXT,
  "pastProjects" TEXT,
  "targetRegions" TEXT,
  "teamCapabilities" TEXT,
  "annualBudget" TEXT,
  "preferredGrantSize" TEXT,
  "focusAreas" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE("companyId")
);

-- Grant Drafts (for grant builder)
CREATE TABLE IF NOT EXISTS "GrantDraft" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" UUID NOT NULL REFERENCES "Company"("id") ON DELETE CASCADE,
  "grantId" UUID REFERENCES "Grant"("id") ON DELETE SET NULL,
  "title" TEXT NOT NULL,
  "sections" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_grant_company ON "Grant"("companyId");
CREATE INDEX IF NOT EXISTS idx_grant_deadline ON "Grant"("deadlineDate");
CREATE INDEX IF NOT EXISTS idx_grant_decision ON "Grant"("decision");
CREATE INDEX IF NOT EXISTS idx_grant_crm ON "Grant"("crmStatus");
CREATE INDEX IF NOT EXISTS idx_user_auth ON "User"("authId");
CREATE INDEX IF NOT EXISTS idx_user_company ON "User"("companyId");
CREATE INDEX IF NOT EXISTS idx_draft_company ON "GrantDraft"("companyId");

-- Insert a default company for initial setup
INSERT INTO "Company" ("id", "name", "industry")
VALUES ('00000000-0000-0000-0000-000000000001', 'My Organisation', 'Non-profit')
ON CONFLICT ("id") DO NOTHING;
