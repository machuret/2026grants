export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/public/grants — list published grants, optionally filtered by country/state/industry
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const country = p.get("country") ?? "";
  const state = p.get("state") ?? "";
  const industry = p.get("industry") ?? "";

  let query = db
    .from("PublicGrant")
    .select("id,name,slug,founder,description,country,state,industry,amount,deadlineDate,geographicScope,eligibility,url,seoTitle,seoDescription")
    .eq("published", true)
    .eq("enriched", true)
    .order("createdAt", { ascending: false });

  if (country) query = query.ilike("country", country);
  if (state) query = query.ilike("state", state);
  if (industry) query = query.ilike("industry", industry);

  const { data, error } = await query.limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ grants: data ?? [] });
}
