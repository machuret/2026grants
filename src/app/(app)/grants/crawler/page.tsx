"use client";

import { useState } from "react";
import { Loader2, Search, Plus, ExternalLink } from "lucide-react";
import { authFetch } from "@/lib/authFetch";
import type { Grant } from "@/hooks/useGrants";

interface SearchResult {
  name: string;
  founder: string;
  url: string;
  amount: string;
  deadlineDate: string;
  geographicScope: string;
  eligibility: string;
}

export default function CrawlerPage() {
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState<string | null>(null);
  const [added, setAdded] = useState<Set<string>>(new Set());

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true); setError(null); setResults([]);
    try {
      const res = await authFetch("/api/grants/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, region }),
      });
      const data = await res.json();
      if (data.results) setResults(data.results);
      else setError(data.error || "Search failed");
    } catch { setError("Network error"); }
    finally { setSearching(false); }
  };

  const addGrant = async (result: SearchResult) => {
    setAdding(result.name);
    try {
      const res = await authFetch("/api/grants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: result.name,
          founder: result.founder || null,
          url: result.url || null,
          amount: result.amount || null,
          deadlineDate: result.deadlineDate || null,
          geographicScope: result.geographicScope || null,
          eligibility: result.eligibility || null,
        }),
      });
      const data = await res.json();
      if (data.success) setAdded((prev) => new Set([...prev, result.name]));
    } catch { /* ignore */ }
    finally { setAdding(null); }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Grant Crawler</h1>
        <p className="mt-1 text-gray-500">AI-powered search to discover grant opportunities</p>
      </div>

      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex gap-3">
          <div className="flex-1">
            <input value={query} onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="e.g. innovation grants for health startups"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
          </div>
          <input value={region} onChange={(e) => setRegion(e.target.value)}
            placeholder="Region (optional)"
            className="w-40 rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
          <button onClick={handleSearch} disabled={searching || !query.trim()}
            className="flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50">
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Search
          </button>
        </div>
      </div>

      {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {searching && (
        <div className="py-12 text-center text-gray-400">
          <Loader2 className="mx-auto h-8 w-8 animate-spin mb-3" />
          AI is searching for grants…
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-gray-500 font-medium">{results.length} results found</p>
          {results.map((r, i) => (
            <div key={i} className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900">{r.name}</h3>
                    {r.url && (
                      <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-brand-500 hover:text-brand-700">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                  {r.founder && <p className="text-sm text-gray-500 mt-0.5">{r.founder}</p>}
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    {r.amount && <span className="rounded-full bg-green-50 px-2 py-0.5 text-green-700">{r.amount}</span>}
                    {r.geographicScope && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-700">{r.geographicScope}</span>}
                    {r.deadlineDate && <span className="rounded-full bg-orange-50 px-2 py-0.5 text-orange-700">Deadline: {r.deadlineDate}</span>}
                  </div>
                  {r.eligibility && <p className="mt-2 text-xs text-gray-500 line-clamp-2">{r.eligibility}</p>}
                </div>
                <button
                  onClick={() => addGrant(r)}
                  disabled={adding === r.name || added.has(r.name)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium ${
                    added.has(r.name)
                      ? "bg-green-100 text-green-700"
                      : "bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50"
                  }`}
                >
                  {added.has(r.name) ? "Added ✓" : adding === r.name ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4" /> Add</>}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
