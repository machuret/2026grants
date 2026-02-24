export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, handleApiError } from "@/lib/apiHelpers";
import { getCompanyId } from "@/lib/getCompanyId";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1),
  founder: z.string().optional().nullable(),
  url: z.string().optional().nullable(),
  deadlineDate: z.string().optional().nullable(),
  howToApply: z.string().optional().nullable(),
  geographicScope: z.string().optional().nullable(),
  eligibility: z.string().optional().nullable(),
  amount: z.string().optional().nullable(),
  projectDuration: z.string().optional().nullable(),
  fitScore: z.number().int().min(1).max(5).optional().nullable(),
  submissionEffort: z.enum(["Low", "Medium", "High"]).optional().nullable(),
  decision: z.enum(["Apply", "Maybe", "No", "Rejected"]).optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function GET() {
  try {
    const { user, response: authError } = await requireAuth();
    if (authError) return authError;
    const companyId = await getCompanyId(user!.id);

    const { data, error } = await db
      .from("Grant")
      .select("*")
      .eq("companyId", companyId)
      .order("createdAt", { ascending: false });

    if (error) throw new Error(error.message);
    return NextResponse.json({ grants: data ?? [] });
  } catch (err) {
    return handleApiError(err, "Grants GET");
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, response: authError } = await requireAuth();
    if (authError) return authError;
    const companyId = await getCompanyId(user!.id);

    const body = await req.json();
    const data = createSchema.parse(body);

    const { data: grant, error } = await db
      .from("Grant")
      .insert({ ...data, companyId })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return NextResponse.json({ success: true, grant });
  } catch (err) {
    return handleApiError(err, "Grants POST");
  }
}
