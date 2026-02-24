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

    const { data } = await db
      .from("GrantProfile")
      .select("*")
      .eq("companyId", companyId)
      .maybeSingle();

    return NextResponse.json({ profile: data });
  } catch (err) {
    return handleApiError(err, "Grant Profile GET");
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { user, response: authError } = await requireAuth();
    if (authError) return authError;
    const companyId = await getCompanyId(user!.id);

    const body = await req.json();

    const { data: existing } = await db
      .from("GrantProfile")
      .select("id")
      .eq("companyId", companyId)
      .maybeSingle();

    if (existing) {
      const { error } = await db
        .from("GrantProfile")
        .update({ ...body, updatedAt: new Date().toISOString() })
        .eq("companyId", companyId);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await db
        .from("GrantProfile")
        .insert({ ...body, companyId });
      if (error) throw new Error(error.message);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err, "Grant Profile PUT");
  }
}
