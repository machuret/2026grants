export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, handleApiError } from "@/lib/apiHelpers";
import { getCompanyId } from "@/lib/getCompanyId";

export async function GET() {
  try {
    const { user, response: authError } = await requireAuth();
    if (authError) return authError;
    const companyId = await getCompanyId(user!.id);

    const [{ data: company }, { data: info }] = await Promise.all([
      db.from("Company").select("*").eq("id", companyId).maybeSingle(),
      db.from("CompanyInfo").select("*").eq("companyId", companyId).maybeSingle(),
    ]);

    return NextResponse.json({ company, info });
  } catch (err) {
    return handleApiError(err, "Company GET");
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { user, response: authError } = await requireAuth();
    if (authError) return authError;
    const companyId = await getCompanyId(user!.id);

    const body = await req.json();
    const { company: companyFields, info: infoFields } = body;

    if (companyFields) {
      const { error } = await db
        .from("Company")
        .update({ ...companyFields, updatedAt: new Date().toISOString() })
        .eq("id", companyId);
      if (error) throw new Error(error.message);
    }

    if (infoFields) {
      const { data: existing } = await db
        .from("CompanyInfo")
        .select("id")
        .eq("companyId", companyId)
        .maybeSingle();

      if (existing) {
        const { error } = await db
          .from("CompanyInfo")
          .update({ ...infoFields, updatedAt: new Date().toISOString() })
          .eq("companyId", companyId);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await db
          .from("CompanyInfo")
          .insert({ ...infoFields, companyId });
        if (error) throw new Error(error.message);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err, "Company PUT");
  }
}
