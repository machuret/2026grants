"use client";

import { useEffect, useState } from "react";
import {
  Loader2, Plus, Trash2, Globe, Brain, CheckCircle,
  Clock, AlertCircle, ExternalLink, ChevronDown, ChevronUp, RefreshCw
} from "lucide-react";
import { authFetch } from "@/lib/authFetch";

interface GrantSource {
  id: string;
  name: string;
  url: string;
  country?: string | null;
  state?: string | null;
  industry?: string | null;
  description?: string | null;
  grantListUrl?: string | null;
  crawlNotes?: string | null;
  status: "pending" | "crawling" | "learned" | "error";
  siteStructure?: Record<string, unknown> | null;
  lastCrawledAt?: string | null;
  lastScrapedAt?: string | null;
  grantsFound: number;
  active: boolean;
  createdAt: string;
}

const STATUS_STYLES = {
  pending: { cls: "bg-gray-100 text-gray-600", icon: Clock, label: "Pending" },
  crawling: { cls: "bg-blue-100 text-blue-700", icon: Loader2, label: "Learning…" },
  learned: { cls: "bg-green-100 text-green-700", icon: CheckCircle, label: "Learned" },
  error: { cls: "bg-red-100 text-red-700", icon: AlertCircle, label: "Error" },
};

const COUNTRIES = ["Australia", "United States", "United Kingdom", "Canada", "New Zealand", "Global"];
const INDUSTRIES = ["Health", "Education", "Technology", "Environment", "Agriculture", "Arts & Culture", "Social Enterprise", "Research", "Non-profit", "Small Business", "Innovation"];

