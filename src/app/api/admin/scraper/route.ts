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

// Curated grant listing URLs per country (top-level listing pages for Apify to crawl)
const GRANT_SITES: Record<string, string[]> = {
  "Australia": [
    "https://business.gov.au/grants-and-programs",
    "https://www.industry.gov.au/funding-and-incentives",
    "https://www.grants.gov.au",
  ],
  "United States": [
    "https://www.grants.gov/search-grants",
    "https://www.sba.gov/funding-programs/grants",
    "https://www.usda.gov/topics/farming/grants-and-loans",
  ],
  "United Kingdom": [
    "https://www.gov.uk/business-finance-support",
    "https://www.ukri.org/opportunity",
    "https://www.innovateukedge.ukri.org/funding-opportunities",
  ],
  "Canada": [
    "https://innovation.ised-isde.canada.ca/innovation/s/list-liste",
    "https://www.canada.ca/en/services/business/grants.html",
  ],
  "New Zealand": [
    "https://www.business.govt.nz/government-help/support-and-grants/",
    "https://www.callaghaninnovation.govt.nz/funding/",
  ],
  "Ireland": [
    "https://enterprise.gov.ie/en/what-we-do/supports-for-smes/",
    "https://www.enterprise-ireland.com/en/funding-supports/",
  ],
  "Germany": [
    "https://www.foerderdatenbank.de/FDB/Content/EN/Foerderprogramme/foerderprogramme-liste.html",
  ],
  "Netherlands": [
    "https://www.rvo.nl/subsidies-financiering",
  ],
  "Singapore": [
    "https://www.enterprisesg.gov.sg/financial-assistance/grants",
    "https://www.nrf.gov.sg/funding-grants",
  ],
  "India": [
    "https://www.startupindia.gov.in/content/sih/en/funding.html",
    "https://dst.gov.in/scientific-programmes/s-t-and-socio-economic-development/seed",
  ],
  "South Africa": [
    "https://www.dsbd.gov.za/incentives/",
    "https://www.thedtic.gov.za/financial-and-non-financial-support/incentives/",
  ],
  "Kenya": [
    "https://www.industrialization.go.ke/index.php/grants-incentives",
  ],
  "Nigeria": [
    "https://www.smedan.gov.ng/grants/",
  ],
  "Global": [
    "https://www.ifc.org/en/projects-and-partnerships/funding",
    "https://www.worldbank.org/en/programs/grants",
    "https://sdgs.un.org/partnerships",
  ],
};

function getGrantSites(country: string, industry?: string): string[] {
  const sites = GRANT_SITES[country] ?? GRANT_SITES["Global"] ?? [];
  // For industry-specific queries, industry filtering is done by OpenAI at parse time
  void industry;
  return sites;
}

