export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, handleApiError } from "@/lib/apiHelpers";

export async function POST(req: NextRequest) {
  try {
    const { response: authError } = await requireAuth();
    if (authError) return authError;

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 });

    const { query, region } = await req.json();
    if (!query) return NextResponse.json({ error: "query is required" }, { status: 400 });

    const regionContext = region ? ` Focus on grants available in ${region}.` : "";

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a grant research specialist. When asked to find grants, return a JSON array of grant opportunities. Each grant object must have these fields: name (string), founder (string - the organisation offering the grant), url (string - the grant's webpage URL if known, or empty string), amount (string - funding amount or range), deadlineDate (string - ISO date or empty), geographicScope (string), eligibility (string - brief eligibility criteria). Return ONLY the JSON array, no other text. Return 5-10 relevant results.`,
          },
          {
            role: "user",
            content: `Find grant opportunities matching: "${query}".${regionContext} Return results as a JSON array.`,
          },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) return NextResponse.json({ error: "AI returned empty response" }, { status: 502 });

    try {
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const results = JSON.parse(cleaned);
      return NextResponse.json({ results: Array.isArray(results) ? results : [] });
    } catch {
      return NextResponse.json({ error: "Failed to parse AI response" }, { status: 502 });
    }
  } catch (err) {
    return handleApiError(err, "Grant Search");
  }
}
