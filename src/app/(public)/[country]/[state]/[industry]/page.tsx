import { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { grantPublicUrl } from "@/lib/slugify";
import { DollarSign, Calendar, Globe, ExternalLink } from "lucide-react";

interface Props {
  params: Promise<{ country: string; state: string; industry: string }>;
}

async function getGrants(country: string, state: string, industry: string) {
  const { data } = await db
    .from("PublicGrant")
    .select("id,name,slug,founder,description,country,state,industry,amount,deadlineDate,url")
    .eq("published", true)
    .eq("enriched", true)
    .ilike("country", country.replace(/-/g, " "))
    .ilike("state", state.replace(/-/g, " "))
    .ilike("industry", industry.replace(/-/g, " "))
    .order("createdAt", { ascending: false })
    .limit(100);
  return data ?? [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { country, state, industry } = await params;
  const label = `${industry.replace(/-/g, " ")} grants in ${state.replace(/-/g, " ")}, ${country.replace(/-/g, " ")}`;
  return {
    title: `${label} — GrantsHub`,
    description: `Browse ${label}. Find funding opportunities curated by GrantsHub.`,
  };
}

export default async function IndustryListingPage({ params }: Props) {
  const { country, state, industry } = await params;
  const grants = await getGrants(country, state, industry);

  const countryLabel = country.replace(/-/g, " ");
  const stateLabel = state.replace(/-/g, " ");
  const industryLabel = industry.replace(/-/g, " ");

  return (
    <div>
      <nav className="mb-6 flex items-center gap-1.5 text-sm text-gray-500 capitalize">
        <a href="/grants-directory" className="hover:text-brand-600">Grants</a>
        <span className="text-gray-300">/</span>
        <a href={`/${country}`} className="hover:text-brand-600">{countryLabel}</a>
        <span className="text-gray-300">/</span>
        <a href={`/${country}/${state}`} className="hover:text-brand-600">{stateLabel}</a>
        <span className="text-gray-300">/</span>
        <span className="text-gray-700 font-medium">{industryLabel}</span>
      </nav>

      <h1 className="text-3xl font-bold text-gray-900 capitalize mb-1">
        {industryLabel} Grants in {stateLabel}
      </h1>
      <p className="text-gray-500 mb-8">{grants.length} grant{grants.length !== 1 ? "s" : ""} available in {countryLabel}</p>

      {grants.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 py-20 text-center">
          <p className="text-gray-400">No grants found for this category yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {grants.map((grant) => {
            const url = grantPublicUrl(grant);
            return (
              <div key={grant.id} className="rounded-2xl border border-gray-200 bg-white p-6 hover:border-brand-200 hover:shadow-sm transition-all">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-semibold text-gray-900">
                      {url ? <a href={url} className="hover:text-brand-600">{grant.name}</a> : grant.name}
                    </h2>
                    {grant.founder && <p className="text-sm text-gray-500 mt-0.5">{grant.founder}</p>}
                    {grant.description && <p className="text-sm text-gray-600 mt-2 line-clamp-2">{grant.description}</p>}
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      {grant.amount && <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-green-700 font-medium"><DollarSign className="h-3 w-3" />{grant.amount}</span>}
                      {grant.deadlineDate && <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-orange-700 font-medium"><Calendar className="h-3 w-3" />{grant.deadlineDate}</span>}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2 items-end">
                    {url && (
                      <a href={url} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
                        View Grant
                      </a>
                    )}
                    {grant.url && (
                      <a href={grant.url} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-400 hover:text-brand-600 flex items-center gap-1">
                        <ExternalLink className="h-3 w-3" /> Official site
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
