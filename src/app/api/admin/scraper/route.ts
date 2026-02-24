export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminAuth, handleApiError } from "@/lib/apiHelpers";

interface GrantResult {
  title: string;
  url: string;
  description: string;
  amount?: string;
  deadline?: string;
  eligibility?: string;
  country?: string;
  industry?: string;
}

// PUT /api/admin/scraper — commit selected previewed results to DB
export async function PUT(req: NextRequest) {
  try {
    const { response: authError } = await requireAdminAuth();
    if (authError) return authError;

    const { country, industry, results } = await req.json() as {
      country: string;
      industry?: string;
      results: GrantResult[];
    };

    if (!Array.isArray(results) || results.length === 0) {
      return NextResponse.json({ error: "No results provided" }, { status: 400 });
    }

    let inserted = 0;
    for (const result of results) {
      const { data: existing } = await db.from("PublicGrant").select("id").eq("url", result.url).maybeSingle();
      if (existing) continue;
      const { error } = await db.from("PublicGrant").insert({
        name: result.title,
        url: result.url,
        description: result.description,
        sourceUrl: result.url,
        country: result.country || country,
        industry: result.industry || industry || null,
        status: "scraped",
        enriched: false,
        scrapedRaw: result,
      });
      if (!error) inserted++;
    }

    return NextResponse.json({ success: true, inserted, skippedDuplicates: results.length - inserted });
  } catch (err) {
    return handleApiError(err, "Admin Scraper PUT");
  }
}

// POST /api/admin/scraper — use OpenAI web search to find actual grant opportunities
export async function POST(req: NextRequest) {
  try {
    const { response: authError } = await requireAdminAuth();
    if (authError) return authError;

    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 });

    const { country, industry, maxResults = 20, preview = false } = await req.json();
    if (!country) return NextResponse.json({ error: "country is required" }, { status: 400 });

    const year = new Date().getFullYear();
    const industryClause = industry ? `${industry} ` : "";
    const prompt = `Search the web and find ${maxResults} currently open or upcoming government and foundation grant opportunities for ${industryClause}organisations in ${country} in ${year}.

For each grant return a JSON array. Each item must have:
- title: full official grant name
- url: direct link to the grant page (not a search result, not a homepage)
- description: 2-3 sentence summary of what the grant funds
- amount: funding amount or range if known (e.g. "Up to $50,000" or "$10k-$500k")
- deadline: closing date if known
- eligibility: who can apply (brief)
- country: "${country}"
- industry: the primary sector

Return ONLY a valid JSON array, no markdown, no extra text. Find real grants with real URLs.`;

    const aiRes = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
      body: JSON.stringify({
        model: "gpt-4o",
        tools: [{ type: "web_search_preview" }],
        input: prompt,
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      return NextResponse.json({ error: `OpenAI error (${aiRes.status}): ${errText.slice(0, 300)}` }, { status: 502 });
    }

    const aiData = await aiRes.json();

    // Extract text content from Responses API output array
    const textContent = (aiData.output ?? [])
      .flatMap((item: { type: string; content?: Array<{ type: string; text?: string }> }) =>
        item.type === "message" ? (item.content ?? []) : []
      )
      .filter((c: { type: string }) => c.type === "output_text")
      .map((c: { text?: string }) => c.text ?? "")
      .join("");

    let grants: GrantResult[] = [];
    try {
      const cleaned = textContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(cleaned);
      grants = Array.isArray(parsed) ? parsed : [];
    } catch {
      return NextResponse.json({ error: "Failed to parse AI response as JSON", raw: textContent.slice(0, 500) }, { status: 502 });
    }

    grants = grants.filter((g) => g.title && g.url).slice(0, maxResults);

    // Mark which already exist in DB
    const urls = grants.map((g) => g.url);
    const { data: existing } = await db.from("PublicGrant").select("url").in("url", urls);
    const existingUrls = new Set((existing ?? []).map((r: { url: string }) => r.url));
    const withExists = grants.map((g) => ({ ...g, alreadyExists: existingUrls.has(g.url) }));

    if (preview) {
      return NextResponse.json({ success: true, preview: true, query: prompt.split("\n")[0], results: withExists });
    }

    let inserted = 0;
    for (const grant of grants) {
      const { data: dup } = await db.from("PublicGrant").select("id").eq("url", grant.url).maybeSingle();
      if (dup) continue;
      const { error } = await db.from("PublicGrant").insert({
        name: grant.title,
        url: grant.url,
        description: grant.description,
        sourceUrl: grant.url,
        country: grant.country || country,
        industry: grant.industry || industry || null,
        status: "scraped",
        enriched: false,
        scrapedRaw: grant,
      });
      if (!error) inserted++;
    }

    return NextResponse.json({ success: true, found: grants.length, inserted, skippedDuplicates: grants.length - inserted });
  } catch (err) {
    return handleApiError(err, "Admin Scraper");
  }
}
