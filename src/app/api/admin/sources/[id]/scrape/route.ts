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

// POST /api/admin/sources/[id]/scrape — use OpenAI web search to find actual grants from this source
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { response: authError } = await requireAdminAuth();
    if (authError) return authError;

    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 });

    const { maxResults = 20 } = await req.json().catch(() => ({}));

    // Fetch the source record
    const { data: source, error: fetchErr } = await db
      .from("GrantSource")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (fetchErr || !source) {
      return NextResponse.json({ error: "Source not found" }, { status: 404 });
    }

    if (source.status !== "learned") {
      return NextResponse.json({ error: "Source must be learned before scraping. Click Learn first." }, { status: 400 });
    }

    const ss = source.siteStructure as {
      grantListUrl?: string;
      scrapingStrategy?: string;
      keyFields?: string[];
    } | null;

    const targetUrl = ss?.grantListUrl || source.grantListUrl || source.url;
    const industryClause = source.industry ? `${source.industry} ` : "";
    const countryClause = source.country ? ` in ${source.country}` : "";
    const year = new Date().getFullYear();

    const prompt = `Go to ${targetUrl} and find up to ${maxResults} individual grant opportunities listed on that website.

This is the official website for: ${source.name}${source.description ? ` — ${source.description}` : ""}.
${ss?.scrapingStrategy ? `Site structure note: ${ss.scrapingStrategy}` : ""}

For each grant found, return a JSON array. Each item must have:
- title: the full official grant name
- url: the direct URL to that specific grant's page on ${new URL(source.url).hostname} (not the listing page itself)
- description: 2-3 sentence summary of what the grant funds
- amount: funding amount or range (e.g. "Up to $50,000") — use "Not specified" if unknown
- deadline: closing date if shown — use "Ongoing" or "Not specified" if unknown
- eligibility: who can apply (brief)
- country: "${source.country || "Not specified"}"
- industry: "${source.industry || industryClause.trim() || "Various"}"

Return ONLY a valid JSON array. No markdown. No commentary. Only return grants that are actual funding opportunities${countryClause} for ${year} or later.`;

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

    // Extract text from Responses API output
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
      return NextResponse.json({ error: "Failed to parse AI response", raw: textContent.slice(0, 500) }, { status: 502 });
    }

    grants = grants.filter((g) => g.title && g.url).slice(0, maxResults);

    // Mark which already exist in DB
    const urls = grants.map((g) => g.url);
    const { data: existing } = await db.from("PublicGrant").select("url").in("url", urls);
    const existingUrls = new Set((existing ?? []).map((r: { url: string }) => r.url));

    return NextResponse.json({
      success: true,
      sourceId: id,
      sourceName: source.name,
      targetUrl,
      results: grants.map((g) => ({ ...g, alreadyExists: existingUrls.has(g.url) })),
    });
  } catch (err) {
    return handleApiError(err, "Source Scrape");
  }
}

// PUT /api/admin/sources/[id]/scrape — commit selected results to DB
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { response: authError } = await requireAdminAuth();
    if (authError) return authError;

    const { results } = await req.json() as {
      results: Array<{ title: string; url: string; description: string }>;
    };

    if (!Array.isArray(results) || results.length === 0) {
      return NextResponse.json({ error: "No results provided" }, { status: 400 });
    }

    // Fetch source for country/industry metadata
    const { data: source } = await db.from("GrantSource").select("country,industry").eq("id", id).maybeSingle();

    let inserted = 0;
    for (const result of results) {
      const { data: existing } = await db.from("PublicGrant").select("id").eq("url", result.url).maybeSingle();
      if (existing) continue;
      const { error } = await db.from("PublicGrant").insert({
        name: result.title,
        url: result.url,
        description: result.description,
        sourceUrl: result.url,
        country: source?.country || null,
        industry: source?.industry || null,
        status: "scraped",
        enriched: false,
        scrapedRaw: result,
      });
      if (!error) inserted++;
    }

    // Update source stats
    await db.from("GrantSource").update({
      grantsFound: inserted,
      lastScrapedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }).eq("id", id);

    return NextResponse.json({ success: true, inserted, skippedDuplicates: results.length - inserted });
  } catch (err) {
    return handleApiError(err, "Source Scrape PUT");
  }
}
