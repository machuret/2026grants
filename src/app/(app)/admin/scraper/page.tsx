"use client";

import { useState } from "react";
import { Loader2, Search, Globe, Briefcase, ExternalLink, CheckSquare, Square, Plus, ArrowLeft, AlertCircle } from "lucide-react";
import { authFetch } from "@/lib/authFetch";

const COUNTRIES = [
  "Australia", "United States", "United Kingdom", "Canada", "New Zealand",
  "Ireland", "Germany", "France", "Netherlands", "Singapore",
  "India", "South Africa", "Kenya", "Nigeria", "Global",
];

const INDUSTRIES = [
  "", "Health", "Education", "Technology", "Environment", "Agriculture",
  "Arts & Culture", "Social Enterprise", "Research", "Community Development",
  "Energy", "Manufacturing", "Non-profit", "Small Business", "Innovation",
];

interface PreviewResult {
  title: string;
  url: string;
  description: string;
  amount?: string;
  deadline?: string;
  eligibility?: string;
  country?: string;
  industry?: string;
  alreadyExists: boolean;
}

export default function ScraperPage() {
  const [country, setCountry] = useState("Australia");
  const [industry, setIndustry] = useState("");
  const [maxResults, setMaxResults] = useState(20);
  const [scraping, setScraping] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState<string | null>(null);

  // Preview state
  const [previewResults, setPreviewResults] = useState<PreviewResult[] | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  // Commit result state
  const [committed, setCommitted] = useState<{ inserted: number; skipped: number } | null>(null);

  const handlePreview = async () => {
    setScraping(true);
    setError(null);
    setPreviewResults(null);
    setCommitted(null);
    setSelected(new Set());
    try {
      const res = await authFetch("/api/admin/scraper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ country, industry, maxResults, preview: true }),
      });
      const data = await res.json();
      if (data.success && data.results) {
        setPreviewResults(data.results);
        setQuery(data.query);
        // Pre-select all non-existing results
        setSelected(new Set(
          data.results
            .map((_: PreviewResult, i: number) => i)
            .filter((i: number) => !data.results[i].alreadyExists)
        ));
      } else {
        setError(data.error || "Scraping failed");
      }
    } catch {
      setError("Network error");
    } finally {
      setScraping(false);
    }
  };

  const handleCommit = async () => {
    if (!previewResults || selected.size === 0) return;
    setCommitting(true);
    setError(null);
    try {
      const toSave = Array.from(selected).map((i) => previewResults[i]);
      const res = await authFetch("/api/admin/scraper", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ country, industry, results: toSave }),
      });
      const data = await res.json();
      if (data.success) {
        setCommitted({ inserted: data.inserted, skipped: data.skippedDuplicates });
        setPreviewResults(null);
        setSelected(new Set());
      } else {
        setError(data.error || "Failed to save grants");
      }
    } catch {
      setError("Network error");
    } finally {
      setCommitting(false);
    }
  };

  const toggleSelect = (i: number) => setSelected((prev) => {
    const n = new Set(prev); if (n.has(i)) n.delete(i); else n.add(i); return n;
  });

  const allNewSelected = previewResults
    ? previewResults.filter((r) => !r.alreadyExists).every((_, i) =>
        selected.has(previewResults.findIndex((r2) => r2 === previewResults.filter((r) => !r.alreadyExists)[i]))
      )
    : false;

  const toggleSelectAllNew = () => {
    if (!previewResults) return;
    const newIndexes = previewResults.map((r, i) => (!r.alreadyExists ? i : -1)).filter((i) => i >= 0);
    const allSelected = newIndexes.every((i) => selected.has(i));
    if (allSelected) {
      setSelected((prev) => { const n = new Set(prev); newIndexes.forEach((i) => n.delete(i)); return n; });
    } else {
      setSelected((prev) => new Set([...prev, ...newIndexes]));
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Grant Scraper</h1>
        <p className="mt-1 text-gray-500">Find real grant opportunities using AI web search — Admin only</p>
      </div>

      {/* Search Parameters */}
      {!previewResults && !committed && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-sm font-bold text-gray-800 uppercase tracking-wide">Search Parameters</h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-gray-600">
                <Globe className="h-3.5 w-3.5" /> Country *
              </label>
              <select value={country} onChange={(e) => setCountry(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500">
                {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-gray-600">
                <Briefcase className="h-3.5 w-3.5" /> Industry (optional)
              </label>
              <select value={industry} onChange={(e) => setIndustry(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500">
                <option value="">All Industries</option>
                {INDUSTRIES.filter(Boolean).map((i) => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Max Results</label>
              <select value={maxResults} onChange={(e) => setMaxResults(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500">
                {[10, 20, 30, 50].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>

          <button onClick={handlePreview} disabled={scraping}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
            {scraping ? <><Loader2 className="h-4 w-4 animate-spin" /> Searching… this may take 30-60 seconds</>
              : <><Search className="h-4 w-4" /> Preview Grants</>}
          </button>
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 mt-0.5 text-red-500 shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Preview Results */}
      {previewResults && (
        <div className="mt-4">
          <div className="mb-3 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-gray-900">
                Preview — {previewResults.length} result{previewResults.length !== 1 ? "s" : ""} found
              </h2>
              {query && <p className="text-xs text-gray-500 mt-0.5">Query: <span className="font-medium">"{query}"</span></p>}
              <p className="text-xs text-gray-500 mt-0.5">
                {selected.size} selected · {previewResults.filter((r) => r.alreadyExists).length} already in DB
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setPreviewResults(null); setSelected(new Set()); setCommitted(null); }}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">
                <ArrowLeft className="h-3.5 w-3.5" /> Back
              </button>
              <button onClick={handleCommit} disabled={committing || selected.size === 0}
                className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
                {committing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Add {selected.size} Grant{selected.size !== 1 ? "s" : ""}
              </button>
            </div>
          </div>

          {/* Select all new */}
          <label className="mb-2 flex cursor-pointer select-none items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2.5">
            <input type="checkbox"
              checked={previewResults.filter((r) => !r.alreadyExists).length > 0 &&
                previewResults.map((r, i) => (!r.alreadyExists ? i : -1)).filter((i) => i >= 0).every((i) => selected.has(i))}
              onChange={toggleSelectAllNew}
              className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
            <span className="text-sm text-gray-600">
              Select all new ({previewResults.filter((r) => !r.alreadyExists).length})
            </span>
          </label>

          <div className="space-y-2">
            {previewResults.map((result, i) => (
              <div key={i} className={`rounded-xl border bg-white p-4 transition-colors ${
                result.alreadyExists ? "border-gray-100 opacity-50" :
                selected.has(i) ? "border-brand-300 bg-brand-50/30" : "border-gray-200"
              }`}>
                <div className="flex items-start gap-3">
                  <input type="checkbox" checked={selected.has(i)} disabled={result.alreadyExists}
                    onChange={() => toggleSelect(i)}
                    className="mt-1 h-4 w-4 shrink-0 rounded border-gray-300 text-brand-600 focus:ring-brand-500 disabled:opacity-40" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-gray-900">{result.title}</p>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {result.alreadyExists && (
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">Already exists</span>
                        )}
                        <a href={result.url} target="_blank" rel="noopener noreferrer"
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-brand-600" title="Preview URL">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                    </div>
                    {result.description && <p className="mt-1 text-xs text-gray-500 line-clamp-2">{result.description}</p>}
                    <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
                      {result.amount && result.amount !== "Not specified" && (
                        <span className="text-[10px] text-green-700 font-medium">💰 {result.amount}</span>
                      )}
                      {result.deadline && result.deadline !== "Not specified" && (
                        <span className="text-[10px] text-orange-600 font-medium">📅 {result.deadline}</span>
                      )}
                      {result.eligibility && (
                        <span className="text-[10px] text-blue-600">👤 {result.eligibility}</span>
                      )}
                    </div>
                    <p className="mt-1 text-[10px] text-gray-400 truncate">{result.url}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex justify-end">
            <button onClick={handleCommit} disabled={committing || selected.size === 0}
              className="flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
              {committing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add {selected.size} Grant{selected.size !== 1 ? "s" : ""} to Database
            </button>
          </div>
        </div>
      )}

      {/* Success state */}
      {committed && (
        <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-6 text-center">
          <div className="text-2xl font-bold text-green-700 mb-1">✓ Done!</div>
          <p className="text-sm text-green-700">
            <span className="font-bold">{committed.inserted}</span> grant{committed.inserted !== 1 ? "s" : ""} added to the database.
            {committed.skipped > 0 && <> · {committed.skipped} duplicate{committed.skipped !== 1 ? "s" : ""} skipped.</>}
          </p>
          <div className="mt-4 flex justify-center gap-3">
            <button onClick={() => { setCommitted(null); setError(null); }}
              className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              <Search className="h-4 w-4" /> Scrape More
            </button>
            <a href="/admin/grants"
              className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
              View in Admin Grants →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
