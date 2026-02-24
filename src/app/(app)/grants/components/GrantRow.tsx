"use client";

import { useState } from "react";
import {
  ExternalLink, Trash2, ChevronDown, ChevronUp,
  Loader2, Save, PenLine, KanbanSquare, FileText,
} from "lucide-react";
import type { Grant } from "@/hooks/useGrants";
import { FitStars, DecisionBadge, EffortBadge, DeadlineBadge } from "./GrantBadges";
import { GrantFormFields } from "./GrantFormFields";
import { MatchBreakdown, MatchScorePill, type MatchData } from "./MatchScoreBadge";
import type { Effort } from "./grantTypes";

interface Props {
  grant: Grant;
  onUpdate: (id: string, d: Partial<Grant>) => Promise<{ success: boolean; grant?: Grant }>;
  onDelete: (id: string) => Promise<{ success: boolean }>;
  selected?: boolean;
  onToggleSelect?: () => void;
  matchData?: MatchData;
}

export function GrantRow({ grant, onUpdate, onDelete, selected, onToggleSelect, matchData }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<Grant>>({ ...grant });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [sendingToCrm, setSendingToCrm] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const inCrm = !!grant.crmStatus;
  const set = (k: keyof Grant, v: unknown) => setForm((p) => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const result = await onUpdate(grant.id, form);
      if (result.success) {
        setEditing(false);
        setForm({ ...form, ...result.grant });
      } else {
        setSaveError("Save failed — please try again.");
      }
    } catch {
      setSaveError("Network error — changes were not saved.");
    } finally { setSaving(false); }
  };

  const del = async () => {
    if (!confirm(`Delete "${grant.name}"?`)) return;
    setDeleting(true);
    try { await onDelete(grant.id); }
    finally { setDeleting(false); }
  };

  const sendToCrm = async () => {
    setSendingToCrm(true);
    try { await onUpdate(grant.id, { crmStatus: "Researching" }); }
    finally { setSendingToCrm(false); }
  };

  return (
    <>
      <tr className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${expanded ? "bg-gray-50" : ""} ${selected ? "bg-brand-50" : ""}`}>
        {onToggleSelect && (
          <td className="px-2 py-3 w-8">
            <input type="checkbox" checked={!!selected} onChange={onToggleSelect}
              className="h-3.5 w-3.5 rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
          </td>
        )}
        <td className="px-4 py-3">
          <div className="flex items-start gap-2">
            <button onClick={() => setExpanded(v => !v)} className="mt-0.5 shrink-0 text-gray-400 hover:text-brand-600">
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium text-gray-900 text-sm">{grant.name}</p>
                {grant.crmStatus && (
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    grant.crmStatus === "Won" ? "bg-green-100 text-green-700" :
                    grant.crmStatus === "Lost" ? "bg-gray-100 text-gray-500" :
                    grant.crmStatus === "Active" ? "bg-brand-100 text-brand-700" :
                    grant.crmStatus === "Submitted" ? "bg-orange-100 text-orange-700" :
                    grant.crmStatus === "Pipeline" ? "bg-purple-100 text-purple-700" :
                    "bg-blue-100 text-blue-700"
                  }`}>{grant.crmStatus}</span>
                )}
              </div>
              {grant.founder && <p className="text-xs text-gray-400 mt-0.5">{grant.founder}</p>}
            </div>
          </div>
        </td>
        <td className="px-3 py-3 text-xs text-gray-600 whitespace-nowrap">{grant.geographicScope || <span className="text-gray-300">—</span>}</td>
        <td className="px-3 py-3 whitespace-nowrap"><DeadlineBadge date={grant.deadlineDate} /></td>
        <td className="px-3 py-3 text-sm text-gray-700 whitespace-nowrap">{grant.amount || <span className="text-gray-300">—</span>}</td>
        <td className="px-3 py-3">
          {matchData ? (
            <MatchScorePill score={matchData.overallScore} stale={matchData.stale} />
          ) : grant.matchScore != null ? (
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-16 rounded-full bg-gray-200">
                <div className={`h-1.5 rounded-full ${grant.matchScore >= 70 ? "bg-green-500" : grant.matchScore >= 40 ? "bg-yellow-400" : "bg-red-400"}`} style={{ width: `${grant.matchScore}%` }} />
              </div>
              <span className="text-xs font-semibold text-gray-700">{grant.matchScore}</span>
            </div>
          ) : <span className="text-gray-300 text-xs">—</span>}
        </td>
        <td className="px-3 py-3"><FitStars value={grant.fitScore} /></td>
        <td className="px-3 py-3"><EffortBadge value={grant.submissionEffort as Effort | null} /></td>
        <td className="px-3 py-3"><DecisionBadge value={grant.decision ?? null} /></td>
        <td className="px-3 py-3">
          <div className="flex items-center gap-1.5">
            {grant.url && (
              <a href={grant.url} target="_blank" rel="noopener noreferrer" title="Open URL" className="text-brand-500 hover:text-brand-700">
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
            <button onClick={() => { setEditing(true); setExpanded(true); }} title="Edit" className="text-gray-400 hover:text-brand-600">
              <FileText className="h-4 w-4" />
            </button>
            <a href={`/grants/builder?grantId=${grant.id}`} title="Write Application" className="text-emerald-400 hover:text-emerald-600">
              <PenLine className="h-4 w-4" />
            </a>
            {inCrm ? (
              <a href="/grants/crm" title="View in CRM" className="text-indigo-400 hover:text-indigo-600">
                <KanbanSquare className="h-4 w-4" />
              </a>
            ) : (
              <button onClick={sendToCrm} disabled={sendingToCrm} title="Send to CRM" className="text-indigo-300 hover:text-indigo-500 disabled:opacity-40">
                {sendingToCrm ? <Loader2 className="h-4 w-4 animate-spin" /> : <KanbanSquare className="h-4 w-4" />}
              </button>
            )}
            <button onClick={del} disabled={deleting} title="Delete" className="text-gray-300 hover:text-red-500 disabled:opacity-40">
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </button>
          </div>
        </td>
      </tr>

      {expanded && (
        <tr className="border-b border-gray-100 bg-gray-50">
          <td colSpan={10} className="px-6 py-5">
            {saveError && <p className="mb-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700 font-medium">{saveError}</p>}
            {editing ? (
              <div>
                <GrantFormFields form={form} set={set} />
                <div className="mt-4 flex gap-2">
                  <button onClick={save} disabled={saving} className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Changes
                  </button>
                  <button onClick={() => { setEditing(false); setForm({ ...grant }); setSaveError(null); }} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-white">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <div className="space-y-3">
                  {grant.eligibility && <div><p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Eligibility</p><p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">{grant.eligibility}</p></div>}
                  {grant.howToApply && <div><p className="text-xs font-semibold uppercase tracking-wide text-gray-400">How to Apply</p><p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">{grant.howToApply}</p></div>}
                  {grant.geographicScope && <div><p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Geographic Scope</p><p className="mt-1 text-sm text-gray-700">{grant.geographicScope}</p></div>}
                  {grant.projectDuration && <div><p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Project Duration</p><p className="mt-1 text-sm text-gray-700">{grant.projectDuration}</p></div>}
                </div>
                <div className="space-y-3">
                  {grant.notes && <div><p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Notes</p><p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">{grant.notes}</p></div>}
                  {!grant.eligibility && !grant.howToApply && !grant.notes && (
                    <p className="text-sm text-gray-400">No details yet — click Edit to add information.</p>
                  )}
                </div>
                {/* AI Match Breakdown */}
                <div className="lg:col-span-2">
                  {matchData ? (
                    <MatchBreakdown match={matchData} />
                  ) : grant.publicGrantId ? (
                    <p className="rounded-lg border border-dashed border-gray-200 px-3 py-2 text-xs text-gray-400">
                      Match score pending — complete your <a href="/grants/profile" className="text-brand-600 hover:underline">Organisation Profile</a> to enable AI matching.
                    </p>
                  ) : null}
                </div>
                <div className="lg:col-span-2 flex items-center gap-4 flex-wrap">
                  <span className="text-xs text-gray-400">
                    Added {new Date(grant.createdAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                    {" · "}Updated {new Date(grant.updatedAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                  <button onClick={() => setEditing(true)} className="text-xs text-brand-600 hover:underline">Edit all fields →</button>
                </div>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
