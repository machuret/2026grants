import { db } from "@/lib/db";

interface EligibilityRule {
  id: string;
  field: string;
  operator: string;
  value: string | null;
  valueType: string;
  isMandatory: boolean;
  confidenceLevel: string;
  evidenceText?: string | null;
}

interface CompanyProfile {
  legalEntityType?: string | null;
  jurisdiction?: string | null;
  taxStatus?: string | null;
  yearsFounded?: number | null;
  employeeCount?: number | null;
  annualRevenue?: number | null;
  annualBudget?: number | null;
  hasAuditedAccounts?: boolean | null;
  hasFinancialStatements?: boolean | null;
  hasInsurance?: boolean | null;
  hasSafeguardingPolicy?: boolean | null;
  hasLogicModel?: boolean | null;
  priorGrantWins?: number | null;
  missionAreas?: string[] | null;
  beneficiaryPopulation?: string[] | null;
  geographiesServed?: string[] | null;
  geographiesRegistered?: string[] | null;
  proposalWriterAvailable?: boolean | null;
  registrationStatus?: string | null;
}

interface DocInventory {
  docType: string;
  available: boolean;
}

// Map rule field names to CompanyProfile keys
const FIELD_MAP: Record<string, keyof CompanyProfile> = {
  legalStructure:       "legalEntityType",
  legalEntityType:      "legalEntityType",
  jurisdiction:         "jurisdiction",
  annualRevenue:        "annualRevenue",
  annualBudget:         "annualBudget",
  employeeCount:        "employeeCount",
  taxStatus:            "taxStatus",
  yearsOperating:       "yearsFounded",
  projectGeo:           "geographiesServed",
  applicantGeo:         "geographiesRegistered",
  beneficiaryType:      "beneficiaryPopulation",
  coFundingAvailable:   "hasAuditedAccounts",
  hasAuditedAccounts:   "hasAuditedAccounts",
  hasInsurance:         "hasInsurance",
  hasSafeguardingPolicy:"hasSafeguardingPolicy",
  industry:             "missionAreas",
  missionArea:          "missionAreas",
  registrationStatus:   "registrationStatus",
  proposalWriterAvailable: "proposalWriterAvailable",
  priorGrantExperience: "priorGrantWins",
};

// DOC types required per rule field
const FIELD_DOC_MAP: Record<string, string> = {
  hasAuditedAccounts:    "audit",
  hasFinancialStatements:"financial_statements",
  hasInsurance:          "insurance",
  hasSafeguardingPolicy: "safeguarding_policy",
  hasLogicModel:         "logic_model",
};

function evaluateRule(
  rule: EligibilityRule,
  profile: CompanyProfile,
): "matched" | "unmatched" | "unknown" {
  const profileKey = FIELD_MAP[rule.field];
  if (!profileKey) return "unknown";

  const profileVal = profile[profileKey];

  // If profile has no data for this field
  if (profileVal === null || profileVal === undefined) {
    return rule.confidenceLevel === "unknown" ? "unknown" : "unknown";
  }

  const ruleVal = rule.value;

  switch (rule.operator) {
    case "exists":
      return profileVal ? "matched" : "unmatched";

    case "eq":
      if (typeof profileVal === "boolean") {
        return profileVal === (ruleVal === "true" || ruleVal === "1") ? "matched" : "unmatched";
      }
      return String(profileVal).toLowerCase() === String(ruleVal).toLowerCase() ? "matched" : "unmatched";

    case "in": {
      const allowed = (ruleVal ?? "").split(",").map(s => s.trim().toLowerCase());
      if (Array.isArray(profileVal)) {
        return (profileVal as string[]).some(v => allowed.includes(v.toLowerCase())) ? "matched" : "unmatched";
      }
      return allowed.includes(String(profileVal).toLowerCase()) ? "matched" : "unmatched";
    }

    case "not_in": {
      const blocked = (ruleVal ?? "").split(",").map(s => s.trim().toLowerCase());
      if (Array.isArray(profileVal)) {
        return (profileVal as string[]).some(v => blocked.includes(v.toLowerCase())) ? "unmatched" : "matched";
      }
      return blocked.includes(String(profileVal).toLowerCase()) ? "unmatched" : "matched";
    }

    case "contains": {
      const needle = (ruleVal ?? "").toLowerCase();
      if (Array.isArray(profileVal)) {
        return (profileVal as string[]).some(v => v.toLowerCase().includes(needle)) ? "matched" : "unmatched";
      }
      return String(profileVal).toLowerCase().includes(needle) ? "matched" : "unmatched";
    }

    case "gte": {
      const num = Number(profileVal);
      const threshold = Number(ruleVal);
      if (isNaN(num) || isNaN(threshold)) return "unknown";
      // yearsOperating: derive from yearsFounded
      if (rule.field === "yearsOperating") {
        const age = new Date().getFullYear() - num;
        return age >= threshold ? "matched" : "unmatched";
      }
      return num >= threshold ? "matched" : "unmatched";
    }

    case "lte": {
      const num = Number(profileVal);
      const threshold = Number(ruleVal);
      if (isNaN(num) || isNaN(threshold)) return "unknown";
      return num <= threshold ? "matched" : "unmatched";
    }

    default:
      return "unknown";
  }
}

