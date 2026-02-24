export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, handleApiError } from "@/lib/apiHelpers";
import { getCompanyId } from "@/lib/getCompanyId";

// GET /api/company/matches — all GrantMatch rows for the current company
export async function GET() {
  try {
    const { user, response: authError } = await requireAuth();
    if (authError) return authError;
    const companyId = await getCompanyId(user!.id);

    const { data, error } = await db
      .from("GrantMatch")
      .select("*")
      .eq("companyId", companyId)
      .order("overallScore", { ascending: false });

    if (error) throw new Error(error.message);
    return NextResponse.json({ matches: data ?? [] });
  } catch (err) {
    return handleApiError(err, "Company Matches GET");
  }
}
