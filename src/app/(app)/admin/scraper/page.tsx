"use client";

import { useState } from "react";
import { Loader2, Search, Globe, Briefcase, Plus } from "lucide-react";
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

export default function ScraperPage() {
  const [country, setCountry] = useState("Australia");
  const [industry, setIndustry] = useState("");
  const [maxResults, setMaxResults] = useState(20);
  const [scraping, setScraping] = useState(false);
  const [result, setResult] = useState<{ found: number; inserted: number; query: string; skippedDuplicates: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleScrape = async () => {
    setScraping(true);
    setError(null);
    setResult(null);
    try {
      const res = await authFetch("/api/admin/scraper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ country, industry, maxResults }),
      });
      const data = await res.json();
      if (data.success) {
        setResult(data);
      } else {
        setError(data.error || "Scraping failed");
      }
    } catch {
      setError("Network error");
    } finally {
      setScraping(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Grant Scraper</h1>
        <p className="mt-1 text-gray-500">Scrape grant opportunities from the web using Apify — Admin only</p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-bold text-gray-800 uppercase tracking-wide">Search Parameters</h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-gray-600">
              <Globe className="h-3.5 w-3.5" /> Country *
            </label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-gray-600">
              <Briefcase className="h-3.5 w-3.5" /> Industry (optional)
            </label>
            <select
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="">All Industries</option>
              {INDUSTRIES.filter(Boolean).map((i) => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">Max Results</label>
            <select
              value={maxResults}
              onChange={(e) => setMaxResults(Number(e.target.value))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              {[10, 20, 30, 50].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>

        <button
          onClick={handleScrape}
          disabled={scraping}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {scraping ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Scraping… this may take 30-60 seconds</>
          ) : (
            <><Search className="h-4 w-4" /> Scrape Grants</>
          )}
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {result && (
        <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4">
          <h3 className="text-sm font-bold text-green-800 mb-2">Scrape Complete</h3>
          <div className="space-y-1 text-sm text-green-700">
            <p>Search query: <span className="font-medium">"{result.query}"</span></p>
            <p>Results found: <span className="font-bold">{result.found}</span></p>
            <p>New grants added: <span className="font-bold">{result.inserted}</span></p>
            {result.skippedDuplicates > 0 && (
              <p>Duplicates skipped: <span className="font-medium">{result.skippedDuplicates}</span></p>
            )}
          </div>
          <p className="mt-3 text-xs text-green-600">
            Go to <a href="/admin/grants" className="font-medium underline">Admin Grants</a> to view and enrich them.
          </p>
        </div>
      )}
    </div>
  );
}
