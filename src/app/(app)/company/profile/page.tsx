"use client";

import { useEffect, useState } from "react";
import { Loader2, Save, CheckCircle } from "lucide-react";
import { authFetch } from "@/lib/authFetch";

const LEGAL_TYPES = ["nonprofit", "charity", "pty_ltd", "university", "hospital", "government", "individual", "other"];
const TAX_STATUSES = ["tax_exempt", "taxable", "deductible_gift_recipient", "unknown"];
const MISSION_AREAS = ["Health", "Education", "Environment", "Technology", "Arts & Culture", "Social Services", "Research", "Agriculture", "Housing", "Employment", "Disability", "Indigenous", "Youth", "Aged Care", "International Development"];
const BENEFICIARIES = ["General public", "Children & youth", "Elderly", "People with disability", "Indigenous communities", "Women", "LGBTIQ+", "Migrants & refugees", "Low-income households", "Rural & remote communities", "International communities"];

interface Profile {
  legalEntityType?: string;
  jurisdiction?: string;
  registrationNumber?: string;
  taxStatus?: string;
  abn?: string;
  yearsFounded?: number;
  employeeCount?: number;
  annualRevenue?: number;
  annualBudget?: number;
  hasAuditedAccounts?: boolean;
  hasFinancialStatements?: boolean;
  hasInsurance?: boolean;
  priorGrantWins?: number;
  missionStatement?: string;
  missionAreas?: string[];
  focusAreas?: string[];
  beneficiaryPopulation?: string[];
  geographiesServed?: string[];
  geographiesRegistered?: string[];
  proposalWriterAvailable?: boolean;
  hasLogicModel?: boolean;
  hasSafeguardingPolicy?: boolean;
  readinessScore?: number;
}

