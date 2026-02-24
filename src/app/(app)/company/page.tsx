"use client";

import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { authFetch } from "@/lib/authFetch";

export default function CompanyPage() {
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [website, setWebsite] = useState("");
  const [bulkContent, setBulkContent] = useState("");
  const [values, setValues] = useState("");
  const [corePhilosophy, setCorePhilosophy] = useState("");
  const [founders, setFounders] = useState("");
  const [achievements, setAchievements] = useState("");
  const [products, setProducts] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    authFetch("/api/company")
      .then((r) => r.json())
      .then((d) => {
        if (d.company) {
          setName(d.company.name ?? "");
          setIndustry(d.company.industry ?? "");
          setWebsite(d.company.website ?? "");
        }
        if (d.info) {
          setBulkContent(d.info.bulkContent ?? "");
          setValues(d.info.values ?? "");
          setCorePhilosophy(d.info.corePhilosophy ?? "");
          setFounders(d.info.founders ?? "");
          setAchievements(d.info.achievements ?? "");
          setProducts(d.info.products ?? "");
          setTargetAudience(d.info.targetAudience ?? "");
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true); setMsg(null);
    try {
      const res = await authFetch("/api/company", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: { name, industry, website },
          info: { bulkContent, values, corePhilosophy, founders, achievements, products, targetAudience },
        }),
      });
      const data = await res.json();
      setMsg(data.success ? "✓ Company info saved" : data.error || "Save failed");
    } catch { setMsg("Network error"); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="py-20 text-center text-gray-400"><Loader2 className="mx-auto h-8 w-8 animate-spin" /></div>;

  const input = (label: string, value: string, setter: (v: string) => void, placeholder = "") => (
    <div>
      <label className="mb-1 block text-xs font-semibold text-gray-600">{label}</label>
      <input value={value} onChange={(e) => setter(e.target.value)} placeholder={placeholder}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
    </div>
  );

  const textarea = (label: string, value: string, setter: (v: string) => void, placeholder = "", rows = 3) => (
    <div>
      <label className="mb-1 block text-xs font-semibold text-gray-600">{label}</label>
      <textarea value={value} onChange={(e) => setter(e.target.value)} placeholder={placeholder} rows={rows}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
    </div>
  );

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Company Info</h1>
        <p className="mt-1 text-gray-500">This information powers AI grant matching, ranking, and application writing</p>
      </div>

      {msg && <p className={`mb-4 rounded-lg px-3 py-2 text-sm font-medium ${msg.startsWith("✓") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>{msg}</p>}

      <div className="space-y-6">
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-sm font-bold text-gray-800 uppercase tracking-wide">Basic Details</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {input("Company Name", name, setName, "Your company or organisation name")}
            {input("Industry", industry, setIndustry, "e.g. Healthcare, Education, Technology")}
            {input("Website", website, setWebsite, "https://...")}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-sm font-bold text-gray-800 uppercase tracking-wide">About Your Organisation</h2>
          <div className="space-y-4">
            {textarea("About / Description", bulkContent, setBulkContent, "Describe your organisation in detail — this is the main text the AI uses for context", 5)}
            {textarea("Core Values", values, setValues, "What your organisation stands for")}
            {textarea("Core Philosophy / Mission", corePhilosophy, setCorePhilosophy, "Your guiding principles and mission")}
            {textarea("Founders / Key People", founders, setFounders, "Key team members and their backgrounds")}
            {textarea("Achievements", achievements, setAchievements, "Notable achievements, awards, milestones")}
            {textarea("Products / Services", products, setProducts, "What you offer or deliver")}
            {textarea("Target Audience", targetAudience, setTargetAudience, "Who you serve")}
          </div>
        </div>

        <button onClick={save} disabled={saving}
          className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Company Info
        </button>
      </div>
    </div>
  );
}
