import { Metadata } from "next";
import { db } from "@/lib/db";
import { toPathSegment } from "@/lib/slugify";

export const metadata: Metadata = {
  title: "Grants Directory — GrantsHub",
  description: "Browse curated grant opportunities by country, state, and industry. Find the right funding for your organisation.",
};

async function getCountries() {
  const { data } = await db
    .from("PublicGrant")
    .select("country, state")
    .eq("published", true)
    .eq("enriched", true)
    .not("country", "is", null);

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const k = row.country ?? "Other";
    counts[k] = (counts[k] ?? 0) + 1;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}

export default async function GrantsDirectoryPage() {
  const countries = await getCountries();

  return (
    <div>
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-3">Grants Directory</h1>
        <p className="text-lg text-gray-500 max-w-2xl mx-auto">
          Browse curated, AI-enriched grant opportunities organised by country, state, and industry.
        </p>
      </div>

      {countries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 py-20 text-center">
          <p className="text-gray-400">No published grants yet. Check back soon.</p>
        </div>
      ) : (
        <>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Browse by Country</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {countries.map(([country, count]) => (
              <a
                key={country}
                href={`/${toPathSegment(country)}`}
                className="rounded-2xl border border-gray-200 bg-white p-6 hover:border-brand-300 hover:shadow-md transition-all group"
              >
                <h3 className="text-xl font-semibold text-gray-900 group-hover:text-brand-600">{country}</h3>
                <p className="mt-1 text-sm text-gray-500">{count} grant{count !== 1 ? "s" : ""} available</p>
                <p className="mt-3 text-xs text-brand-600 font-medium group-hover:underline">Browse grants →</p>
              </a>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
