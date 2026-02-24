export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth, handleApiError } from "@/lib/apiHelpers";
import { computeMatchesForAllCompanies, computeMatchesForCompany, markMatchesStale } from "@/lib/matchEngine";

// POST /api/admin/match
// Body: { grantId } — recompute matches for a single grant across all companies
// Body: { companyId } — recompute matches for a single company across all grants
// Body: {} — not supported at scale; use individual triggers
export async function POST(req: NextRequest) {
  try {
    const { response: authError } = await requireAdminAuth();
    if (authError) return authError;

    const body = await req.json();
    const { grantId, companyId } = body;

    if (grantId) {
      await markMatchesStale(grantId);
      await computeMatchesForAllCompanies(grantId);
      return NextResponse.json({ success: true, message: "Matching complete for grant" });
    }

    if (companyId) {
      await computeMatchesForCompany(companyId);
      return NextResponse.json({ success: true, message: "Matching complete for company" });
    }

    return NextResponse.json({ error: "Provide grantId or companyId" }, { status: 400 });
  } catch (err) {
    return handleApiError(err, "Admin Match POST");
  }
}
