"use client";

import { useEffect, useState } from "react";
import {
  Loader2, Sparkles, Trash2, ExternalLink, CheckCircle, Clock,
  Search, Settings, Globe, ChevronDown, ChevronUp,
  DollarSign, Calendar, MapPin,
} from "lucide-react";
import { authFetch } from "@/lib/authFetch";

interface PublicGrant {
  id: string;
  name: string;
  founder?: string | null;
  url?: string | null;
  description?: string | null;
  country?: string | null;
  state?: string | null;
  industry?: string | null;
  amount?: string | null;
  deadlineDate?: string | null;
  eligibility?: string | null;
  geographicScope?: string | null;
  howToApply?: string | null;
  requirements?: string | null;
  projectDuration?: string | null;
  enriched: boolean;
  status: string;
  published: boolean;
  slug?: string | null;
  createdAt: string;
}

export default function AdminGrantsPage() {
  const [grants, setGrants] = useState<PublicGrant[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [enriching, setEnriching] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

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

  const enrichOne = async (id: string) => {
    setEnriching((prev) => new Set([...prev, id]));
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
      setEnriching((prev) => { const n = new Set(prev); n.delete(id); return n; });
    }
  };

  const enrichAll = async () => {
    const unenriched = grants.filter((g) => !g.enriched);
    if (unenriched.length === 0) return;
    setMsg(`Enriching ${unenriched.length} grants…`);
    let ok = 0;
    for (const g of unenriched) {
      setEnriching((prev) => new Set([...prev, g.id]));
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
      setEnriching((prev) => { const n = new Set(prev); n.delete(g.id); return n; });
    }
    setMsg(`✓ Enriched ${ok} of ${unenriched.length} grants`);
  };

  const deleteOne = async (id: string) => {
    if (!confirm("Delete this grant?")) return;
    setDeleting(id);
    try {
      await authFetch(`/api/admin/grants?id=${id}`, { method: "DELETE" });
      setGrants((prev) => prev.filter((g) => g.id !== id));
      setSelected((prev) => { const n = new Set(prev); n.delete(id); return n; });
    } catch { /* ignore */ }
    finally { setDeleting(null); }
  };

  const bulkEnrich = async () => {
    const ids = Array.from(selected).filter((id) => !grants.find((g) => g.id === id)?.enriched);
    if (ids.length === 0) { setMsg("All selected grants are already enriched."); return; }
    setBulkBusy(true);
    setMsg(`Enriching ${ids.length} selected grants…`);
    let ok = 0;
    for (const id of ids) {
      setEnriching((prev) => new Set([...prev, id]));
      try {
        const res = await authFetch("/api/admin/enricher", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ grantId: id }),
        });
        const data = await res.json();
        if (data.success && data.grant) {
          setGrants((prev) => prev.map((g) => (g.id === id ? { ...g, ...data.grant } : g)));
          ok++;
        }
      } catch { /* continue */ }
      setEnriching((prev) => { const n = new Set(prev); n.delete(id); return n; });
    }
    setMsg(`✓ Enriched ${ok} of ${ids.length} grants`);
    setSelected(new Set());
    setBulkBusy(false);
  };

  const bulkDelete = async () => {
    const ids = Array.from(selected);
    if (!confirm(`Delete ${ids.length} selected grant${ids.length !== 1 ? "s" : ""}?`)) return;
    setBulkBusy(true);
    let ok = 0;
    for (const id of ids) {
      try { await authFetch(`/api/admin/grants?id=${id}`, { method: "DELETE" }); ok++; }
      catch { /* continue */ }
    }
    setGrants((prev) => prev.filter((g) => !ids.includes(g.id)));
    setMsg(`✓ Deleted ${ok} grant${ok !== 1 ? "s" : ""}`);
    setSelected(new Set());
    setBulkBusy(false);
  };

  const toggleSelect = (id: string) => setSelected((prev) => {
    const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n;
  });
  const toggleExpand = (id: string) => setExpanded((prev) => {
    const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n;
  });

  const filtered = grants.filter((g) => {
    if (!searchText) return true;
    const q = searchText.toLowerCase();
    return g.name.toLowerCase().includes(q) || (g.country ?? "").toLowerCase().includes(q)
      || (g.industry ?? "").toLowerCase().includes(q) || (g.founder ?? "").toLowerCase().includes(q);
  });

  const allSelected = filtered.length > 0 && filtered.every((g) => selected.has(g.id));
  const toggleSelectAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(filtered.map((g) => g.id)));
  };

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
          <button onClick={enrichAll} disabled={enriching.size > 0 || scrapedCount === 0}
            className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50">
            <Sparkles className="h-4 w-4" /> Enrich All ({scrapedCount})
          </button>
          <a href="/admin/scraper" className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700">
            <Search className="h-4 w-4" /> Scrape More
          </a>
        </div>
      </div>

      {msg && <p className={`mb-4 rounded-lg px-3 py-2 text-sm font-medium ${msg.startsWith("✓") ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"}`}>{msg}</p>}

      {/* Filters + Select All */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="flex cursor-pointer select-none items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2.5">
          <input type="checkbox" checked={allSelected} onChange={toggleSelectAll}
            className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
          <span className="text-sm text-gray-600">{allSelected ? "Deselect all" : `Select all (${filtered.length})`}</span>
        </label>
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Search grants…"
            className="w-full rounded-lg border border-gray-300 py-2.5 pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
        </div>
        <div className="flex gap-1.5">
          {[{ value: "all", label: "All" }, { value: "scraped", label: "Scraped" }, { value: "enriched", label: "Enriched" }].map((f) => (
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
        <div className="space-y-2">
          {filtered.map((grant) => {
            const isExpanded = expanded.has(grant.id);
            const isSelected = selected.has(grant.id);
            const isEnriching = enriching.has(grant.id);
            return (
              <div key={grant.id} className={`rounded-xl border bg-white transition-colors ${isSelected ? "border-brand-300 bg-brand-50/30" : grant.enriched ? "border-green-200" : "border-gray-200"}`}>
                <div className="flex items-start gap-3 p-4">
                  <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(grant.id)}
                    className="mt-1 h-4 w-4 shrink-0 rounded border-gray-300 text-brand-600 focus:ring-brand-500" />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      {/* Clickable title area */}
                      <button onClick={() => toggleExpand(grant.id)} className="min-w-0 flex-1 text-left">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-medium text-gray-900 text-sm">{grant.name}</h3>
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${grant.enriched ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                            {grant.enriched ? <><CheckCircle className="h-3 w-3" /> Enriched</> : <><Clock className="h-3 w-3" /> Scraped</>}
                          </span>
                          {grant.published && <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700"><Globe className="h-3 w-3" /> Live</span>}
                          {grant.country && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] text-blue-700">{grant.country}</span>}
                          {grant.state && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600">{grant.state}</span>}
                          {grant.industry && <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[10px] text-purple-700">{grant.industry}</span>}
                        </div>
                        {grant.founder && <p className="text-xs text-gray-500 mt-0.5">{grant.founder}</p>}
                        {grant.description && <p className="text-xs text-gray-600 mt-1 line-clamp-2">{grant.description}</p>}
                        <div className="mt-1.5 flex flex-wrap gap-2 text-xs">
                          {grant.amount && <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-green-700"><DollarSign className="h-3 w-3" />{grant.amount}</span>}
                          {grant.deadlineDate && <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-orange-700"><Calendar className="h-3 w-3" />{grant.deadlineDate}</span>}
                          {grant.geographicScope && <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-sky-700"><MapPin className="h-3 w-3" />{grant.geographicScope}</span>}
                        </div>
                      </button>

                      {/* Action buttons */}
                      <div className="flex shrink-0 items-center gap-1">
                        <button onClick={() => toggleExpand(grant.id)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700" title={isExpanded ? "Collapse" : "Expand"}>
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                        {grant.url && (
                          <a href={grant.url} target="_blank" rel="noopener noreferrer" title="Open URL" className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-brand-600">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                        <button onClick={() => enrichOne(grant.id)} disabled={isEnriching} title="Enrich with AI"
                          className="rounded-lg p-1.5 text-purple-400 hover:bg-purple-50 hover:text-purple-600 disabled:opacity-40">
                          {isEnriching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                        </button>
                        <a href={`/admin/grants/${grant.id}/seo`} title="SEO & Settings" className="rounded-lg p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600">
                          <Settings className="h-4 w-4" />
                        </a>
                        <a href={`/admin/grants/${grant.id}/eligibility`} title="Eligibility Rules" className="rounded-lg p-1.5 text-gray-400 hover:bg-emerald-50 hover:text-emerald-600">
                          <CheckCircle className="h-4 w-4" />
                        </a>
                        <button onClick={() => deleteOne(grant.id)} disabled={deleting === grant.id} title="Delete"
                          className="rounded-lg p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-500 disabled:opacity-40">
                          {deleting === grant.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Expanded detail panel */}
                    {isExpanded && (
                      <div className="mt-4 border-t border-gray-100 pt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {grant.eligibility && (
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">Eligibility</p>
                            <p className="text-xs text-gray-700 whitespace-pre-wrap">{grant.eligibility}</p>
                          </div>
                        )}
                        {grant.howToApply && (
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">How to Apply</p>
                            <p className="text-xs text-gray-700 whitespace-pre-wrap">{grant.howToApply}</p>
                          </div>
                        )}
                        {grant.requirements && (
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">Requirements</p>
                            <p className="text-xs text-gray-700 whitespace-pre-wrap">{grant.requirements}</p>
                          </div>
                        )}
                        {grant.projectDuration && (
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">Project Duration</p>
                            <p className="text-xs text-gray-700">{grant.projectDuration}</p>
                          </div>
                        )}
                        {grant.geographicScope && (
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">Geographic Scope</p>
                            <p className="text-xs text-gray-700">{grant.geographicScope}</p>
                          </div>
                        )}
                        {grant.url && (
                          <div className="sm:col-span-2">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">Source URL</p>
                            <a href={grant.url} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-600 hover:underline break-all">{grant.url}</a>
                          </div>
                        )}
                        {grant.slug && (
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">Slug</p>
                            <p className="text-xs font-mono text-gray-500">{grant.slug}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">Added</p>
                          <p className="text-xs text-gray-500">{new Date(grant.createdAt).toLocaleString("en-AU", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                        </div>
                        {!grant.enriched && (
                          <div className="sm:col-span-2">
                            <button onClick={() => enrichOne(grant.id)} disabled={isEnriching}
                              className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50">
                              {isEnriching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                              Enrich this grant with AI
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-5 py-3 shadow-xl">
          <span className="text-sm font-semibold text-gray-800">{selected.size} selected</span>
          <div className="h-5 w-px bg-gray-200" />
          <button onClick={bulkEnrich} disabled={bulkBusy}
            className="flex items-center gap-1.5 rounded-lg bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-100 disabled:opacity-50">
            <Sparkles className="h-3.5 w-3.5" /> Enrich Selected
          </button>
          <button onClick={bulkDelete} disabled={bulkBusy}
            className="flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50">
            <Trash2 className="h-3.5 w-3.5" /> Delete Selected
          </button>
          <button onClick={() => setSelected(new Set())} className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100">Cancel</button>
        </div>
      )}
    </div>
  );
}
