export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminAuth, handleApiError } from "@/lib/apiHelpers";

// GET /api/admin/grants — list all public grants (admin view)
export async function GET(req: NextRequest) {
  try {
    const { response: authError } = await requireAdminAuth();
    if (authError) return authError;

    const p = req.nextUrl.searchParams;
    const status = p.get("status") ?? "all";
    const country = p.get("country") ?? "";
    const industry = p.get("industry") ?? "";

    let query = db
      .from("PublicGrant")
      .select("*")
      .order("createdAt", { ascending: false });

    if (status !== "all") query = query.eq("status", status);
    if (country) query = query.ilike("country", `%${country}%`);
    if (industry) query = query.ilike("industry", `%${industry}%`);

    const { data, error } = await query.limit(200);

    if (error) throw new Error(error.message);
    return NextResponse.json({ grants: data ?? [] });
  } catch (err) {
    return handleApiError(err, "Admin Grants GET");
  }
}

// DELETE /api/admin/grants — delete a public grant
export async function DELETE(req: NextRequest) {
  try {
    const { response: authError } = await requireAdminAuth();
    if (authError) return authError;

    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const { error } = await db.from("PublicGrant").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err, "Admin Grants DELETE");
  }
}
