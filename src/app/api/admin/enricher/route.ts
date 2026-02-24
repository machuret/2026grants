export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminAuth, handleApiError } from "@/lib/apiHelpers";
import { generateSlug } from "@/lib/slugify";

// POST /api/admin/enricher — enrich a single grant with AI (crawl URL + GPT)
export async function POST(req: NextRequest) {
  try {
    const { appUser, response: authError } = await requireAdminAuth();
    if (authError) return authError;

    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey || openaiKey === "your-openai-key-here") {
      return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 });
    }

    const { grantId } = await req.json();
    if (!grantId) return NextResponse.json({ error: "grantId is required" }, { status: 400 });

    const { data: grant } = await db
      .from("PublicGrant")
      .select("*")
      .eq("id", grantId)
      .maybeSingle();

    if (!grant) return NextResponse.json({ error: "Grant not found" }, { status: 404 });

    // Try to fetch the URL content for more context
    let pageContent = "";
    if (grant.url) {
      try {
        const pageRes = await fetch(grant.url, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; GrantsHub/1.0)" },
          signal: AbortSignal.timeout(10000),
        });
        if (pageRes.ok) {
          const html = await pageRes.text();
          // Strip HTML tags for plain text
          pageContent = html
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 8000);
        }
      } catch {
        // ignore fetch errors
      }
    }

    const prompt = `You are a grant research specialist. Analyze the following grant information and extract/enrich all relevant details.

Grant Name: ${grant.name}
URL: ${grant.url || "N/A"}
Description: ${grant.description || "N/A"}
Country: ${grant.country || "N/A"}
Industry: ${grant.industry || "N/A"}

${pageContent ? `Webpage Content:\n${pageContent}` : ""}

Return a JSON object with these fields (use null for unknown):
{
  "name": "cleaned/full grant name",
  "founder": "organisation offering this grant",
  "description": "2-3 sentence description of the grant",
  "eligibility": "who can apply",
  "amount": "funding amount or range",
  "deadlineDate": "YYYY-MM-DD format or null",
  "howToApply": "application process",
  "requirements": "key requirements",
  "geographicScope": "eligible regions/countries",
  "projectDuration": "project duration if specified",
  "contactInfo": "contact details if available",
  "industry": "primary industry/sector"
}

Return ONLY the JSON object.`;

    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        max_tokens: 1500,
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      return NextResponse.json({ error: `OpenAI error: ${errText.slice(0, 200)}` }, { status: 502 });
    }

    const aiData = await aiRes.json();
    const content = aiData.choices?.[0]?.message?.content?.trim();
    if (!content) return NextResponse.json({ error: "AI returned empty response" }, { status: 502 });

    let enriched;
    try {
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      enriched = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ error: "Failed to parse AI response" }, { status: 502 });
    }

    // Update the grant with enriched data
    const updates: Record<string, unknown> = {
      enriched: true,
      enrichedAt: new Date().toISOString(),
      enrichedBy: appUser!.id,
      status: "enriched",
      updatedAt: new Date().toISOString(),
    };

    // Only overwrite fields that AI returned non-null values for
    const fields = ["name", "founder", "description", "eligibility", "amount", "deadlineDate",
      "howToApply", "requirements", "geographicScope", "projectDuration", "contactInfo", "industry"];
    for (const f of fields) {
      if (enriched[f] !== null && enriched[f] !== undefined && enriched[f] !== "") {
        updates[f] = enriched[f];
      }
    }

    // Auto-generate slug if not already set
    if (!grant.slug) {
      const nameForSlug = (enriched.name as string | undefined) || grant.name;
      const countryForSlug = (enriched.country as string | undefined) || grant.country;
      updates.slug = generateSlug(nameForSlug, countryForSlug);
    }

    const { data: updated, error } = await db
      .from("PublicGrant")
      .update(updates)
      .eq("id", grantId)
      .select()
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true, grant: updated });
  } catch (err) {
    return handleApiError(err, "Admin Enricher");
  }
}
