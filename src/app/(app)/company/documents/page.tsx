"use client";

import { useEffect, useState } from "react";
import { Loader2, CheckCircle, XCircle, FileText, AlertCircle } from "lucide-react";
import { authFetch } from "@/lib/authFetch";

interface DocItem {
  docType: string;
  label: string;
  description: string;
  category: string;
}

const DOC_TYPES: DocItem[] = [
  // Legal
  { docType: "incorporation", label: "Certificate of Incorporation", description: "Legal registration document", category: "Legal" },
  { docType: "constitution", label: "Constitution / Rules", description: "Governing document", category: "Legal" },
  { docType: "tax_id", label: "Tax ID / ABN", description: "Tax registration number", category: "Legal" },
  { docType: "board_list", label: "Board / Committee List", description: "Current board members with roles", category: "Legal" },
  { docType: "compliance_statement", label: "Compliance Statement", description: "Regulatory compliance declaration", category: "Legal" },
  // Financial
  { docType: "financial_statements", label: "Financial Statements", description: "Most recent year P&L and balance sheet", category: "Financial" },
  { docType: "audit", label: "Audited Accounts", description: "Independent audit report", category: "Financial" },
  { docType: "annual_report", label: "Annual Report", description: "Most recent annual report", category: "Financial" },
  { docType: "project_budget", label: "Project Budget Template", description: "Detailed budget for grant projects", category: "Financial" },
  { docType: "insurance", label: "Insurance Certificate", description: "Public liability and other insurance", category: "Financial" },
  // Operational
  { docType: "strategic_plan", label: "Strategic Plan", description: "Organisational strategy document", category: "Operational" },
  { docType: "logic_model", label: "Logic Model / Theory of Change", description: "Program logic framework", category: "Operational" },
  { docType: "safeguarding_policy", label: "Safeguarding Policy", description: "Child/vulnerable person protection policy", category: "Operational" },
  { docType: "impact_report", label: "Impact Report", description: "Evidence of outcomes and impact", category: "Operational" },
  { docType: "cv_key_staff", label: "CVs — Key Staff", description: "Resumes of project leads", category: "Operational" },
  { docType: "letters_of_support", label: "Letters of Support", description: "Partner/stakeholder endorsement letters", category: "Operational" },
];

const CATEGORIES = ["Legal", "Financial", "Operational"];

interface DocRecord {
  docType: string;
  available: boolean;
  notes?: string | null;
  expiresAt?: string | null;
  updatedAt: string;
}

export default function DocumentInventoryPage() {
  const [docs, setDocs] = useState<Record<string, DocRecord>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    authFetch("/api/company/documents")
      .then(r => r.json())
      .then(d => {
        const map: Record<string, DocRecord> = {};
        for (const doc of d.documents ?? []) map[doc.docType] = doc;
        setDocs(map);
      })
      .finally(() => setLoading(false));
  }, []);

  const toggle = async (docType: string, available: boolean) => {
    setSaving(docType);
    const current = docs[docType];
    const optimistic = { docType, available, notes: current?.notes ?? null, expiresAt: current?.expiresAt ?? null, updatedAt: new Date().toISOString() };
    setDocs(prev => ({ ...prev, [docType]: optimistic }));
    try {
      const res = await authFetch("/api/company/documents", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ docType, available, notes: current?.notes }),
      });
      const data = await res.json();
      if (data.success) setDocs(prev => ({ ...prev, [docType]: data.document }));
    } catch { /* revert on error */ }
    finally { setSaving(null); }
  };

  const updateNotes = async (docType: string, notes: string) => {
    const current = docs[docType];
    setSaving(docType);
    try {
      const res = await authFetch("/api/company/documents", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ docType, available: current?.available ?? false, notes }),
      });
      const data = await res.json();
      if (data.success) setDocs(prev => ({ ...prev, [docType]: data.document }));
    } finally { setSaving(null); }
  };

  const available = Object.values(docs).filter(d => d.available).length;
  const total = DOC_TYPES.length;
  const pct = Math.round((available / total) * 100);

  if (loading) return <div className="py-20 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-gray-400" /></div>;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Document Inventory</h1>
          <p className="mt-1 text-gray-500">Track which documents your organisation has ready for grant applications</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-brand-600">{available}<span className="text-base font-normal text-gray-400">/{total}</span></p>
          <p className="text-xs text-gray-400">Documents ready</p>
          <div className="mt-1 h-1.5 w-24 rounded-full bg-gray-200 ml-auto">
            <div className="h-1.5 rounded-full bg-brand-500 transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      {available < total * 0.5 && (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-orange-200 bg-orange-50 p-4">
          <AlertCircle className="h-5 w-5 shrink-0 text-orange-500 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-orange-800">Document gaps detected</p>
            <p className="text-xs text-orange-600 mt-0.5">Many grant applications require these documents. Completing your inventory helps the AI identify which grants you can realistically apply for.</p>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {CATEGORIES.map(category => (
          <div key={category} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="border-b border-gray-100 bg-gray-50 px-5 py-3">
              <h2 className="text-sm font-bold uppercase tracking-wide text-gray-700">{category}</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {DOC_TYPES.filter(d => d.category === category).map(docDef => {
                const record = docs[docDef.docType];
                const isAvailable = record?.available ?? false;
                const isSaving = saving === docDef.docType;

                return (
                  <div key={docDef.docType} className={`flex items-start gap-4 px-5 py-4 transition-colors ${isAvailable ? "bg-green-50/30" : ""}`}>
                    <div className="mt-0.5">
                      {isSaving ? (
                        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                      ) : isAvailable ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-gray-300" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <FileText className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                        <p className="text-sm font-medium text-gray-900">{docDef.label}</p>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{docDef.description}</p>
                      {isAvailable && (
                        <input
                          defaultValue={record?.notes ?? ""}
                          onBlur={e => { if (e.target.value !== (record?.notes ?? "")) updateNotes(docDef.docType, e.target.value); }}
                          placeholder="Add notes (e.g. expires Dec 2025, version 3)"
                          className="mt-2 w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-600 focus:border-brand-400 focus:outline-none"
                        />
                      )}
                    </div>
                    <button
                      onClick={() => toggle(docDef.docType, !isAvailable)}
                      disabled={isSaving}
                      className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                        isAvailable
                          ? "bg-green-100 text-green-700 hover:bg-green-200"
                          : "bg-gray-100 text-gray-600 hover:bg-brand-50 hover:text-brand-700"
                      }`}
                    >
                      {isAvailable ? "Have it" : "Mark ready"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
