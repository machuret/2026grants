export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminAuth, handleApiError } from "@/lib/apiHelpers";

// POST /api/admin/sources/[id]/crawl — crawl a source URL and use AI to learn its structure
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { response: authError } = await requireAdminAuth();
    if (authError) return authError;

    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey || openaiKey === "your-openai-key-here") {
      return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 });
    }

    // Fetch the source record
    const { data: source, error: fetchErr } = await db
      .from("GrantSource")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (fetchErr || !source) {
      return NextResponse.json({ error: "Source not found" }, { status: 404 });
    }

    // Mark as crawling
    await db.from("GrantSource").update({ status: "crawling", updatedAt: new Date().toISOString() }).eq("id", id);

    // Crawl the URL (try grantListUrl first, fall back to main url)
    const targetUrl = source.grantListUrl || source.url;
    let pageContent = "";
    try {
      const crawlRes = await fetch(targetUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; GrantsBot/1.0)" },
        signal: AbortSignal.timeout(15000),
      });
      const html = await crawlRes.text();
      // Strip HTML tags, keep text + links
      pageContent = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 8000);
    } catch {
      pageContent = "Could not fetch page content.";
    }

    // Use AI to analyse the site structure
    const prompt = `You are analysing a grant funding website to understand how to scrape grants from it.

Website: ${source.name}
URL: ${targetUrl}
Country: ${source.country || "Unknown"}
Industry: ${source.industry || "Various"}

Page content (truncated):
${pageContent}

Analyse this website and return a JSON object with:
{
  "grantListUrl": "the best URL to find a list of all grants (may be a /grants, /funding, /programs page)",
  "paginationPattern": "how pagination works (e.g. ?page=2, /page/2, load more button, etc.)",
  "grantLinkPattern": "how individual grant links appear (e.g. /grants/[slug], /funding/[id])",
  "keyFields": ["list of grant data fields visible on this site, e.g. name, amount, deadline, eligibility"],
  "searchFilters": ["available filter options e.g. by state, industry, amount"],
  "scrapingStrategy": "brief description of the best approach to extract grants from this site",
  "notes": "any important notes about the site structure, login requirements, or limitations"
}

Return ONLY valid JSON, no markdown.`;

    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        max_tokens: 800,
      }),
    });

    if (!aiRes.ok) {
      await db.from("GrantSource").update({ status: "error", crawlNotes: "AI request failed", updatedAt: new Date().toISOString() }).eq("id", id);
      return NextResponse.json({ error: "AI request failed" }, { status: 502 });
    }

    const aiData = await aiRes.json();
    const content = aiData.choices?.[0]?.message?.content?.trim() ?? "";

    let structure: Record<string, unknown> = {};
    try {
      structure = JSON.parse(content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
    } catch {
      structure = { raw: content };
    }

    // Save structure back to source
    const { data: updated, error: updateErr } = await db
      .from("GrantSource")
      .update({
        status: "learned",
        siteStructure: structure,
        grantListUrl: (structure.grantListUrl as string) || source.grantListUrl || source.url,
        crawlNotes: structure.scrapingStrategy as string || null,
        lastCrawledAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (updateErr) throw new Error(updateErr.message);
    return NextResponse.json({ success: true, source: updated, structure });
  } catch (err) {
    await db.from("GrantSource").update({ status: "error", updatedAt: new Date().toISOString() }).eq("id", id);
    return handleApiError(err, "Source Crawl");
  }
}
