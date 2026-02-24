"use client";

import { ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, HelpCircle, FileX } from "lucide-react";
import { useState } from "react";

export interface MatchData {
  publicGrantId: string;
  overallScore: number;
  eligibilityScore: number;
  readinessScore: number;
  fitScore: number;
  matchedCriteria: MatchCriterion[];
  unmatchedCriteria: MatchCriterion[];
  unknownCriteria: MatchCriterion[];
  riskFlags: string[];
  documentGaps: string[];
  explanation: string;
  computedAt: string;
  stale: boolean;
}

interface MatchCriterion {
  id: string;
  field: string;
  operator: string;
  value: string | null;
  isMandatory: boolean;
  confidence: string;
  evidence?: string | null;
}

function scoreColor(score: number) {
  if (score >= 75) return { bar: "bg-green-500", text: "text-green-700", bg: "bg-green-50 border-green-200", pill: "bg-green-100 text-green-700" };
  if (score >= 50) return { bar: "bg-yellow-400", text: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200", pill: "bg-yellow-100 text-yellow-700" };
  return { bar: "bg-red-400", text: "text-red-700", bg: "bg-red-50 border-red-200", pill: "bg-red-100 text-red-700" };
}

function ScoreBar({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-24 shrink-0 text-xs text-gray-500">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-gray-200">
        <div className={`h-1.5 rounded-full ${color} transition-all`} style={{ width: `${score}%` }} />
      </div>
      <span className="w-8 text-right text-xs font-semibold text-gray-700">{score}%</span>
    </div>
  );
}

function CriterionLabel({ c }: { c: MatchCriterion }) {
  const op = c.operator === "gte" ? "≥" : c.operator === "lte" ? "≤" : c.operator === "eq" ? "=" : c.operator === "in" ? "∈" : c.operator;
  return (
    <span className="text-xs text-gray-700">
      <span className="font-medium">{c.field}</span>
      {c.value ? <> {op} <span className="font-mono text-gray-500">{c.value}</span></> : null}
      {c.isMandatory && <span className="ml-1 text-[10px] font-bold uppercase text-red-500">mandatory</span>}
    </span>
  );
}

// Compact inline badge — used in list/table views
export function MatchScorePill({ score, stale }: { score: number; stale?: boolean }) {
  const c = scoreColor(score);
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${c.pill} ${stale ? "opacity-60" : ""}`}>
      {stale && <span title="Score may be outdated" className="mr-0.5">⟳</span>}
      {score}%
    </span>
  );
}

// Full expandable match panel — used in expanded rows / cards
export function MatchBreakdown({ match }: { match: MatchData }) {
  const [open, setOpen] = useState(false);
  const c = scoreColor(match.overallScore);

  return (
    <div className={`rounded-lg border ${c.bg} p-3`}>
      {/* Summary row */}
      <button
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-center justify-between gap-3"
      >
        <div className="flex items-center gap-3 flex-wrap">
          <span className={`text-sm font-bold ${c.text}`}>AI Match: {match.overallScore}%</span>
          {match.overallScore === 0 && match.unmatchedCriteria.some(u => u.isMandatory) && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">
              <AlertTriangle className="h-3 w-3" /> Ineligible
            </span>
          )}
          {match.documentGaps.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-700">
              <FileX className="h-3 w-3" /> {match.documentGaps.length} doc gap{match.documentGaps.length !== 1 ? "s" : ""}
            </span>
          )}
          {match.stale && (
            <span className="text-[10px] text-gray-400 italic">Score may be outdated</span>
          )}
        </div>
        <span className="shrink-0 text-gray-400">
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </button>

      {open && (
        <div className="mt-3 space-y-4">
          {/* Sub-scores */}
          <div className="space-y-1.5">
            <ScoreBar label="Eligibility" score={match.eligibilityScore} color={scoreColor(match.eligibilityScore).bar} />
            <ScoreBar label="Readiness" score={match.readinessScore} color={scoreColor(match.readinessScore).bar} />
            <ScoreBar label="Fit" score={match.fitScore} color={scoreColor(match.fitScore).bar} />
          </div>

          {/* Explanation */}
          {match.explanation && (
            <p className="text-xs text-gray-600 leading-relaxed border-t border-current/10 pt-3">{match.explanation}</p>
          )}

          {/* Criteria breakdown */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 border-t border-current/10 pt-3">
            {/* Matched */}
            {match.matchedCriteria.length > 0 && (
              <div>
                <p className="mb-1.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-green-600">
                  <CheckCircle2 className="h-3 w-3" /> Met ({match.matchedCriteria.length})
                </p>
                <ul className="space-y-1">
                  {match.matchedCriteria.map((c, i) => (
                    <li key={i} className="flex items-start gap-1">
                      <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-green-400" />
                      <CriterionLabel c={c} />
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Unmatched */}
            {match.unmatchedCriteria.length > 0 && (
              <div>
                <p className="mb-1.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-red-600">
                  <AlertTriangle className="h-3 w-3" /> Not Met ({match.unmatchedCriteria.length})
                </p>
                <ul className="space-y-1">
                  {match.unmatchedCriteria.map((c, i) => (
                    <li key={i} className="flex items-start gap-1">
                      <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
                      <CriterionLabel c={c} />
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Unknown */}
            {match.unknownCriteria.length > 0 && (
              <div>
                <p className="mb-1.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-gray-500">
                  <HelpCircle className="h-3 w-3" /> Unknown ({match.unknownCriteria.length})
                </p>
                <ul className="space-y-1">
                  {match.unknownCriteria.map((c, i) => (
                    <li key={i} className="flex items-start gap-1">
                      <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-300" />
                      <CriterionLabel c={c} />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Document gaps */}
          {match.documentGaps.length > 0 && (
            <div className="rounded-lg bg-orange-50 border border-orange-200 px-3 py-2">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-orange-600 flex items-center gap-1">
                <FileX className="h-3 w-3" /> Missing Documents
              </p>
              <div className="flex flex-wrap gap-1.5">
                {match.documentGaps.map((d, i) => (
                  <span key={i} className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
                    {d.replace(/_/g, " ")}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Risk flags */}
          {match.riskFlags.length > 0 && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-red-600 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Risk Flags
              </p>
              <ul className="space-y-0.5">
                {match.riskFlags.map((f, i) => (
                  <li key={i} className="text-xs text-red-700">{f}</li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-[10px] text-gray-400">
            Computed {new Date(match.computedAt).toLocaleString("en-AU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
      )}
    </div>
  );
}
