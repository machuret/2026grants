export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, handleApiError } from "@/lib/apiHelpers";

const SECTION_INSTRUCTIONS: Record<string, string> = {
  "Executive Summary": "Write a compelling executive summary that captures the project's purpose, approach, and expected impact. Keep it concise but persuasive.",
  "Project Description": "Describe the project in detail including the problem it addresses, the proposed solution, and why this approach is the best fit.",
  "Goals & Objectives": "List clear, measurable goals and SMART objectives that the project aims to achieve.",
  "Methodology": "Explain the methodology and approach that will be used to carry out the project, including any research methods or frameworks.",
  "Timeline & Milestones": "Provide a realistic timeline with key milestones, deliverables, and phases of the project.",
  "Budget Justification": "Justify the budget allocation, explaining how funds will be used and why each expense is necessary.",
  "Evaluation Plan": "Describe how the project's success will be measured, including key performance indicators and evaluation methods.",
  "Organisational Capability": "Highlight the organisation's track record, expertise, and capacity to deliver this project successfully.",
  "Contact Details": "Provide the primary contact person's details including name, title, email, phone, and postal address.",
};

export async function POST(req: NextRequest) {
  try {
    const { response: authError } = await requireAuth();
    if (authError) return authError;

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 });

    const { action, section, brief, tone, length, grantName } = await req.json();

    if (action === "brief") {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            { role: "system", content: "You are a grant writing specialist. Generate a comprehensive writing brief for a grant application." },
            { role: "user", content: `Create a writing brief for the grant "${grantName}". Tone: ${tone}. Length: ${length}. Include key themes, talking points, and structure recommendations.` },
          ],
          temperature: 0.7,
          max_tokens: 800,
        }),
      });
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content?.trim();
      if (!content) return NextResponse.json({ error: "AI returned empty response" }, { status: 502 });
      return NextResponse.json({ brief: content });
    }

    if (action === "section") {
      const instructions = SECTION_INSTRUCTIONS[section] || `Write the "${section}" section of a grant application.`;
      const wordTarget = length === "short" ? "150-250" : length === "long" ? "400-600" : "250-400";

      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            { role: "system", content: `You are a grant writing specialist. Write in a ${tone.toLowerCase()} tone. Target ${wordTarget} words.` },
            { role: "user", content: `Write the "${section}" section for the grant "${grantName}".\n\nInstructions: ${instructions}\n\nWriting Brief:\n${brief}` },
          ],
          temperature: 0.7,
          max_tokens: 1200,
        }),
      });
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content?.trim();
      if (!content) return NextResponse.json({ error: "AI returned empty response" }, { status: 502 });
      return NextResponse.json({ content });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    return handleApiError(err, "Grant Write");
  }
}
