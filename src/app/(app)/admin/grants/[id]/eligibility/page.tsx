"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, Plus, Trash2, ShieldCheck, ShieldAlert, HelpCircle, Save } from "lucide-react";
import { authFetch } from "@/lib/authFetch";

interface EligibilityRule {
  id: string;
  publicGrantId: string;
  field: string;
  operator: string;
  value: string;
  valueType: string;
  isMandatory: boolean;
  confidenceLevel: string;
  evidenceText?: string | null;
  notes?: string | null;
  reviewStatus: string;
}

const FIELDS = [
  "legalEntityType", "jurisdiction", "annualRevenue", "employeeCount",
  "taxStatus", "yearsOperating", "projectGeo", "applicantGeo",
  "beneficiaryType", "coFundingAvailable", "hasAuditedAccounts",
  "hasInsurance", "hasSafeguardingPolicy", "industry", "missionArea",
  "registrationStatus", "priorGrantExperience", "custom",
];
const OPERATORS = ["eq", "in", "gte", "lte", "contains", "not_in", "exists"];
const CONFIDENCE = ["certain", "likely", "uncertain", "unknown"];

const CONFIDENCE_STYLES: Record<string, string> = {
  certain: "bg-green-100 text-green-700",
  likely: "bg-blue-100 text-blue-700",
  uncertain: "bg-yellow-100 text-yellow-700",
  unknown: "bg-gray-100 text-gray-500",
};

const blank = { field: "legalEntityType", operator: "eq", value: "", valueType: "string", isMandatory: true, confidenceLevel: "certain", evidenceText: "", notes: "" };

