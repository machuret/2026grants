"use client";

import { useEffect, useState } from "react";
import { Loader2, Save, Building2, FileText } from "lucide-react";
import { authFetch } from "@/lib/authFetch";

// ── Types ──────────────────────────────────────────────────────────────────

interface StructuredProfile {
  legalEntityType: string;
  jurisdiction: string;
  taxStatus: string;
  yearsFounded: string;
  employeeCount: string;
  annualRevenue: string;
  annualBudget: string;
  registrationStatus: string;
  hasAuditedAccounts: boolean;
  hasFinancialStatements: boolean;
  hasInsurance: boolean;
  hasSafeguardingPolicy: boolean;
  hasLogicModel: boolean;
  priorGrantWins: string;
  missionAreas: string;
  beneficiaryPopulation: string;
  geographiesServed: string;
  geographiesRegistered: string;
  proposalWriterAvailable: boolean;
  readinessScore: number;
}

interface NarrativeProfile {
  orgDescription: string;
  missionStatement: string;
  pastProjects: string;
  targetRegions: string;
  teamCapabilities: string;
  annualBudget: string;
  preferredGrantSize: string;
  focusAreas: string;
}

const EMPTY_STRUCTURED: StructuredProfile = {
  legalEntityType: "", jurisdiction: "", taxStatus: "", yearsFounded: "",
  employeeCount: "", annualRevenue: "", annualBudget: "", registrationStatus: "",
  hasAuditedAccounts: false, hasFinancialStatements: false, hasInsurance: false,
  hasSafeguardingPolicy: false, hasLogicModel: false, priorGrantWins: "",
  missionAreas: "", beneficiaryPopulation: "", geographiesServed: "",
  geographiesRegistered: "", proposalWriterAvailable: false, readinessScore: 0,
};

const EMPTY_NARRATIVE: NarrativeProfile = {
  orgDescription: "", missionStatement: "", pastProjects: "",
  targetRegions: "", teamCapabilities: "", annualBudget: "",
  preferredGrantSize: "", focusAreas: "",
};

