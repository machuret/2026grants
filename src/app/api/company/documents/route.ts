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
    const { data, error } = await db
      .from("DocumentInventory")
      .select("*")
      .eq("companyId", companyId)
      .order("docType");
    if (error) throw new Error(error.message);
    return NextResponse.json({ documents: data ?? [] });
  } catch (err) {
    return handleApiError(err, "Documents GET");
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { user, response: authError } = await requireAuth();
    if (authError) return authError;
    const companyId = await getCompanyId(user!.id);
    const body = await req.json();
    const { docType, available, notes, expiresAt } = body;
    if (!docType) return NextResponse.json({ error: "docType required" }, { status: 400 });

    const { data: existing } = await db
      .from("DocumentInventory")
      .select("id")
      .eq("companyId", companyId)
      .eq("docType", docType)
      .maybeSingle();

    const payload = { companyId, docType, available: available ?? false, notes: notes ?? null, expiresAt: expiresAt ?? null, updatedAt: new Date().toISOString() };

    let data, error;
    if (existing) {
      ({ data, error } = await db.from("DocumentInventory").update(payload).eq("companyId", companyId).eq("docType", docType).select().single());
    } else {
      ({ data, error } = await db.from("DocumentInventory").insert(payload).select().single());
    }

    if (error) throw new Error(error.message);
    return NextResponse.json({ success: true, document: data });
  } catch (err) {
    return handleApiError(err, "Documents PUT");
  }
}
