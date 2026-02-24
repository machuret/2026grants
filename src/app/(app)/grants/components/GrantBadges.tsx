"use client";

import { Star, Calendar, AlertTriangle } from "lucide-react";
import { DECISION_STYLES, EFFORT_STYLES } from "./grantTypes";
import type { Decision, Effort } from "./grantTypes";

export function FitStars({ value }: { value?: number | null }) {
  if (!value) return <span className="text-gray-300 text-xs">—</span>;
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${i < value ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`}
        />
      ))}
    </div>
  );
}

export function DecisionBadge({ value }: { value: Decision }) {
  if (!value) return <span className="text-gray-300 text-xs">—</span>;
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${DECISION_STYLES[value] ?? "bg-gray-100 text-gray-600"}`}>
      {value}
    </span>
  );
}

export function EffortBadge({ value }: { value: Effort }) {
  if (!value) return <span className="text-gray-300 text-xs">—</span>;
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${EFFORT_STYLES[value] ?? "bg-gray-100 text-gray-600"}`}>
      {value}
    </span>
  );
}

export function DeadlineBadge({ date }: { date?: string | null }) {
  if (!date) return <span className="text-gray-300 text-xs italic">No deadline</span>;
  const deadline = new Date(date);
  const now = new Date();
  const diffDays = Math.ceil((deadline.getTime() - now.getTime()) / 86400000);

  if (diffDays < 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
        <AlertTriangle className="h-3 w-3" /> Expired
      </span>
    );
  }
  if (diffDays <= 14) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700">
        <Calendar className="h-3 w-3" /> {diffDays}d left
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
      <Calendar className="h-3 w-3" /> {deadline.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
    </span>
  );
}
