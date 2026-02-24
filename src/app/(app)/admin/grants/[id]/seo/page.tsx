"use client";

import { useEffect, useState } from "react";
import { Loader2, Save, Globe, ExternalLink, Eye, EyeOff } from "lucide-react";
import { authFetch } from "@/lib/authFetch";
import { useParams } from "next/navigation";
import { generateSlug, grantPublicUrl, toPathSegment } from "@/lib/slugify";

interface PublicGrant {
  id: string;
  name: string;
  founder?: string | null;
  url?: string | null;
  country?: string | null;
  state?: string | null;
  industry?: string | null;
  slug?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoKeywords?: string | null;
  published: boolean;
  publishedAt?: string | null;
  enriched: boolean;
}

export default function GrantSeoPage() {
  const params = useParams();
  const id = params.id as string;

  const [grant, setGrant] = useState<PublicGrant | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [slug, setSlug] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("");
  const [industry, setIndustry] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [seoKeywords, setSeoKeywords] = useState("");
  const [published, setPublished] = useState(false);

  useEffect(() => {
    authFetch(`/api/admin/grants/single?id=${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.grant) {
          const g = d.grant as PublicGrant;
          setGrant(g);
          setSlug(g.slug ?? generateSlug(g.name, g.country));
          setState(g.state ?? "");
          setCountry(g.country ?? "");
          setIndustry(g.industry ?? "");
          setSeoTitle(g.seoTitle ?? g.name);
          setSeoDescription(g.seoDescription ?? "");
          setSeoKeywords(g.seoKeywords ?? "");
          setPublished(g.published);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const res = await authFetch(`/api/admin/grants/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, state, country, industry, seoTitle, seoDescription, seoKeywords, published }),
      });
      const data = await res.json();
      if (data.success) {
        setGrant((prev) => prev ? { ...prev, ...data.grant } : prev);
        setMsg("✓ Saved");
      } else {
        setMsg(data.error || "Save failed");
      }
    } catch {
      setMsg("Network error");
    } finally {
      setSaving(false);
    }
  };

  const publicUrl = grantPublicUrl({ country, state, industry, slug });

  if (loading) return <div className="py-20 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-gray-400" /></div>;
  if (!grant) return <div className="py-20 text-center text-gray-400">Grant not found</div>;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <a href="/admin/grants" className="text-sm text-brand-600 hover:underline">← Back to Grants</a>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">SEO & URL Settings</h1>
          <p className="text-sm text-gray-500 mt-0.5 truncate max-w-lg">{grant.name}</p>
        </div>
        <button
          onClick={() => { setPublished((p) => !p); }}
          className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium ${
            published ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          {published ? <><Eye className="h-4 w-4" /> Published</> : <><EyeOff className="h-4 w-4" /> Draft</>}
        </button>
      </div>

      {msg && <p className={`mb-4 rounded-lg px-3 py-2 text-sm font-medium ${msg.startsWith("✓") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>{msg}</p>}

      {/* Public URL preview */}
      {publicUrl && (
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3">
          <Globe className="h-4 w-4 shrink-0 text-brand-600" />
          <span className="text-sm text-brand-700 font-mono flex-1 truncate">
            {typeof window !== "undefined" ? window.location.origin : "https://yourdomain.com"}{publicUrl}
          </span>
          <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:text-brand-800">
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      )}

      <div className="space-y-5">
        {/* URL Structure */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-700">URL Structure</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Country *</label>
              <input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="e.g. Australia"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
              {country && <p className="mt-1 text-[10px] text-gray-400">/{toPathSegment(country)}</p>}
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">State / Region</label>
              <input value={state} onChange={(e) => setState(e.target.value)} placeholder="e.g. NSW"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
              {state && <p className="mt-1 text-[10px] text-gray-400">/{toPathSegment(state)}</p>}
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Industry</label>
              <input value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="e.g. Health"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
              {industry && <p className="mt-1 text-[10px] text-gray-400">/{toPathSegment(industry)}</p>}
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">URL Slug *</label>
              <div className="flex gap-2">
                <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="e.g. nsw-health-innovation-fund"
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
                <button onClick={() => setSlug(generateSlug(grant.name, country))}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-600 hover:bg-gray-50">
                  Auto
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* SEO */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-700">SEO Settings</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">SEO Title</label>
              <input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} placeholder="Page title for search engines"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
              <p className="mt-1 text-[10px] text-gray-400">{seoTitle.length}/60 characters recommended</p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Meta Description</label>
              <textarea value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)}
                placeholder="Brief description for search engine results" rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
              <p className="mt-1 text-[10px] text-gray-400">{seoDescription.length}/160 characters recommended</p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Keywords</label>
              <input value={seoKeywords} onChange={(e) => setSeoKeywords(e.target.value)}
                placeholder="e.g. health grants, NSW funding, innovation grants"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
            </div>
          </div>
        </div>

        {/* Google preview */}
        {(seoTitle || grant.name) && (
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-700">Google Preview</h2>
            <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
              <p className="text-[10px] text-gray-400 mb-1">
                {typeof window !== "undefined" ? window.location.origin : "https://yourdomain.com"}{publicUrl ?? ""}
              </p>
              <p className="text-lg text-blue-700 hover:underline cursor-pointer">{seoTitle || grant.name}</p>
              <p className="text-sm text-gray-600 mt-1">{seoDescription || "No meta description set."}</p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button onClick={save} disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {published ? "Save & Publish" : "Save as Draft"}
          </button>
          {grant.url && (
            <a href={grant.url} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-500 hover:text-brand-600 flex items-center gap-1">
              <ExternalLink className="h-3.5 w-3.5" /> View original
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