// ── Helpers ────────────────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 75 ? "bg-green-100 text-green-700 border-green-200" :
    score >= 50 ? "bg-yellow-100 text-yellow-700 border-yellow-200" :
                  "bg-red-100 text-red-700 border-red-200";
  const label = score >= 75 ? "High Readiness" : score >= 50 ? "Moderate" : "Low Readiness";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold ${color}`}>
      <span className="h-2 w-2 rounded-full bg-current opacity-80" />
      {score}% — {label}
    </span>
  );
}

function TextField({
  label, value, onChange, placeholder, rows = 3,
}: { label: string; value: string; onChange: (v: string) => void; placeholder: string; rows?: number }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-gray-600">{label}</label>
      <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function UnifiedProfilePage() {
  const [activeTab, setActiveTab] = useState<"structured" | "narrative">("structured");
  const [structured, setStructured] = useState<StructuredProfile>(EMPTY_STRUCTURED);
  const [narrative, setNarrative] = useState<NarrativeProfile>(EMPTY_NARRATIVE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      authFetch("/api/company/profile").then(r => r.json()),
      authFetch("/api/grants/profile").then(r => r.json()),
    ]).then(([structData, narData]) => {
      if (structData.profile) setStructured({ ...EMPTY_STRUCTURED, ...structData.profile });
      if (narData.profile) setNarrative({ ...EMPTY_NARRATIVE, ...narData.profile });
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const setS = (k: keyof StructuredProfile, v: string | boolean | number) =>
    setStructured(p => ({ ...p, [k]: v }));
  const setN = (k: keyof NarrativeProfile, v: string) =>
    setNarrative(p => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true); setMsg(null);
    try {
      const endpoint = activeTab === "structured" ? "/api/company/profile" : "/api/grants/profile";
      const payload = activeTab === "structured" ? structured : narrative;
      const res = await authFetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        if (data.profile?.readinessScore !== undefined) {
          setStructured(p => ({ ...p, readinessScore: data.profile.readinessScore }));
        }
        setMsg("✓ Profile saved");
      } else {
        setMsg(data.error || "Save failed");
      }
    } catch { setMsg("Network error"); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <div className="py-20 text-center text-gray-400">
      <Loader2 className="mx-auto h-8 w-8 animate-spin" />
    </div>
  );

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Organisation Profile</h1>
        <p className="mt-1 text-gray-500">
          Help the AI match and rank grants for your organisation
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1">
        <button
          onClick={() => { setActiveTab("structured"); setMsg(null); }}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
            activeTab === "structured"
              ? "bg-white shadow text-brand-700 border border-gray-200"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <Building2 className="h-4 w-4" />
          Structured Profile
          {structured.readinessScore > 0 && (
            <span className="ml-1 rounded-full bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-700">
              {structured.readinessScore}%
            </span>
          )}
        </button>
        <button
          onClick={() => { setActiveTab("narrative"); setMsg(null); }}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
            activeTab === "narrative"
              ? "bg-white shadow text-brand-700 border border-gray-200"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <FileText className="h-4 w-4" />
          Narrative Profile
        </button>
      </div>

      {msg && (
        <p className={`mb-4 rounded-lg px-3 py-2 text-sm font-medium ${
          msg.startsWith("✓") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
        }`}>{msg}</p>
      )}

      {/* Structured Tab */}
      {activeTab === "structured" && (
        <div className="space-y-6 rounded-xl border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Organisation Details</h2>
            <ScoreBadge score={structured.readinessScore} />
          </div>

          {/* Legal */}
          <div>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-400">Legal &amp; Structure</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Legal Entity Type</label>
                <select value={structured.legalEntityType} onChange={e => setS("legalEntityType", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none">
                  <option value="">Select…</option>
                  {["Incorporated Association","Company Limited by Guarantee","Public Benevolent Institution","Trust","Cooperative","Indigenous Corporation","Social Enterprise","For-Profit Company","Partnership","Sole Trader"].map(o => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Tax Status</label>
                <select value={structured.taxStatus} onChange={e => setS("taxStatus", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none">
                  <option value="">Select…</option>
                  {["Tax-Exempt Non-Profit","DGR Item 1","DGR Item 2","Taxable For-Profit","GST Registered","GST Exempt"].map(o => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Jurisdiction</label>
                <input value={structured.jurisdiction} onChange={e => setS("jurisdiction", e.target.value)}
                  placeholder="e.g. NSW, VIC, Australia"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Registration Status</label>
                <select value={structured.registrationStatus} onChange={e => setS("registrationStatus", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none">
                  <option value="">Select…</option>
                  {["Registered","Pending","Unincorporated","Deregistered"].map(o => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Financials */}
          <div>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-400">Financials &amp; Scale</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Year Founded</label>
                <input type="number" min="1800" max={new Date().getFullYear()} value={structured.yearsFounded}
                  onChange={e => setS("yearsFounded", e.target.value)} placeholder="e.g. 2010"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Employee Count</label>
                <input type="number" min="0" value={structured.employeeCount}
                  onChange={e => setS("employeeCount", e.target.value)} placeholder="e.g. 25"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Annual Revenue (AUD)</label>
                <input type="number" min="0" value={structured.annualRevenue}
                  onChange={e => setS("annualRevenue", e.target.value)} placeholder="e.g. 500000"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Annual Budget (AUD)</label>
                <input type="number" min="0" value={structured.annualBudget}
                  onChange={e => setS("annualBudget", e.target.value)} placeholder="e.g. 350000"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Prior Grant Wins</label>
                <input type="number" min="0" value={structured.priorGrantWins}
                  onChange={e => setS("priorGrantWins", e.target.value)} placeholder="e.g. 5"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
              </div>
            </div>
          </div>

          {/* Mission */}
          <div>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-400">Mission &amp; Geography</h3>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Mission / Focus Areas</label>
                <input value={structured.missionAreas} onChange={e => setS("missionAreas", e.target.value)}
                  placeholder="e.g. Health, Education, Environment (comma-separated)"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Beneficiary Populations</label>
                <input value={structured.beneficiaryPopulation} onChange={e => setS("beneficiaryPopulation", e.target.value)}
                  placeholder="e.g. Youth, Indigenous Australians, Women (comma-separated)"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-600">Geographies Served</label>
                  <input value={structured.geographiesServed} onChange={e => setS("geographiesServed", e.target.value)}
                    placeholder="e.g. Regional NSW, VIC"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-600">Geographies Registered</label>
                  <input value={structured.geographiesRegistered} onChange={e => setS("geographiesRegistered", e.target.value)}
                    placeholder="e.g. Australia"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
                </div>
              </div>
            </div>
          </div>

          {/* Compliance */}
          <div>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-400">Compliance &amp; Readiness</h3>
            <div className="grid grid-cols-2 gap-y-3">
              {([
                ["hasAuditedAccounts", "Audited Accounts"],
                ["hasFinancialStatements", "Financial Statements"],
                ["hasInsurance", "Public Liability Insurance"],
                ["hasSafeguardingPolicy", "Safeguarding Policy"],
                ["hasLogicModel", "Logic Model / Theory of Change"],
                ["proposalWriterAvailable", "Proposal Writer Available"],
              ] as [keyof StructuredProfile, string][]).map(([key, label]) => (
                <label key={key} className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={!!structured[key]} onChange={e => setS(key, e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-brand-600" />
                  {label}
                </label>
              ))}
            </div>
          </div>

          <button onClick={save} disabled={saving}
            className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Structured Profile
          </button>
        </div>
      )}

      {/* Narrative Tab */}
      {activeTab === "narrative" && (
        <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-6">
          <div>
            <h2 className="font-semibold text-gray-900">Narrative Profile</h2>
            <p className="mt-0.5 text-xs text-gray-500">
              Free-text context used by the AI to write grant applications and understand your organisation
            </p>
          </div>

          <TextField label="Organisation Description" value={narrative.orgDescription}
            onChange={v => setN("orgDescription", v)}
            placeholder="Describe what your organisation does, its size, and history" rows={4} />
          <TextField label="Mission Statement" value={narrative.missionStatement}
            onChange={v => setN("missionStatement", v)} placeholder="Your core mission and purpose" />
          <TextField label="Focus Areas" value={narrative.focusAreas}
            onChange={v => setN("focusAreas", v)}
            placeholder="e.g. Health, Education, Technology, Environment" />
          <TextField label="Past Projects &amp; Outcomes" value={narrative.pastProjects}
            onChange={v => setN("pastProjects", v)}
            placeholder="Describe relevant past projects and measurable outcomes" rows={4} />
          <TextField label="Target Regions" value={narrative.targetRegions}
            onChange={v => setN("targetRegions", v)}
            placeholder="e.g. Rural NSW, South-East Asia, Global" />
          <TextField label="Team Capabilities" value={narrative.teamCapabilities}
            onChange={v => setN("teamCapabilities", v)}
            placeholder="Key team skills, qualifications, relevant experience" />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Annual Budget</label>
              <input value={narrative.annualBudget} onChange={e => setN("annualBudget", e.target.value)}
                placeholder="e.g. $500,000"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Preferred Grant Size</label>
              <input value={narrative.preferredGrantSize} onChange={e => setN("preferredGrantSize", e.target.value)}
                placeholder="e.g. $50,000 – $200,000"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
            </div>
          </div>

          <button onClick={save} disabled={saving}
            className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Narrative Profile
          </button>
        </div>
      )}
    </div>
  );
}
