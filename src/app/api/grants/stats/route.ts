export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, handleApiError } from "@/lib/apiHelpers";
import { getCompanyId } from "@/lib/getCompanyId";

export async function GET() {
  try {
    const { user, response: authError } = await requireAuth();
    if (authError) return authError;
    const companyId = await getCompanyId(user!.id);

    const { data: grants } = await db
      .from("Grant")
      .select("decision, deadlineDate, crmStatus")
      .eq("companyId", companyId);

    const list = grants ?? [];
    const now = Date.now();
    const DAY = 86400000;

    return NextResponse.json({
      stats: {
        total: list.length,
        apply: list.filter((g) => g.decision === "Apply").length,
        maybe: list.filter((g) => g.decision === "Maybe").length,
        rejected: list.filter((g) => g.decision === "Rejected").length,
        closingSoon: list.filter((g) => {
          if (!g.deadlineDate) return false;
          const diff = new Date(g.deadlineDate).getTime() - now;
          return diff >= 0 && diff <= 14 * DAY;
        }).length,
        expired: list.filter((g) => {
          if (!g.deadlineDate) return false;
          return new Date(g.deadlineDate).getTime() < now;
        }).length,
        inCrm: list.filter((g) => !!g.crmStatus).length,
      },
    });
  } catch (err) {
    return handleApiError(err, "Grant Stats");
  }
}
