export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminAuth, handleApiError } from "@/lib/apiHelpers";

// POST /api/admin/sources/[id]/scrape — scrape grants from a learned source via Apify
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { response: authError } = await requireAdminAuth();
    if (authError) return authError;

    const apiKey = process.env.APIFY_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "Apify API key not configured" }, { status: 500 });

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
      paginationPattern?: string;
      grantLinkPattern?: string;
      scrapingStrategy?: string;
    } | null;

    // Build the target URL — prefer the learned grant list URL
    const targetUrl = ss?.grantListUrl || source.grantListUrl || source.url;

    // Build a focused search query using the site's domain + grant terms
    const domain = new URL(source.url).hostname.replace("www.", "");
    const searchQuery = `site:${domain} ${source.industry ? source.industry + " " : ""}grants funding ${source.country || ""}`.trim();

    // Run Apify Google Search Scraper focused on this domain
    const runRes = await fetch(
      "https://api.apify.com/v2/acts/apify~google-search-scraper/run-sync-get-dataset-items?token=" + apiKey,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          queries: searchQuery,
          maxPagesPerQuery: 3,
          resultsPerPage: Math.min(maxResults, 50),
          languageCode: "",
          mobileResults: false,
          includeUnfilteredResults: false,
        }),
      }
    );

    if (!runRes.ok) {
      const errText = await runRes.text();
      return NextResponse.json({ error: `Apify error (${runRes.status}): ${errText.slice(0, 200)}` }, { status: 502 });
    }

    const results = await runRes.json();

    // Extract organic results
    const organicResults = Array.isArray(results)
      ? results.flatMap((page: { organicResults?: Array<{ title?: string; url?: string; description?: string }> }) =>
          (page.organicResults ?? []).map((r) => ({
            title: r.title ?? "",
            url: r.url ?? "",
            description: r.description ?? "",
          }))
        )
      : [];

    // Filter to only URLs from this source's domain + deduplicate
    const seen = new Set<string>();
    const filtered = organicResults.filter((r) => {
      if (!r.title || !r.url || seen.has(r.url)) return false;
      try {
        const urlDomain = new URL(r.url).hostname.replace("www.", "");
        if (!urlDomain.includes(domain) && !domain.includes(urlDomain)) return false;
      } catch { return false; }
      seen.add(r.url);
      return true;
    }).slice(0, maxResults);

    // Mark which already exist
    const urls = filtered.map((r) => r.url);
    const { data: existing } = await db.from("PublicGrant").select("url").in("url", urls);
    const existingUrls = new Set((existing ?? []).map((r: { url: string }) => r.url));

    return NextResponse.json({
      success: true,
      sourceId: id,
      sourceName: source.name,
      targetUrl,
      searchQuery,
      results: filtered.map((r) => ({ ...r, alreadyExists: existingUrls.has(r.url) })),
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