export default function AdminSourcesPage() {
  const [sources, setSources] = useState<GrantSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [crawling, setCrawling] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [form, setForm] = useState({
    name: "", url: "", country: "", state: "", industry: "", description: "", grantListUrl: "",
  });

  const fetchSources = async () => {
    setLoading(true);
    try {
      const res = await authFetch("/api/admin/sources");
      const data = await res.json();
      setSources(data.sources ?? []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchSources(); }, []);

  const addSource = async () => {
    if (!form.name || !form.url) return;
    setSaving(true);
    setMsg(null);
    try {
      const res = await authFetch("/api/admin/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setSources((prev) => [data.source, ...prev]);
        setForm({ name: "", url: "", country: "", state: "", industry: "", description: "", grantListUrl: "" });
        setShowAdd(false);
        setMsg({ type: "ok", text: "Source added" });
      } else {
        setMsg({ type: "err", text: data.error || "Failed to add" });
      }
    } catch { setMsg({ type: "err", text: "Network error" }); }
    finally { setSaving(false); }
  };

  const crawlSource = async (id: string) => {
    setCrawling(id);
    setMsg(null);
    setSources((prev) => prev.map((s) => s.id === id ? { ...s, status: "crawling" } : s));
    try {
      const res = await authFetch(`/api/admin/sources/${id}/crawl`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setSources((prev) => prev.map((s) => s.id === id ? data.source : s));
        setMsg({ type: "ok", text: "Site structure learned successfully" });
        setExpanded((prev) => new Set([...prev, id]));
      } else {
        setSources((prev) => prev.map((s) => s.id === id ? { ...s, status: "error" } : s));
        setMsg({ type: "err", text: data.error || "Crawl failed" });
      }
    } catch {
      setSources((prev) => prev.map((s) => s.id === id ? { ...s, status: "error" } : s));
      setMsg({ type: "err", text: "Network error" });
    }
    finally { setCrawling(null); }
  };

  const deleteSource = async (id: string) => {
    setDeleting(id);
    try {
      await authFetch(`/api/admin/sources?id=${id}`, { method: "DELETE" });
      setSources((prev) => prev.filter((s) => s.id !== id));
    } catch { /* ignore */ }
    finally { setDeleting(null); }
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
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Grant Sources</h1>
          <p className="mt-1 text-gray-500">Register websites for the scraper to learn and fetch grants from</p>
        </div>
        <button onClick={() => setShowAdd((v) => !v)}
          className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700">
          <Plus className="h-4 w-4" /> Add Source
        </button>
      </div>

      {msg && (
        <div className={`mb-4 rounded-lg px-4 py-2.5 text-sm font-medium ${msg.type === "ok" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
          {msg.text}
        </div>
      )}

      {/* Add Source Form */}
      {showAdd && (
        <div className="mb-6 rounded-xl border border-brand-200 bg-brand-50 p-5">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-brand-800">New Source</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Source Name *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Business.gov.au"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Website URL *</label>
              <input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder="https://business.gov.au"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Grant Listing URL</label>
              <input value={form.grantListUrl} onChange={(e) => setForm({ ...form, grantListUrl: e.target.value })}
                placeholder="https://business.gov.au/grants (if different)"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Country</label>
              <select value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none">
                <option value="">Select country</option>
                {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">State / Region</label>
              <input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })}
                placeholder="e.g. NSW, VIC, Federal"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Industry Focus</label>
              <select value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none">
                <option value="">All industries</option>
                {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-gray-600">Description</label>
              <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Brief description of what grants this site lists"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <button onClick={addSource} disabled={saving || !form.name || !form.url}
              className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add Source
            </button>
            <button onClick={() => setShowAdd(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-gray-400" /></div>
      ) : sources.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-20 text-center">
          <Globe className="mx-auto h-10 w-10 text-gray-300 mb-3" />
          <p className="text-gray-400 font-medium">No sources yet</p>
          <p className="text-sm text-gray-400 mt-1">Add a grant website to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-500 font-medium">{sources.length} source{sources.length !== 1 ? "s" : ""} registered</p>
          {sources.map((source) => {
            const statusInfo = STATUS_STYLES[source.status] ?? STATUS_STYLES.pending;
            const StatusIcon = statusInfo.icon;
            const isExpanded = expanded.has(source.id);

            return (
              <div key={source.id} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                <div className="flex items-start gap-4 p-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                    <Globe className="h-4 w-4 text-gray-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900">{source.name}</h3>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusInfo.cls}`}>
                        <StatusIcon className={`h-3 w-3 ${source.status === "crawling" ? "animate-spin" : ""}`} />
                        {statusInfo.label}
                      </span>
                      {source.country && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] text-blue-700">{source.country}</span>}
                      {source.state && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600">{source.state}</span>}
                      {source.industry && <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[10px] text-purple-700">{source.industry}</span>}
                    </div>
                    <a href={source.url} target="_blank" rel="noopener noreferrer"
                      className="mt-0.5 flex items-center gap-1 text-xs text-brand-600 hover:underline w-fit">
                      {source.url} <ExternalLink className="h-3 w-3" />
                    </a>
                    {source.description && <p className="mt-1 text-xs text-gray-500">{source.description}</p>}
                    {source.crawlNotes && (
                      <p className="mt-1 text-xs text-gray-600 italic">"{source.crawlNotes}"</p>
                    )}
                    {source.lastCrawledAt && (
                      <p className="mt-1 text-[10px] text-gray-400">
                        Last learned: {new Date(source.lastCrawledAt).toLocaleString()}
                        {source.grantsFound > 0 && ` · ${source.grantsFound} grants found`}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button onClick={() => crawlSource(source.id)} disabled={crawling === source.id}
                      title={source.status === "learned" ? "Re-learn site structure" : "Learn site structure"}
                      className="flex items-center gap-1.5 rounded-lg bg-brand-50 px-3 py-2 text-xs font-medium text-brand-700 hover:bg-brand-100 disabled:opacity-40">
                      {crawling === source.id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : source.status === "learned"
                          ? <RefreshCw className="h-3.5 w-3.5" />
                          : <Brain className="h-3.5 w-3.5" />}
                      {source.status === "learned" ? "Re-learn" : "Learn"}
                    </button>
                    {source.siteStructure && (
                      <button onClick={() => toggleExpand(source.id)}
                        className="rounded-lg p-2 text-gray-400 hover:bg-gray-100">
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    )}
                    <button onClick={() => deleteSource(source.id)} disabled={deleting === source.id}
                      className="rounded-lg p-2 text-gray-300 hover:bg-red-50 hover:text-red-500 disabled:opacity-40">
                      {deleting === source.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded site structure */}
                {isExpanded && source.siteStructure && (() => {
                  const ss = source.siteStructure as {
                    grantListUrl?: string; paginationPattern?: string; grantLinkPattern?: string;
                    scrapingStrategy?: string; keyFields?: string[]; searchFilters?: string[]; notes?: string;
                  };
                  return (
                    <div className="border-t border-gray-100 bg-gray-50 p-4">
                      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">Learned Site Structure</p>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
                        {ss.grantListUrl && (
                          <div>
                            <p className="font-semibold text-gray-500 mb-0.5">Grant Listing URL</p>
                            <a href={ss.grantListUrl} target="_blank" rel="noopener noreferrer"
                              className="text-brand-600 hover:underline break-all">{ss.grantListUrl}</a>
                          </div>
                        )}
                        {ss.paginationPattern && (
                          <div>
                            <p className="font-semibold text-gray-500 mb-0.5">Pagination</p>
                            <p className="text-gray-700">{ss.paginationPattern}</p>
                          </div>
                        )}
                        {ss.grantLinkPattern && (
                          <div>
                            <p className="font-semibold text-gray-500 mb-0.5">Grant Link Pattern</p>
                            <p className="text-gray-700 font-mono">{ss.grantLinkPattern}</p>
                          </div>
                        )}
                        {ss.scrapingStrategy && (
                          <div className="sm:col-span-2">
                            <p className="font-semibold text-gray-500 mb-0.5">Scraping Strategy</p>
                            <p className="text-gray-700">{ss.scrapingStrategy}</p>
                          </div>
                        )}
                        {ss.keyFields && ss.keyFields.length > 0 && (
                          <div>
                            <p className="font-semibold text-gray-500 mb-0.5">Available Fields</p>
                            <div className="flex flex-wrap gap-1">
                              {ss.keyFields.map((f) => (
                                <span key={f} className="rounded bg-white border border-gray-200 px-1.5 py-0.5 text-gray-600">{f}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {ss.searchFilters && ss.searchFilters.length > 0 && (
                          <div>
                            <p className="font-semibold text-gray-500 mb-0.5">Search Filters</p>
                            <div className="flex flex-wrap gap-1">
                              {ss.searchFilters.map((f) => (
                                <span key={f} className="rounded bg-white border border-gray-200 px-1.5 py-0.5 text-gray-600">{f}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {ss.notes && (
                          <div className="sm:col-span-2">
                            <p className="font-semibold text-gray-500 mb-0.5">Notes</p>
                            <p className="text-gray-600 italic">{ss.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
