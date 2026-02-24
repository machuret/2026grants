export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, handleApiError } from "@/lib/apiHelpers";

export async function GET() {
  try {
    const { user, response: authError } = await requireAuth();
    if (authError) return authError;

    // Check if User record exists
    let { data: appUser } = await db
      .from("User")
      .select("*")
      .eq("authId", user!.id)
      .maybeSingle();

    // Auto-provision on first login
    if (!appUser) {
      // Create a company for this user
      const { data: company, error: companyErr } = await db
        .from("Company")
        .insert({ name: user!.email?.split("@")[0] ?? "My Organisation", industry: "" })
        .select()
        .single();

      if (companyErr) throw new Error(companyErr.message);

      // Create the user record — first user ever becomes SUPER_ADMIN
      const { count } = await db.from("User").select("id", { count: "exact", head: true });
      const isFirstUser = (count ?? 0) === 0;

      const { data: newUser, error: userErr } = await db
        .from("User")
        .insert({
          authId: user!.id,
          email: user!.email ?? "",
          name: user!.email?.split("@")[0] ?? "",
          role: isFirstUser ? "SUPER_ADMIN" : "USER",
          companyId: company.id,
          active: true,
        })
        .select()
        .single();

      if (userErr) throw new Error(userErr.message);
      appUser = newUser;
    }

    return NextResponse.json({ user: appUser });
  } catch (err) {
    return handleApiError(err, "Users Me");
  }
}
