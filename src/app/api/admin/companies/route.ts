export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminAuth, handleApiError } from "@/lib/apiHelpers";

// GET /api/admin/companies — list all companies (for admin dropdowns)
export async function GET() {
  try {
    const { response: authError } = await requireAdminAuth();
    if (authError) return authError;

    const { data, error } = await db
      .from("Company")
      .select("id, name")
      .order("name");

    if (error) throw new Error(error.message);
    return NextResponse.json({ companies: data ?? [] });
  } catch (err) {
    return handleApiError(err, "Admin Companies GET");
  }
}
