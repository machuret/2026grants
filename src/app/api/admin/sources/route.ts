export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminAuth, handleApiError } from "@/lib/apiHelpers";

// GET /api/admin/sources
export async function GET() {
  try {
    const { response: authError } = await requireAdminAuth();
    if (authError) return authError;

    const { data, error } = await db
      .from("GrantSource")
      .select("*")
      .order("createdAt", { ascending: false });

    if (error) throw new Error(error.message);
    return NextResponse.json({ sources: data ?? [] });
  } catch (err) {
    return handleApiError(err, "Sources GET");
  }
}

// POST /api/admin/sources — create a new source
export async function POST(req: NextRequest) {
  try {
    const { response: authError } = await requireAdminAuth();
    if (authError) return authError;

    const body = await req.json();
    const { name, url, country, state, industry, description, grantListUrl } = body;

    if (!name || !url) {
      return NextResponse.json({ error: "name and url are required" }, { status: 400 });
    }

    const { data, error } = await db
      .from("GrantSource")
      .insert({
        name,
        url,
        country: country || null,
        state: state || null,
        industry: industry || null,
        description: description || null,
        grantListUrl: grantListUrl || null,
        status: "pending",
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return NextResponse.json({ success: true, source: data });
  } catch (err) {
    return handleApiError(err, "Sources POST");
  }
}

// PATCH /api/admin/sources — update a source
export async function PATCH(req: NextRequest) {
  try {
    const { response: authError } = await requireAdminAuth();
    if (authError) return authError;

    const body = await req.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const { data, error } = await db
      .from("GrantSource")
      .update({ ...updates, updatedAt: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return NextResponse.json({ success: true, source: data });
  } catch (err) {
    return handleApiError(err, "Sources PATCH");
  }
}

// DELETE /api/admin/sources
export async function DELETE(req: NextRequest) {
  try {
    const { response: authError } = await requireAdminAuth();
    if (authError) return authError;

    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const { error } = await db.from("GrantSource").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err, "Sources DELETE");
  }
}
