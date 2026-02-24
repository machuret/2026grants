export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminAuth, handleApiError } from "@/lib/apiHelpers";

// PUT /api/admin/scraper — commit selected previewed results to DB
export async function PUT(req: NextRequest) {
  try {
    const { response: authError } = await requireAdminAuth();
    if (authError) return authError;

    const { country, industry, results } = await req.json() as {
      country: string;
      industry?: string;
      results: Array<{ title: string; url: string; description: string }>;
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
        country,
        industry: industry || null,
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

// POST /api/admin/scraper — scrape grants via Apify by country + industry
export async function POST(req: NextRequest) {
  try {
    const { appUser, response: authError } = await requireAdminAuth();
    if (authError) return authError;

    const apiKey = process.env.APIFY_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "Apify API key not configured" }, { status: 500 });

    const { country, industry, maxResults = 20, preview = false } = await req.json();
    if (!country) return NextResponse.json({ error: "country is required" }, { status: 400 });

    // Use Apify Google Search Scraper to find grants
    const searchQuery = `${industry ? industry + " " : ""}grants funding opportunities ${country} ${new Date().getFullYear()}`;

    const runRes = await fetch("https://api.apify.com/v2/acts/apify~google-search-scraper/run-sync-get-dataset-items?token=" + apiKey, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        queries: searchQuery,
        maxPagesPerQuery: 2,
        resultsPerPage: Math.min(maxResults, 50),
        languageCode: "",
        mobileResults: false,
        includeUnfilteredResults: false,
      }),
    });

    if (!runRes.ok) {
      const errText = await runRes.text();
      return NextResponse.json({ error: `Apify error (${runRes.status}): ${errText.slice(0, 200)}` }, { status: 502 });
    }

    const results = await runRes.json();

    // Extract organic results from Apify response
    const organicResults = Array.isArray(results)
      ? results.flatMap((page: { organicResults?: Array<{ title?: string; url?: string; description?: string }> }) =>
          (page.organicResults ?? []).map((r) => ({
            title: r.title ?? "",
            url: r.url ?? "",
            description: r.description ?? "",
          }))
        )
      : [];

    // Filter out irrelevant results and deduplicate by URL
    const seen = new Set<string>();
    const filtered = organicResults.filter((r) => {
      if (!r.title || !r.url || seen.has(r.url)) return false;
      seen.add(r.url);
      return true;
    }).slice(0, maxResults);

    // Preview mode: return results without saving
    if (preview) {
      // Mark which URLs already exist in DB
      const urls = filtered.map((r) => r.url);
      const { data: existing } = await db.from("PublicGrant").select("url").in("url", urls);
      const existingUrls = new Set((existing ?? []).map((r: { url: string }) => r.url));
      return NextResponse.json({
        success: true,
        preview: true,
        query: searchQuery,
        results: filtered.map((r) => ({ ...r, alreadyExists: existingUrls.has(r.url) })),
      });
    }

    // Save to PublicGrant table as 'scraped' status
    let inserted = 0;
    for (const result of filtered) {
      // Skip if URL already exists
      const { data: existing } = await db
        .from("PublicGrant")
        .select("id")
        .eq("url", result.url)
        .maybeSingle();

      if (existing) continue;

      const { error } = await db.from("PublicGrant").insert({
        name: result.title,
        url: result.url,
        description: result.description,
        sourceUrl: result.url,
        country,
        industry: industry || null,
        status: "scraped",
        enriched: false,
        scrapedRaw: result,
      });

      if (!error) inserted++;
    }

    return NextResponse.json({
      success: true,
      query: searchQuery,
      found: filtered.length,
      inserted,
      skippedDuplicates: filtered.length - inserted,
    });
  } catch (err) {
    return handleApiError(err, "Admin Scraper");
  }
}
