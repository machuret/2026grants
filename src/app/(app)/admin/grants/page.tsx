"use client";

import { useEffect, useState } from "react";
import { Loader2, Sparkles, Trash2, ExternalLink, CheckCircle, Clock, Search, Settings, Globe } from "lucide-react";
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
  enriched: boolean;
  status: string;
  published: boolean;
  slug?: string | null;
  state?: string | null;
  createdAt: string;
}

export default function AdminGrantsPage() {
  const [grants, setGrants] = useState<PublicGrant[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [enriching, setEnriching] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchGrants = async () => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/admin/grants?status=${statusFilter}`);
      const data = await res.json();
      if (data.error) setError(data.error);
      else setGrants(data.grants ?? []);
    } catch {
      setError("Failed to load grants");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchGrants(); }, [statusFilter]);

  const enrich = async (id: string) => {
    setEnriching(id);
    setMsg(null);
    try {
      const res = await authFetch("/api/admin/enricher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grantId: id }),
      });
      const data = await res.json();
      if (data.success && data.grant) {
        setGrants((prev) => prev.map((g) => (g.id === id ? { ...g, ...data.grant } : g)));
        setMsg("✓ Grant enriched successfully");
      } else {
        setMsg(data.error || "Enrichment failed");
      }
    } catch {
      setMsg("Network error");
    } finally {
      setEnriching(null);
    }
  };

  const enrichAll = async () => {
    const unenriched = grants.filter((g) => !g.enriched);
    if (unenriched.length === 0) return;
    setMsg(`Enriching ${unenriched.length} grants…`);
    let ok = 0;
    for (const g of unenriched) {
      setEnriching(g.id);
      try {
        const res = await authFetch("/api/admin/enricher", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ grantId: g.id }),
        });
        const data = await res.json();
        if (data.success && data.grant) {
          setGrants((prev) => prev.map((x) => (x.id === g.id ? { ...x, ...data.grant } : x)));
          ok++;
        }
      } catch { /* continue */ }
    }
    setEnriching(null);
    setMsg(`✓ Enriched ${ok} of ${unenriched.length} grants`);
  };

  const deleteGrant = async (id: string) => {
    if (!confirm("Delete this grant?")) return;
    setDeleting(id);
    try {
      await authFetch(`/api/admin/grants?id=${id}`, { method: "DELETE" });
      setGrants((prev) => prev.filter((g) => g.id !== id));
    } catch { /* ignore */ }
    finally { setDeleting(null); }
  };

  const filtered = grants.filter((g) => {
    if (!searchText) return true;
    const q = searchText.toLowerCase();
    return g.name.toLowerCase().includes(q) || (g.country ?? "").toLowerCase().includes(q) || (g.industry ?? "").toLowerCase().includes(q);
  });

  const scrapedCount = grants.filter((g) => !g.enriched).length;
  const enrichedCount = grants.filter((g) => g.enriched).length;

  if (error && !grants.length) {
    return <div className="mx-auto max-w-5xl py-20 text-center"><p className="text-red-500">{error}</p></div>;
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Grants Database</h1>
          <p className="mt-1 text-gray-500">{grants.length} total · {scrapedCount} scraped · {enrichedCount} enriched</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={enrichAll} disabled={!!enriching || scrapedCount === 0}
            className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50">
            <Sparkles className="h-4 w-4" /> Enrich All ({scrapedCount})
          </button>
          <a href="/admin/scraper" className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700">
            <Search className="h-4 w-4" /> Scrape More
          </a>
        </div>
      </div>

      {msg && <p className={`mb-4 rounded-lg px-3 py-2 text-sm font-medium ${msg.startsWith("✓") ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"}`}>{msg}</p>}

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Search grants…"
            className="w-full rounded-lg border border-gray-300 py-2.5 pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
        </div>
        <div className="flex gap-1.5">
          {[
            { value: "all", label: "All" },
            { value: "scraped", label: "Scraped" },
            { value: "enriched", label: "Enriched" },
          ].map((f) => (
            <button key={f.value} onClick={() => setStatusFilter(f.value)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${statusFilter === f.value ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-gray-400"><Loader2 className="mx-auto h-8 w-8 animate-spin mb-3" />Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-20 text-center">
          <p className="text-gray-400">No grants found. <a href="/admin/scraper" className="text-brand-600 underline">Scrape some grants</a> to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((grant) => (
            <div key={grant.id} className={`rounded-xl border bg-white p-4 ${grant.enriched ? "border-green-200" : "border-gray-200"}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-medium text-gray-900 text-sm">{grant.name}</h3>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      grant.enriched ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                    }`}>
                      {grant.enriched ? <><CheckCircle className="h-3 w-3" /> Enriched</> : <><Clock className="h-3 w-3" /> Scraped</>}
                    </span>
                    {grant.published && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">
                        <Globe className="h-3 w-3" /> Live
                      </span>
                    )}
                    {grant.country && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] text-blue-700">{grant.country}</span>}
                    {grant.industry && <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[10px] text-purple-700">{grant.industry}</span>}
                  </div>
                  {grant.founder && <p className="text-xs text-gray-500 mt-0.5">{grant.founder}</p>}
                  {grant.description && <p className="text-xs text-gray-600 mt-1 line-clamp-2">{grant.description}</p>}
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    {grant.amount && <span className="rounded-full bg-green-50 px-2 py-0.5 text-green-700">{grant.amount}</span>}
                    {grant.deadlineDate && <span className="rounded-full bg-orange-50 px-2 py-0.5 text-orange-700">Deadline: {grant.deadlineDate}</span>}
                    {grant.eligibility && <span className="text-gray-500 truncate max-w-xs">{grant.eligibility}</span>}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {grant.url && (
                    <a href={grant.url} target="_blank" rel="noopener noreferrer" title="Open URL" className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-brand-600">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                  <button onClick={() => enrich(grant.id)} disabled={enriching === grant.id} title="Enrich with AI"
                    className="rounded-lg p-2 text-purple-400 hover:bg-purple-50 hover:text-purple-600 disabled:opacity-40">
                    {enriching === grant.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  </button>
                  <a href={`/admin/grants/${grant.id}/seo`} title="SEO & URL Settings"
                    className="rounded-lg p-2 text-gray-400 hover:bg-blue-50 hover:text-blue-600">
                    <Settings className="h-4 w-4" />
                  </a>
                  <button onClick={() => deleteGrant(grant.id)} disabled={deleting === grant.id} title="Delete"
                    className="rounded-lg p-2 text-gray-300 hover:bg-red-50 hover:text-red-500 disabled:opacity-40">
                    {deleting === grant.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
