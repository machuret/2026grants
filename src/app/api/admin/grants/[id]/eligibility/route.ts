export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminAuth, handleApiError } from "@/lib/apiHelpers";

// GET /api/admin/grants/[id]/eligibility — list rules for a grant
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { response: authError } = await requireAdminAuth();
    if (authError) return authError;
    const { id } = await params;
    const { data, error } = await db
      .from("GrantEligibilityRule")
      .select("*")
      .eq("publicGrantId", id)
      .order("isMandatory", { ascending: false })
      .order("createdAt", { ascending: true });
    if (error) throw new Error(error.message);
    return NextResponse.json({ rules: data ?? [] });
  } catch (err) {
    return handleApiError(err, "Eligibility GET");
  }
}

// POST /api/admin/grants/[id]/eligibility — add a rule
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { response: authError } = await requireAdminAuth();
    if (authError) return authError;
    const { id } = await params;
    const body = await req.json();
    const { field, operator, value, valueType, isMandatory, confidenceLevel, evidenceText, notes } = body;
    if (!field) return NextResponse.json({ error: "field is required" }, { status: 400 });
    const { data, error } = await db
      .from("GrantEligibilityRule")
      .insert({ publicGrantId: id, field, operator: operator ?? "eq", value, valueType: valueType ?? "string", isMandatory: isMandatory ?? true, confidenceLevel: confidenceLevel ?? "certain", evidenceText, notes })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ success: true, rule: data });
  } catch (err) {
    return handleApiError(err, "Eligibility POST");
  }
}

// PATCH /api/admin/grants/[id]/eligibility — update a rule
export async function PATCH(
  req: NextRequest,
  _ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { response: authError } = await requireAdminAuth();
    if (authError) return authError;
    const body = await req.json();
    const { ruleId, ...updates } = body;
    if (!ruleId) return NextResponse.json({ error: "ruleId required" }, { status: 400 });
    const { data, error } = await db
      .from("GrantEligibilityRule")
      .update({ ...updates, updatedAt: new Date().toISOString() })
      .eq("id", ruleId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ success: true, rule: data });
  } catch (err) {
    return handleApiError(err, "Eligibility PATCH");
  }
}

// DELETE /api/admin/grants/[id]/eligibility?ruleId=xxx
export async function DELETE(
  req: NextRequest,
  _ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { response: authError } = await requireAdminAuth();
    if (authError) return authError;
    const ruleId = req.nextUrl.searchParams.get("ruleId");
    if (!ruleId) return NextResponse.json({ error: "ruleId required" }, { status: 400 });
    const { error } = await db.from("GrantEligibilityRule").delete().eq("id", ruleId);
    if (error) throw new Error(error.message);
    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err, "Eligibility DELETE");
  }
}
