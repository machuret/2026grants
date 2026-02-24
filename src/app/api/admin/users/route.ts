export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminAuth, handleApiError } from "@/lib/apiHelpers";

// GET /api/admin/users — list all users (admin only)
export async function GET() {
  try {
    const { response: authError } = await requireAdminAuth();
    if (authError) return authError;

    const { data, error } = await db
      .from("User")
      .select('*, "Company":companyId(id, name)')
      .order("createdAt", { ascending: false });

    if (error) throw new Error(error.message);
    return NextResponse.json({ users: data ?? [] });
  } catch (err) {
    return handleApiError(err, "Admin Users GET");
  }
}

// PATCH /api/admin/users — update a user's role, active status, or companyId
export async function PATCH(req: NextRequest) {
  try {
    const { appUser, response: authError } = await requireAdminAuth();
    if (authError) return authError;

    const { userId, role, active, name, companyId } = await req.json();
    if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });

    // Prevent editing yourself to a lower role
    if (userId === appUser!.id && role && role !== appUser!.role) {
      return NextResponse.json({ error: "Cannot change your own role" }, { status: 400 });
    }

    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (role !== undefined) updates.role = role;
    if (active !== undefined) updates.active = active;
    if (name !== undefined) updates.name = name;
    if (companyId !== undefined) updates.companyId = companyId;

    const { data, error } = await db
      .from("User")
      .update(updates)
      .eq("id", userId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return NextResponse.json({ success: true, user: data });
  } catch (err) {
    return handleApiError(err, "Admin Users PATCH");
  }
}