export default function CompanyProfilePage() {
  const [profile, setProfile] = useState<Profile>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    authFetch("/api/company/profile")
      .then(r => r.json())
      .then(d => { if (d.profile) setProfile(d.profile); })
      .finally(() => setLoading(false));
  }, []);

  const set = (key: keyof Profile, value: unknown) => setProfile(prev => ({ ...prev, [key]: value }));

  const toggleArray = (key: keyof Profile, val: string) => {
    const arr = (profile[key] as string[]) ?? [];
    set(key, arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val]);
  };

  const save = async () => {
    setSaving(true); setSaved(false);
    try {
      const res = await authFetch("/api/company/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      const data = await res.json();
      if (data.success) { setProfile(data.profile); setSaved(true); setTimeout(() => setSaved(false), 3000); }
    } finally { setSaving(false); }
  };

  const score = profile.readinessScore ?? 0;
  const scoreColor = score >= 70 ? "text-green-600" : score >= 40 ? "text-yellow-600" : "text-red-500";
  const scoreBarColor = score >= 70 ? "bg-green-500" : score >= 40 ? "bg-yellow-400" : "bg-red-400";

  if (loading) return <div className="py-20 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-gray-400" /></div>;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Organisation Profile</h1>
          <p className="mt-1 text-gray-500">Structured profile used for grant eligibility matching</p>
        </div>
        <div className="text-right">
          <p className={`text-3xl font-bold ${scoreColor}`}>{score}<span className="text-base font-normal text-gray-400">/100</span></p>
          <p className="text-xs text-gray-400">Readiness Score</p>
          <div className="mt-1 h-1.5 w-24 rounded-full bg-gray-200 ml-auto">
            <div className={`h-1.5 rounded-full ${scoreBarColor} transition-all`} style={{ width: `${score}%` }} />
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Legal & Registration */}
        <Section title="Legal & Registration">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Legal Entity Type">
              <select value={profile.legalEntityType ?? ""} onChange={e => set("legalEntityType", e.target.value)} className={selectCls}>
                <option value="">Select type</option>
                {LEGAL_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
              </select>
            </Field>
            <Field label="Jurisdiction (country of registration)">
              <input value={profile.jurisdiction ?? ""} onChange={e => set("jurisdiction", e.target.value)} placeholder="e.g. Australia" className={inputCls} />
            </Field>
            <Field label="Registration / Charity Number">
              <input value={profile.registrationNumber ?? ""} onChange={e => set("registrationNumber", e.target.value)} placeholder="e.g. ACNC number" className={inputCls} />
            </Field>
            <Field label="Tax Status">
              <select value={profile.taxStatus ?? ""} onChange={e => set("taxStatus", e.target.value)} className={selectCls}>
                <option value="">Select status</option>
                {TAX_STATUSES.map(t => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
              </select>
            </Field>
            <Field label="ABN">
              <input value={profile.abn ?? ""} onChange={e => set("abn", e.target.value)} placeholder="Australian Business Number" className={inputCls} />
            </Field>
          </div>
        </Section>

        {/* Size & Financials */}
        <Section title="Size & Financials">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Year Founded">
              <input type="number" value={profile.yearsFounded ?? ""} onChange={e => set("yearsFounded", parseInt(e.target.value))} placeholder="e.g. 2015" className={inputCls} />
            </Field>
            <Field label="Employee Count">
              <input type="number" value={profile.employeeCount ?? ""} onChange={e => set("employeeCount", parseInt(e.target.value))} placeholder="Full-time equivalent" className={inputCls} />
            </Field>
            <Field label="Annual Revenue ($)">
              <input type="number" value={profile.annualRevenue ?? ""} onChange={e => set("annualRevenue", parseInt(e.target.value))} placeholder="e.g. 500000" className={inputCls} />
            </Field>
            <Field label="Annual Budget ($)">
              <input type="number" value={profile.annualBudget ?? ""} onChange={e => set("annualBudget", parseInt(e.target.value))} placeholder="e.g. 400000" className={inputCls} />
            </Field>
            <Field label="Prior Grant Wins">
              <input type="number" value={profile.priorGrantWins ?? ""} onChange={e => set("priorGrantWins", parseInt(e.target.value))} placeholder="Number of grants won" className={inputCls} />
            </Field>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {([
              ["hasAuditedAccounts", "Has Audited Accounts"],
              ["hasFinancialStatements", "Has Financial Statements"],
              ["hasInsurance", "Has Insurance"],
              ["proposalWriterAvailable", "Proposal Writer Available"],
              ["hasLogicModel", "Has Logic Model"],
              ["hasSafeguardingPolicy", "Has Safeguarding Policy"],
            ] as [keyof Profile, string][]).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={!!(profile[key])} onChange={e => set(key, e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-brand-600" />
                <span className="text-sm text-gray-700">{label}</span>
              </label>
            ))}
          </div>
        </Section>

        {/* Mission & Focus */}
        <Section title="Mission & Focus">
          <Field label="Mission Statement">
            <textarea value={profile.missionStatement ?? ""} onChange={e => set("missionStatement", e.target.value)}
              rows={3} placeholder="Describe your organisation's mission and purpose"
              className={`${inputCls} resize-none`} />
          </Field>
          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold text-gray-600">Mission Areas (select all that apply)</p>
            <div className="flex flex-wrap gap-2">
              {MISSION_AREAS.map(area => {
                const active = (profile.missionAreas ?? []).includes(area);
                return (
                  <button key={area} type="button" onClick={() => toggleArray("missionAreas", area)}
                    className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${active ? "bg-brand-600 text-white border-brand-600" : "bg-white text-gray-600 border-gray-300 hover:border-brand-400"}`}>
                    {area}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold text-gray-600">Beneficiary Population</p>
            <div className="flex flex-wrap gap-2">
              {BENEFICIARIES.map(b => {
                const active = (profile.beneficiaryPopulation ?? []).includes(b);
                return (
                  <button key={b} type="button" onClick={() => toggleArray("beneficiaryPopulation", b)}
                    className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${active ? "bg-purple-600 text-white border-purple-600" : "bg-white text-gray-600 border-gray-300 hover:border-purple-400"}`}>
                    {b}
                  </button>
                );
              })}
            </div>
          </div>
        </Section>

        {/* Geography */}
        <Section title="Geography">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Countries/Regions where registered">
              <input value={(profile.geographiesRegistered ?? []).join(", ")}
                onChange={e => set("geographiesRegistered", e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
                placeholder="e.g. Australia, New Zealand" className={inputCls} />
              <p className="mt-1 text-[10px] text-gray-400">Comma separated</p>
            </Field>
            <Field label="Countries/Regions where you deliver programs">
              <input value={(profile.geographiesServed ?? []).join(", ")}
                onChange={e => set("geographiesServed", e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
                placeholder="e.g. Australia, Kenya, PNG" className={inputCls} />
              <p className="mt-1 text-[10px] text-gray-400">Comma separated</p>
            </Field>
          </div>
        </Section>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button onClick={save} disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Profile
        </button>
        {saved && <span className="flex items-center gap-1.5 text-sm text-green-600"><CheckCircle className="h-4 w-4" /> Saved</span>}
      </div>
    </div>
  );
}

const inputCls = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";
const selectCls = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none capitalize";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-700">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-gray-600">{label}</label>
      {children}
    </div>
  );
}
