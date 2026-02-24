import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { ZodError } from "zod";
import { createServerSupabase } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { db } from "@/lib/db";

async function getSupabaseClient() {
  const hdrs = await headers();
  const token = hdrs.get("authorization")?.replace("Bearer ", "").trim() ?? null;
  if (token) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    return { supabase, token };
  }
  return { supabase: createServerSupabase(), token: null };
}

export async function requireAuth() {
  const { supabase, token } = await getSupabaseClient();
  const { data: { user } } = token
    ? await supabase.auth.getUser(token)
    : await supabase.auth.getUser();
  if (!user) return { user: null, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  return { user, response: null };
}

export async function requireAdminAuth() {
  const { supabase, token } = await getSupabaseClient();
  const { data: { user } } = token
    ? await supabase.auth.getUser(token)
    : await supabase.auth.getUser();
  if (!user) return { user: null, appUser: null, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const { data: appUser } = await db.from("User").select("id, role, active").eq("authId", user.id).maybeSingle();
  if (!appUser || !appUser.active) return { user: null, appUser: null, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (appUser.role !== "ADMIN" && appUser.role !== "SUPER_ADMIN") {
    return { user: null, appUser: null, response: NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 }) };
  }

  return { user, appUser, response: null };
}

export function handleApiError(error: unknown, context = "API") {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "Validation failed", details: error.issues },
      { status: 400 },
    );
  }
  console.error(`[${context}]`, error instanceof Error ? error.message : error);
  const message = error instanceof Error ? error.message : "Internal server error";
  return NextResponse.json({ error: message }, { status: 500 });
}