// Poll Apify run until finished (max ~90 seconds)
async function waitForApifyRun(runId: string, apifyToken: string): Promise<boolean> {
  const maxAttempts = 18;
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const res = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${apifyToken}`);
    if (!res.ok) return false;
    const data = await res.json();
    const status = data?.data?.status;
    if (status === "SUCCEEDED") return true;
    if (status === "FAILED" || status === "ABORTED" || status === "TIMED-OUT") return false;
  }
  return false; // timed out waiting
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

// POST /api/admin/scraper — crawl curated grant sites via Apify then parse with OpenAI
export async function POST(req: NextRequest) {
  try {
    const { response: authError } = await requireAdminAuth();
    if (authError) return authError;

    const apifyToken = process.env.APIFY_API_TOKEN;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (!apifyToken) return NextResponse.json({ error: "Apify API token not configured" }, { status: 500 });
    if (!openaiKey) return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 });

    const { country, industry, maxResults = 20, preview = false } = await req.json();
    if (!country) return NextResponse.json({ error: "country is required" }, { status: 400 });

    const startUrls = getGrantSites(country, industry);
    const sitesLabel = startUrls.map((u) => new URL(u).hostname).join(", ");

    // --- Step 1: Start Apify Website Content Crawler run ---
    const apifyInput = {
      startUrls: startUrls.map((url) => ({ url })),
      maxCrawlDepth: 1,
      maxCrawlPages: 30,
      crawlerType: "cheerio",
      outputFormats: ["markdown"],
      removeCookieWarnings: true,
      removeElementsCssSelector: "nav, header, footer, .cookie-banner, .ads, script, style",
      maxSessionRotations: 0,
    };

    const startRes = await fetch(
      `https://api.apify.com/v2/acts/apify~website-content-crawler/runs?token=${apifyToken}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(apifyInput),
      }
    );

    if (!startRes.ok) {
      const errText = await startRes.text();
      return NextResponse.json({ error: `Apify start failed (${startRes.status}): ${errText.slice(0, 300)}` }, { status: 502 });
    }

    const startData = await startRes.json();
    const runId: string = startData?.data?.id;
    if (!runId) return NextResponse.json({ error: "Apify did not return a run ID" }, { status: 502 });

    // --- Step 2: Wait for run to complete ---
    const succeeded = await waitForApifyRun(runId, apifyToken);
    if (!succeeded) {
      return NextResponse.json({ error: "Apify crawl timed out or failed. Try again or reduce max results." }, { status: 502 });
    }

    // --- Step 3: Fetch dataset items ---
    const datasetRes = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${apifyToken}&limit=30&fields=url,markdown,text`
    );
    if (!datasetRes.ok) {
      return NextResponse.json({ error: "Failed to fetch Apify results" }, { status: 502 });
    }

    const datasetItems: Array<{ url?: string; markdown?: string; text?: string }> = await datasetRes.json();

    if (!datasetItems || datasetItems.length === 0) {
      return NextResponse.json({ error: "Apify returned no content. The sites may have blocked the crawler." }, { status: 502 });
    }

    // Combine crawled content — take up to 12000 chars per page, total ~24000 chars
    const crawledContent = datasetItems
      .map((item) => {
        const content = item.markdown || item.text || "";
        return `\n\n--- SOURCE: ${item.url ?? "unknown"} ---\n${content.slice(0, 12000)}`;
      })
      .join("")
      .slice(0, 24000);

    // --- Step 4: Parse grants from crawled content with OpenAI ---
    const year = new Date().getFullYear();
    const industryClause = industry ? ` focused on ${industry}` : "";
    const systemPrompt = `You are a grant data extraction specialist. Given raw crawled content from government and foundation grant websites, extract all distinct grant opportunities you can identify.

For each grant return a JSON object with:
- title: the full official grant name
- url: the direct URL to that specific grant page (use the SOURCE URL as base if individual grant URL not visible)
- description: 2-3 sentence summary of what the grant funds
- amount: funding amount or range if mentioned (e.g. "Up to $50,000"), or null
- deadline: application closing date if mentioned, or null
- eligibility: brief description of who can apply, or null
- country: "${country}"
- industry: the primary sector this grant targets

Return ONLY a valid JSON array of grant objects. No markdown, no explanation. Aim for ${maxResults} grants${industryClause}.`;

    const userPrompt = `Extract all grant opportunities from this crawled content from grant websites in ${country} (${year}):\n\n${crawledContent}`;

    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.1,
        max_tokens: 4000,
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      return NextResponse.json({ error: `OpenAI error (${aiRes.status}): ${errText.slice(0, 300)}` }, { status: 502 });
    }

    const aiData = await aiRes.json();
    const rawText: string = aiData.choices?.[0]?.message?.content?.trim() ?? "";

    let grants: GrantResult[] = [];
    try {
      const cleaned = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(cleaned);
      grants = Array.isArray(parsed) ? parsed : [];
    } catch {
      return NextResponse.json({
        error: "Failed to parse AI response as JSON",
        raw: rawText.slice(0, 500),
      }, { status: 502 });
    }

    grants = grants.filter((g) => g.title && g.url).slice(0, maxResults);

    // Mark which already exist in DB
    const urls = grants.map((g) => g.url);
    const { data: existing } = await db.from("PublicGrant").select("url").in("url", urls);
    const existingUrls = new Set((existing ?? []).map((r: { url: string }) => r.url));
    const withExists = grants.map((g) => ({ ...g, alreadyExists: existingUrls.has(g.url) }));

    const queryLabel = `Crawled ${startUrls.length} grant site${startUrls.length !== 1 ? "s" : ""} (${sitesLabel}) for ${country}${industry ? ` · ${industry}` : ""}`;

    if (preview) {
      return NextResponse.json({ success: true, preview: true, query: queryLabel, results: withExists });
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
