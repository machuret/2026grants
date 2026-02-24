export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminAuth, handleApiError } from "@/lib/apiHelpers";
import { generateSlug } from "@/lib/slugify";

// PATCH /api/admin/grants/[id] — update a public grant (SEO, slug, publish, etc.)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { response: authError } = await requireAdminAuth();
    if (authError) return authError;

    const { id } = await params;
    const body = await req.json();

    // Auto-generate slug if publishing and no slug set
    if (body.published && !body.slug) {
      const { data: existing } = await db
        .from("PublicGrant")
        .select("name, country, slug")
        .eq("id", id)
        .maybeSingle();

      if (existing && !existing.slug) {
        body.slug = generateSlug(existing.name, existing.country);
      }
    }

    const updates: Record<string, unknown> = {
      ...body,
      updatedAt: new Date().toISOString(),
    };

    if (body.published && !body.publishedAt) {
      updates.publishedAt = new Date().toISOString();
    }

    const { data, error } = await db
      .from("PublicGrant")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return NextResponse.json({ success: true, grant: data });
  } catch (err) {
    return handleApiError(err, "Admin Grant PATCH");
  }
}
