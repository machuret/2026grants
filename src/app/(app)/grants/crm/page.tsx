"use client";

import { useState } from "react";
import { Loader2, GripVertical, ExternalLink, PenLine, ChevronDown, ChevronUp } from "lucide-react";
import { useGrants, type Grant } from "@/hooks/useGrants";
import { CRM_STATUS_STYLES } from "../components/grantTypes";
import type { CrmStatus } from "../components/grantTypes";

const COLUMNS: { status: NonNullable<CrmStatus>; label: string; color: string }[] = [
  { status: "Researching", label: "Researching", color: "border-blue-300 bg-blue-50" },
  { status: "Pipeline", label: "Pipeline", color: "border-purple-300 bg-purple-50" },
  { status: "Active", label: "Active", color: "border-brand-300 bg-brand-50" },
  { status: "Submitted", label: "Submitted", color: "border-orange-300 bg-orange-50" },
  { status: "Won", label: "Won", color: "border-green-300 bg-green-50" },
  { status: "Lost", label: "Lost", color: "border-gray-300 bg-gray-100" },
];

export default function CrmPage() {
  const { grants, loading, updateGrant } = useGrants();
  const [moving, setMoving] = useState<string | null>(null);
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());

  const crmGrants = grants.filter((g) => !!g.crmStatus);

  const moveGrant = async (id: string, status: NonNullable<CrmStatus>) => {
    setMoving(id);
    await updateGrant(id, { crmStatus: status });
    setMoving(null);
  };

  const toggleNotes = (id: string) => {
    setExpandedNotes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  if (loading) {
    return <div className="py-20 text-center text-gray-400"><Loader2 className="mx-auto h-8 w-8 animate-spin mb-3" />Loading CRM…</div>;
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Grants CRM</h1>
        <p className="mt-1 text-gray-500">Manage your grant pipeline — {crmGrants.length} grant{crmGrants.length !== 1 ? "s" : ""} in CRM</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {COLUMNS.map((col) => {
          const items = crmGrants.filter((g) => g.crmStatus === col.status);
          return (
            <div key={col.status} className={`rounded-xl border-2 ${col.color} p-3 min-h-[200px]`}>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-800">{col.label}</h3>
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold ${CRM_STATUS_STYLES[col.status]}`}>{items.length}</span>
              </div>
              <div className="space-y-2">
                {items.map((grant) => (
                  <div key={grant.id} className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
                    <div className="flex items-start gap-2">
                      <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-gray-300" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">{grant.name}</p>
                        {grant.founder && <p className="text-xs text-gray-400 truncate">{grant.founder}</p>}
                        {grant.amount && <p className="text-xs text-gray-600 mt-1">{grant.amount}</p>}
                        {grant.deadlineDate && (
                          <p className="text-xs text-orange-600 mt-1">
                            Due {new Date(grant.deadlineDate).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                          </p>
                        )}
                      </div>
                    </div>

                    {expandedNotes.has(grant.id) && (
                      <div className="mt-2 pt-2 border-t border-gray-100">
                        <textarea
                          value={grant.crmNotes ?? ""}
                          onChange={(e) => updateGrant(grant.id, { crmNotes: e.target.value })}
                          placeholder="Add CRM notes..."
                          rows={2}
                          className="w-full rounded border border-gray-200 px-2 py-1 text-xs focus:border-brand-500 focus:outline-none"
                        />
                      </div>
                    )}

                    <div className="mt-2 flex items-center gap-1 flex-wrap">
                      {grant.url && (
                        <a href={grant.url} target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:text-brand-600">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                      <a href={`/grants/builder?grantId=${grant.id}`} className="text-emerald-400 hover:text-emerald-600">
                        <PenLine className="h-3.5 w-3.5" />
                      </a>
                      <button onClick={() => toggleNotes(grant.id)} className="text-gray-400 hover:text-gray-600">
                        {expandedNotes.has(grant.id) ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </button>

                      {moving === grant.id ? (
                        <Loader2 className="ml-auto h-3.5 w-3.5 animate-spin text-gray-400" />
                      ) : (
                        <select
                          value={grant.crmStatus ?? ""}
                          onChange={(e) => moveGrant(grant.id, e.target.value as NonNullable<CrmStatus>)}
                          className="ml-auto rounded border border-gray-200 px-1 py-0.5 text-[10px] text-gray-600 focus:outline-none"
                        >
                          {COLUMNS.map((c) => (
                            <option key={c.status} value={c.status}>{c.label}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                ))}
                {items.length === 0 && (
                  <p className="py-4 text-center text-xs text-gray-400">No grants</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