export default function EligibilityPage() {
  const { id } = useParams<{ id: string }>();
  const [rules, setRules] = useState<EligibilityRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ ...blank });
  const [grantName, setGrantName] = useState("");
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    Promise.all([
      authFetch(`/api/admin/grants/${id}/eligibility`).then(r => r.json()),
      authFetch(`/api/admin/grants/single?id=${id}`).then(r => r.json()),
    ]).then(([rulesData, grantData]) => {
      setRules(rulesData.rules ?? []);
      setGrantName(grantData.grant?.name ?? "");
    }).finally(() => setLoading(false));
  }, [id]);

  const addRule = async () => {
    setSaving(true); setMsg(null);
    try {
      const res = await authFetch(`/api/admin/grants/${id}/eligibility`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setRules(prev => [...prev, data.rule]);
        setForm({ ...blank });
        setShowAdd(false);
        setMsg({ type: "ok", text: "Rule added" });
      } else setMsg({ type: "err", text: data.error || "Failed" });
    } catch { setMsg({ type: "err", text: "Network error" }); }
    finally { setSaving(false); }
  };

  const deleteRule = async (ruleId: string) => {
    setDeleting(ruleId);
    try {
      await authFetch(`/api/admin/grants/${id}/eligibility?ruleId=${ruleId}`, { method: "DELETE" });
      setRules(prev => prev.filter(r => r.id !== ruleId));
    } finally { setDeleting(null); }
  };

  const mandatory = rules.filter(r => r.isMandatory);
  const scoring = rules.filter(r => !r.isMandatory);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <a href="/admin/grants" className="text-sm text-brand-600 hover:underline">← Back to Grants</a>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">Eligibility Rules</h1>
          {grantName && <p className="text-sm text-gray-500 mt-0.5 truncate max-w-xl">{grantName}</p>}
        </div>
        <button onClick={() => setShowAdd(v => !v)}
          className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700">
          <Plus className="h-4 w-4" /> Add Rule
        </button>
      </div>

      {msg && <div className={`mb-4 rounded-lg px-4 py-2.5 text-sm font-medium ${msg.type === "ok" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>{msg.text}</div>}

      {/* Add Rule Form */}
      {showAdd && (
        <div className="mb-6 rounded-xl border border-brand-200 bg-brand-50 p-5">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-brand-800">New Eligibility Rule</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Field *</label>
              <select value={form.field} onChange={e => setForm({ ...form, field: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none">
                {FIELDS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Operator</label>
              <select value={form.operator} onChange={e => setForm({ ...form, operator: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none">
                {OPERATORS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Value</label>
              <input value={form.value} onChange={e => setForm({ ...form, value: e.target.value })}
                placeholder="e.g. nonprofit, 500000, true"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Confidence</label>
              <select value={form.confidenceLevel} onChange={e => setForm({ ...form, confidenceLevel: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none">
                {CONFIDENCE.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-3 pt-5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isMandatory} onChange={e => setForm({ ...form, isMandatory: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-brand-600" />
                <span className="text-sm font-medium text-gray-700">Mandatory</span>
              </label>
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="mb-1 block text-xs font-semibold text-gray-600">Evidence (quote from source)</label>
              <input value={form.evidenceText} onChange={e => setForm({ ...form, evidenceText: e.target.value })}
                placeholder="e.g. 'Applicants must be registered as a not-for-profit organisation'"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="mb-1 block text-xs font-semibold text-gray-600">Notes</label>
              <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                placeholder="Any additional context"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <button onClick={addRule} disabled={saving || !form.field}
              className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Rule
            </button>
            <button onClick={() => setShowAdd(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-gray-400" /></div>
      ) : rules.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center">
          <ShieldCheck className="mx-auto h-10 w-10 text-gray-300 mb-3" />
          <p className="text-gray-400 font-medium">No eligibility rules yet</p>
          <p className="text-sm text-gray-400 mt-1">Add rules to enable accurate company matching</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Mandatory rules */}
          {mandatory.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <ShieldAlert className="h-4 w-4 text-red-500" />
                <h2 className="text-sm font-bold uppercase tracking-wide text-gray-700">Mandatory Criteria ({mandatory.length})</h2>
              </div>
              <div className="space-y-2">
                {mandatory.map(rule => <RuleCard key={rule.id} rule={rule} onDelete={deleteRule} deleting={deleting} />)}
              </div>
            </div>
          )}

          {/* Scoring rules */}
          {scoring.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <HelpCircle className="h-4 w-4 text-blue-500" />
                <h2 className="text-sm font-bold uppercase tracking-wide text-gray-700">Scoring Criteria ({scoring.length})</h2>
              </div>
              <div className="space-y-2">
                {scoring.map(rule => <RuleCard key={rule.id} rule={rule} onDelete={deleteRule} deleting={deleting} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RuleCard({ rule, onDelete, deleting }: { rule: EligibilityRule; onDelete: (id: string) => void; deleting: string | null }) {
  const confStyle = { certain: "bg-green-100 text-green-700", likely: "bg-blue-100 text-blue-700", uncertain: "bg-yellow-100 text-yellow-700", unknown: "bg-gray-100 text-gray-500" }[rule.confidenceLevel] ?? "bg-gray-100 text-gray-500";

  return (
    <div className={`rounded-xl border p-4 ${rule.isMandatory ? "border-red-100 bg-red-50/30" : "border-blue-100 bg-blue-50/20"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <code className="rounded bg-white border border-gray-200 px-2 py-0.5 text-xs font-mono text-gray-800">{rule.field}</code>
            <span className="text-xs text-gray-400">{rule.operator}</span>
            {rule.value && <code className="rounded bg-white border border-gray-200 px-2 py-0.5 text-xs font-mono text-brand-700">{rule.value}</code>}
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${confStyle}`}>{rule.confidenceLevel}</span>
            {rule.reviewStatus === "flagged" && <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-700">flagged</span>}
          </div>
          {rule.evidenceText && (
            <p className="mt-1.5 text-xs text-gray-500 italic border-l-2 border-gray-200 pl-2">"{rule.evidenceText}"</p>
          )}
          {rule.notes && <p className="mt-1 text-xs text-gray-400">{rule.notes}</p>}
        </div>
        <button onClick={() => onDelete(rule.id)} disabled={deleting === rule.id}
          className="shrink-0 rounded-lg p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-500 disabled:opacity-40">
          {deleting === rule.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
}
