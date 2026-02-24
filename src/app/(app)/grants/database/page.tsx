"use client";

import { useEffect, useState } from "react";
import { Loader2, Search, ExternalLink, Plus, Globe, Briefcase, Calendar, DollarSign } from "lucide-react";
import { authFetch } from "@/lib/authFetch";

interface PublicGrant {
  id: string;
  name: string;
  founder?: string | null;
  url?: string | null;
  description?: string | null;
  country?: string | null;
  industry?: string | null;
  amount?: string | null;
  deadlineDate?: string | null;
  eligibility?: string | null;
  geographicScope?: string | null;
  howToApply?: string | null;
  requirements?: string | null;
  projectDuration?: string | null;
}

export default function GrantsDatabasePage() {
  const [grants, setGrants] = useState<PublicGrant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [country, setCountry] = useState("");
  const [industry, setIndustry] = useState("");
  const [adding, setAdding] = useState<string | null>(null);
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const fetchGrants = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchText) params.set("search", searchText);
      if (country) params.set("country", country);
      if (industry) params.set("industry", industry);
      const res = await authFetch(`/api/grants/database?${params}`);
      const data = await res.json();
      setGrants(data.grants ?? []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchGrants(); }, [country, industry]);

  const handleSearch = () => fetchGrants();

  const addToMyGrants = async (grant: PublicGrant) => {
    setAdding(grant.id);
    try {
      const res = await authFetch("/api/grants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: grant.name,
          founder: grant.founder,
          url: grant.url,
          amount: grant.amount,
          deadlineDate: grant.deadlineDate,
          geographicScope: grant.geographicScope,
          eligibility: grant.eligibility,
          howToApply: grant.howToApply,
        }),
      });
      const data = await res.json();
      if (data.success) setAdded((prev) => new Set([...prev, grant.id]));
    } catch { /* ignore */ }
    finally { setAdding(null); }
  };

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Grants Database</h1>
        <p className="mt-1 text-gray-500">Browse curated & enriched grant opportunities — add them to your pipeline</p>
      </div>

      {/* Search & Filters */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input value={searchText} onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Search grants…"
              className="w-full rounded-lg border border-gray-300 py-2.5 pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
          </div>
          <select value={country} onChange={(e) => setCountry(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none">
            <option value="">All Countries</option>
            {["Australia", "United States", "United Kingdom", "Canada", "New Zealand", "Global"].map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={industry} onChange={(e) => setIndustry(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none">
            <option value="">All Industries</option>
            {["Health", "Education", "Technology", "Environment", "Agriculture", "Arts & Culture", "Social Enterprise", "Research", "Non-profit", "Small Business", "Innovation"].map((i) => <option key={i} value={i}>{i}</option>)}
          </select>
          <button onClick={handleSearch} className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700">
            <Search className="h-4 w-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-gray-400"><Loader2 className="mx-auto h-8 w-8 animate-spin mb-3" />Loading grants…</div>
      ) : grants.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-20 text-center">
          <p className="text-gray-400">No enriched grants found. Try a different search or filter.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-500 font-medium">{grants.length} grants available</p>
          {grants.map((grant) => (
            <div key={grant.id} className="rounded-xl border border-gray-200 bg-white p-4 hover:border-brand-200 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1 cursor-pointer" onClick={() => toggleExpand(grant.id)}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-900">{grant.name}</h3>
                    {grant.url && (
                      <a href={grant.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-brand-500 hover:text-brand-700">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                  {grant.founder && <p className="text-sm text-gray-500 mt-0.5">{grant.founder}</p>}
                  {grant.description && <p className="text-sm text-gray-600 mt-1 line-clamp-2">{grant.description}</p>}
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    {grant.amount && <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-green-700"><DollarSign className="h-3 w-3" />{grant.amount}</span>}
                    {grant.country && <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-blue-700"><Globe className="h-3 w-3" />{grant.country}</span>}
                    {grant.industry && <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-purple-700"><Briefcase className="h-3 w-3" />{grant.industry}</span>}
                    {grant.deadlineDate && <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-orange-700"><Calendar className="h-3 w-3" />{grant.deadlineDate}</span>}
                  </div>
                </div>
                <button
                  onClick={() => addToMyGrants(grant)}
                  disabled={adding === grant.id || added.has(grant.id)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-medium ${
                    added.has(grant.id) ? "bg-green-100 text-green-700" : "bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50"
                  }`}
                >
                  {added.has(grant.id) ? "Added ✓" : adding === grant.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4" /> Add to My Grants</>}
                </button>
              </div>

              {expanded.has(grant.id) && (
                <div className="mt-4 border-t border-gray-100 pt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
                  {grant.eligibility && <div><p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Eligibility</p><p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">{grant.eligibility}</p></div>}
                  {grant.howToApply && <div><p className="text-xs font-semibold uppercase tracking-wide text-gray-400">How to Apply</p><p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">{grant.howToApply}</p></div>}
                  {grant.requirements && <div><p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Requirements</p><p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">{grant.requirements}</p></div>}
                  {grant.geographicScope && <div><p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Geographic Scope</p><p className="mt-1 text-sm text-gray-700">{grant.geographicScope}</p></div>}
                  {grant.projectDuration && <div><p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Duration</p><p className="mt-1 text-sm text-gray-700">{grant.projectDuration}</p></div>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