export async function computeMatchForGrant(
  companyId: string,
  publicGrantId: string,
): Promise<void> {
  // Load company profile
  const { data: profileData } = await db
    .from("CompanyProfile")
    .select("*")
    .eq("companyId", companyId)
    .maybeSingle();

  // Load doc inventory
  const { data: docsData } = await db
    .from("DocumentInventory")
    .select("docType, available")
    .eq("companyId", companyId);

  const docs: DocInventory[] = docsData ?? [];
  const docMap: Record<string, boolean> = {};
  for (const d of docs) docMap[d.docType] = d.available;

  // Load eligibility rules for this grant
  const { data: rulesData } = await db
    .from("GrantEligibilityRule")
    .select("*")
    .eq("publicGrantId", publicGrantId);

  const rules: EligibilityRule[] = rulesData ?? [];
  const profile: CompanyProfile = profileData ?? {};

  const matched: Record<string, unknown>[] = [];
  const unmatched: Record<string, unknown>[] = [];
  const unknown: Record<string, unknown>[] = [];
  const riskFlags: string[] = [];
  const documentGaps: string[] = [];

  // If no profile at all, everything is unknown
  const hasProfile = !!profileData;

  for (const rule of rules) {
    const ruleInfo = {
      id: rule.id,
      field: rule.field,
      operator: rule.operator,
      value: rule.value,
      isMandatory: rule.isMandatory,
      confidence: rule.confidenceLevel,
      evidence: rule.evidenceText,
    };

    if (!hasProfile) {
      unknown.push(ruleInfo);
      continue;
    }

    const result = evaluateRule(rule, profile);

    if (result === "matched") {
      matched.push(ruleInfo);
    } else if (result === "unmatched") {
      unmatched.push(ruleInfo);
      if (rule.isMandatory) riskFlags.push(`Mandatory criterion not met: ${rule.field}`);
    } else {
      unknown.push(ruleInfo);
    }

    // Check doc gaps
    const docRequired = FIELD_DOC_MAP[rule.field];
    if (docRequired && !docMap[docRequired]) {
      documentGaps.push(docRequired);
    }
  }

  // Scores
  const totalRules = rules.length;
  const mandatoryRules = rules.filter(r => r.isMandatory);
  const mandatoryUnmet = unmatched.filter(u => (u as {isMandatory: boolean}).isMandatory).length;
  const mandatoryMet = mandatoryRules.length - mandatoryUnmet;

  // Eligibility: mandatory rules dominate
  let eligibilityScore = 100;
  if (mandatoryRules.length > 0) {
    eligibilityScore = Math.round((mandatoryMet / mandatoryRules.length) * 100);
  } else if (totalRules === 0) {
    eligibilityScore = 50; // no rules = uncertain
  }

  // Readiness: doc completeness
  const requiredDocs = Object.values(FIELD_DOC_MAP);
  const availableDocs = requiredDocs.filter(d => docMap[d]).length;
  const readinessScore = requiredDocs.length > 0
    ? Math.round((availableDocs / requiredDocs.length) * 100)
    : (hasProfile ? (profileData?.readinessScore ?? 50) : 50);

  // Fit: optional criteria match rate
  const optionalRules = rules.filter(r => !r.isMandatory);
  const optionalMatched = matched.filter(m => !(m as {isMandatory: boolean}).isMandatory).length;
  const fitScore = optionalRules.length > 0
    ? Math.round((optionalMatched / optionalRules.length) * 100)
    : 50;

  // Overall: weighted
  const overallScore = mandatoryUnmet > 0
    ? 0  // any mandatory unmet = 0 overall (ineligible)
    : Math.round(eligibilityScore * 0.5 + readinessScore * 0.3 + fitScore * 0.2);

  // Generate explanation
  const lines: string[] = [];
  if (!hasProfile) {
    lines.push("No company profile found — complete your organisation profile to enable matching.");
  } else if (mandatoryUnmet > 0) {
    lines.push(`⚠ ${mandatoryUnmet} mandatory eligibility criteria are not met.`);
  } else if (mandatoryRules.length > 0) {
    lines.push(`✓ All ${mandatoryRules.length} mandatory criteria are satisfied.`);
  } else {
    lines.push("No mandatory criteria defined — match is based on scoring criteria only.");
  }
  if (documentGaps.length > 0) {
    lines.push(`Missing documents: ${[...new Set(documentGaps)].join(", ")}.`);
  }
  if (unknown.length > 0) {
    lines.push(`${unknown.length} criteria could not be evaluated — profile data missing.`);
  }

  const payload = {
    companyId,
    publicGrantId,
    overallScore,
    eligibilityScore,
    readinessScore,
    fitScore,
    matchedCriteria: matched,
    unmatchedCriteria: unmatched,
    unknownCriteria: unknown,
    riskFlags: riskFlags,
    documentGaps: [...new Set(documentGaps)],
    explanation: lines.join(" "),
    computedAt: new Date().toISOString(),
    stale: false,
  };

  // Upsert the match record
  await db
    .from("GrantMatch")
    .upsert(payload, { onConflict: "companyId,publicGrantId" });
}

// Compute matches for ALL companies for a single grant
export async function computeMatchesForAllCompanies(publicGrantId: string): Promise<void> {
  const { data: companies } = await db.from("Company").select("id");
  if (!companies) return;
  await Promise.all(companies.map(c => computeMatchForGrant(c.id, publicGrantId).catch(() => {})));
}

// Compute matches for ALL grants for a single company
export async function computeMatchesForCompany(companyId: string): Promise<void> {
  const { data: grants } = await db
    .from("PublicGrant")
    .select("id")
    .in("status", ["open", "enriched", "closing_soon", "recurring"]);
  if (!grants) return;
  await Promise.all(grants.map(g => computeMatchForGrant(companyId, g.id).catch(() => {})));
}

// Mark existing matches as stale for a grant (before recomputing)
export async function markMatchesStale(publicGrantId: string): Promise<void> {
  await db
    .from("GrantMatch")
    .update({ stale: true })
    .eq("publicGrantId", publicGrantId);
}
