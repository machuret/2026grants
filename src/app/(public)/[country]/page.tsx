export const dynamic = "force-dynamic";
import { Metadata } from "next";
import { db } from "@/lib/db";
import { toPathSegment } from "@/lib/slugify";

interface Props {
  params: Promise<{ country: string }>;
}

async function getStates(country: string) {
  const { data } = await db
    .from("PublicGrant")
    .select("state, industry")
    .eq("published", true)
    .eq("enriched", true)
    .ilike("country", country.replace(/-/g, " "))
    .not("state", "is", null);

  const stateCounts: Record<string, number> = {};
  for (const row of data ?? []) {
    const k = row.state ?? "Other";
    stateCounts[k] = (stateCounts[k] ?? 0) + 1;
  }
  return Object.entries(stateCounts).sort((a, b) => b[1] - a[1]);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { country } = await params;
  const label = country.replace(/-/g, " ");
  return {
    title: `Grants in ${label} — GrantsHub`,
    description: `Browse all grant opportunities available in ${label}, organised by state and industry.`,
  };
}

export default async function CountryListingPage({ params }: Props) {
  const { country } = await params;
  const states = await getStates(country);
  const countryLabel = country.replace(/-/g, " ");

  return (
    <div>
      <nav className="mb-6 flex items-center gap-1.5 text-sm text-gray-500 capitalize">
        <a href="/grants-directory" className="hover:text-brand-600">Grants</a>
        <span className="text-gray-300">/</span>
        <span className="text-gray-700 font-medium">{countryLabel}</span>
      </nav>

      <h1 className="text-3xl font-bold text-gray-900 capitalize mb-1">Grants in {countryLabel}</h1>
      <p className="text-gray-500 mb-8">Browse by state or territory</p>

      {states.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 py-20 text-center">
          <p className="text-gray-400">No grants found for this country yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {states.map(([state, count]) => (
            <a
              key={state}
              href={`/${country}/${toPathSegment(state)}`}
              className="rounded-2xl border border-gray-200 bg-white p-6 hover:border-brand-300 hover:shadow-sm transition-all group"
            >
              <h2 className="text-lg font-semibold text-gray-900 capitalize group-hover:text-brand-600">{state}</h2>
              <p className="mt-1 text-sm text-gray-500">{count} grant{count !== 1 ? "s" : ""}</p>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
