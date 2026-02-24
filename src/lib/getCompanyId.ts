import { db } from "@/lib/db";

const DEFAULT_COMPANY_ID = "00000000-0000-0000-0000-000000000001";

export async function getCompanyId(authUserId: string): Promise<string> {
  const { data } = await db
    .from("User")
    .select("companyId")
    .eq("authId", authUserId)
    .maybeSingle();

  return data?.companyId ?? DEFAULT_COMPANY_ID;
}

export { DEFAULT_COMPANY_ID };
