export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, handleApiError } from "@/lib/apiHelpers";
import { getCompanyId } from "@/lib/getCompanyId";
import { computeMatchesForCompany } from "@/lib/matchEngine";

export async function GET() {
  try {
    const { user, response: authError } = await requireAuth();
    if (authError) return authError;
    const companyId = await getCompanyId(user!.id);
    const { data, error } = await db
      .from("CompanyProfile")
      .select("*")
      .eq("companyId", companyId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return NextResponse.json({ profile: data });
  } catch (err) {
    return handleApiError(err, "CompanyProfile GET");
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { user, response: authError } = await requireAuth();
    if (authError) return authError;
    const companyId = await getCompanyId(user!.id);
    const body = await req.json();

    // Compute readiness score from profile completeness
    const score = computeReadinessScore(body);

    const payload = { ...body, companyId, readinessScore: score, updatedAt: new Date().toISOString() };

    const { data: existing } = await db
      .from("CompanyProfile")
      .select("id")
      .eq("companyId", companyId)
      .maybeSingle();

    let data, error;
    if (existing) {
      ({ data, error } = await db.from("CompanyProfile").update(payload).eq("companyId", companyId).select().single());
    } else {
      ({ data, error } = await db.from("CompanyProfile").insert(payload).select().single());
    }

    if (error) throw new Error(error.message);

    // Auto-trigger re-matching for this company (fire-and-forget)
    computeMatchesForCompany(companyId).catch(() => {});

    return NextResponse.json({ success: true, profile: data });
  } catch (err) {
    return handleApiError(err, "CompanyProfile PUT");
  }
}

function computeReadinessScore(p: Record<string, unknown>): number {
  let score = 0;
  const checks: [unknown, number][] = [
    [p.legalEntityType, 8],
    [p.jurisdiction, 5],
    [p.taxStatus, 5],
    [p.yearsFounded, 4],
    [p.employeeCount, 4],
    [p.annualRevenue, 5],
    [p.hasAuditedAccounts, 8],
    [p.hasFinancialStatements, 8],
    [p.hasInsurance, 5],
    [p.missionStatement, 8],
    [p.missionAreas && (p.missionAreas as unknown[]).length > 0, 6],
    [p.geographiesServed && (p.geographiesServed as unknown[]).length > 0, 5],
    [p.proposalWriterAvailable, 6],
    [p.hasSafeguardingPolicy, 5],
    [p.hasLogicModel, 5],
    [p.priorGrantWins && (p.priorGrantWins as number) > 0, 7],
    [p.beneficiaryPopulation && (p.beneficiaryPopulation as unknown[]).length > 0, 5],
  ];
  for (const [val, pts] of checks) {
    if (val) score += pts;
  }
  return Math.min(100, score);
}
