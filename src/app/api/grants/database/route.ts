export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, handleApiError } from "@/lib/apiHelpers";

// GET /api/grants/database — list enriched public grants (visible to all users)
export async function GET(req: NextRequest) {
  try {
    const { response: authError } = await requireAuth();
    if (authError) return authError;

    const p = req.nextUrl.searchParams;
    const country = p.get("country") ?? "";
    const industry = p.get("industry") ?? "";
    const search = p.get("search") ?? "";

    let query = db
      .from("PublicGrant")
      .select("*")
      .eq("enriched", true)
      .order("createdAt", { ascending: false });

    if (country) query = query.ilike("country", `%${country}%`);
    if (industry) query = query.ilike("industry", `%${industry}%`);
    if (search) query = query.or(`name.ilike.%${search}%,founder.ilike.%${search}%,description.ilike.%${search}%`);

    const { data, error } = await query.limit(200);

    if (error) throw new Error(error.message);
    return NextResponse.json({ grants: data ?? [] });
  } catch (err) {
    return handleApiError(err, "Grants Database GET");
  }
}
