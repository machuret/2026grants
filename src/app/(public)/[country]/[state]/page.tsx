export const dynamic = "force-dynamic";
import { Metadata } from "next";
import { db } from "@/lib/db";
import { toPathSegment } from "@/lib/slugify";

interface Props {
  params: Promise<{ country: string; state: string }>;
}

async function getIndustries(country: string, state: string) {
  const { data } = await db
    .from("PublicGrant")
    .select("industry")
    .eq("published", true)
    .eq("enriched", true)
    .ilike("country", country.replace(/-/g, " "))
    .ilike("state", state.replace(/-/g, " "))
    .not("industry", "is", null);

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const k = row.industry ?? "Other";
    counts[k] = (counts[k] ?? 0) + 1;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { country, state } = await params;
  const label = `${state.replace(/-/g, " ")}, ${country.replace(/-/g, " ")}`;
  return {
    title: `Grants in ${label} — GrantsHub`,
    description: `Browse grant opportunities available in ${label} by industry.`,
  };
}

export default async function StateListingPage({ params }: Props) {
  const { country, state } = await params;
  const industries = await getIndustries(country, state);
  const countryLabel = country.replace(/-/g, " ");
  const stateLabel = state.replace(/-/g, " ");

  return (
    <div>
      <nav className="mb-6 flex items-center gap-1.5 text-sm text-gray-500 capitalize">
        <a href="/grants-directory" className="hover:text-brand-600">Grants</a>
        <span className="text-gray-300">/</span>
        <a href={`/${country}`} className="hover:text-brand-600">{countryLabel}</a>
        <span className="text-gray-300">/</span>
        <span className="text-gray-700 font-medium">{stateLabel}</span>
      </nav>

      <h1 className="text-3xl font-bold text-gray-900 capitalize mb-1">Grants in {stateLabel}</h1>
      <p className="text-gray-500 mb-8 capitalize">{countryLabel} — Browse by industry</p>

      {industries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 py-20 text-center">
          <p className="text-gray-400">No grants found for this state yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {industries.map(([industry, count]) => (
            <a
              key={industry}
              href={`/${country}/${state}/${toPathSegment(industry)}`}
              className="rounded-2xl border border-gray-200 bg-white p-6 hover:border-brand-300 hover:shadow-sm transition-all group"
            >
              <h2 className="text-lg font-semibold text-gray-900 capitalize group-hover:text-brand-600">{industry}</h2>
              <p className="mt-1 text-sm text-gray-500">{count} grant{count !== 1 ? "s" : ""}</p>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
