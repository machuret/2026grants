"use client";

import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { authFetch } from "@/lib/authFetch";

interface Profile {
  orgDescription: string;
  missionStatement: string;
  pastProjects: string;
  targetRegions: string;
  teamCapabilities: string;
  annualBudget: string;
  preferredGrantSize: string;
  focusAreas: string;
}

const EMPTY: Profile = {
  orgDescription: "", missionStatement: "", pastProjects: "",
  targetRegions: "", teamCapabilities: "", annualBudget: "",
  preferredGrantSize: "", focusAreas: "",
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    authFetch("/api/grants/profile")
      .then((r) => r.json())
      .then((d) => { if (d.profile) setProfile({ ...EMPTY, ...d.profile }); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true); setMsg(null);
    try {
      const res = await authFetch("/api/grants/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      const data = await res.json();
      setMsg(data.success ? "✓ Profile saved" : data.error || "Save failed");
    } catch { setMsg("Network error"); }
    finally { setSaving(false); }
  };

  const set = (k: keyof Profile, v: string) => setProfile((p) => ({ ...p, [k]: v }));

  const field = (label: string, key: keyof Profile, placeholder: string, rows = 3) => (
    <div>
      <label className="mb-1 block text-xs font-semibold text-gray-600">{label}</label>
      <textarea value={profile[key]} onChange={(e) => set(key, e.target.value)} placeholder={placeholder} rows={rows}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
    </div>
  );

  if (loading) return <div className="py-20 text-center text-gray-400"><Loader2 className="mx-auto h-8 w-8 animate-spin" /></div>;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Grant Profile</h1>
        <p className="mt-1 text-gray-500">Help AI match and rank grants by describing your organisation</p>
      </div>

      {msg && <p className={`mb-4 rounded-lg px-3 py-2 text-sm font-medium ${msg.startsWith("✓") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>{msg}</p>}

      <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-6">
        {field("Organisation Description", "orgDescription", "Describe what your organisation does, its size, and history", 4)}
        {field("Mission Statement", "missionStatement", "Your core mission and purpose")}
        {field("Focus Areas", "focusAreas", "e.g. Health, Education, Technology, Environment")}
        {field("Past Projects", "pastProjects", "Describe relevant past projects and outcomes", 4)}
        {field("Target Regions", "targetRegions", "e.g. Australia, Asia-Pacific, Global")}
        {field("Team Capabilities", "teamCapabilities", "Key team skills, qualifications, experience")}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">Annual Budget</label>
            <input value={profile.annualBudget} onChange={(e) => set("annualBudget", e.target.value)} placeholder="e.g. $500,000"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">Preferred Grant Size</label>
            <input value={profile.preferredGrantSize} onChange={(e) => set("preferredGrantSize", e.target.value)} placeholder="e.g. $50,000 - $200,000"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
          </div>
        </div>

        <button onClick={save} disabled={saving}
          className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Profile
        </button>
      </div>
    </div>
  );
}
