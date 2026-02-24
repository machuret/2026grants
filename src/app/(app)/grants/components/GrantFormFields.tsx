"use client";

import type { Grant } from "@/hooks/useGrants";

interface Props {
  form: Partial<Grant>;
  set: (k: keyof Grant, v: unknown) => void;
}

export function GrantFormFields({ form, set }: Props) {
  const input = (label: string, key: keyof Grant, type = "text", placeholder = "") => (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-600">{label}</label>
      <input
        type={type}
        value={(form[key] as string) ?? ""}
        onChange={(e) => set(key, e.target.value || null)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
      />
    </div>
  );

  const textarea = (label: string, key: keyof Grant, placeholder = "") => (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-600">{label}</label>
      <textarea
        value={(form[key] as string) ?? ""}
        onChange={(e) => set(key, e.target.value || null)}
        placeholder={placeholder}
        rows={3}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
      />
    </div>
  );

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {input("Grant Name", "name", "text", "e.g. Innovation Fund 2026")}
      {input("Founder / Organisation", "founder", "text", "e.g. Department of Industry")}
      {input("URL", "url", "url", "https://...")}
      {input("Deadline Date", "deadlineDate", "date")}
      {input("Amount", "amount", "text", "e.g. $50,000 - $200,000")}
      {input("Geographic Scope", "geographicScope", "text", "e.g. Australia, Global")}
      {input("Project Duration", "projectDuration", "text", "e.g. 12 months")}
      {textarea("Eligibility", "eligibility", "Who can apply?")}
      {textarea("How to Apply", "howToApply", "Application process details")}

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">Fit Score (1-5)</label>
        <select
          value={form.fitScore ?? ""}
          onChange={(e) => set("fitScore", e.target.value ? Number(e.target.value) : null)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          <option value="">—</option>
          {[1, 2, 3, 4, 5].map((v) => <option key={v} value={v}>{v} Star{v > 1 ? "s" : ""}</option>)}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">Submission Effort</label>
        <select
          value={form.submissionEffort ?? ""}
          onChange={(e) => set("submissionEffort", e.target.value || null)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          <option value="">—</option>
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">Decision</label>
        <select
          value={form.decision ?? ""}
          onChange={(e) => set("decision", e.target.value || null)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          <option value="">—</option>
          <option value="Apply">Apply</option>
          <option value="Maybe">Maybe</option>
          <option value="No">No</option>
          <option value="Rejected">Rejected</option>
        </select>
      </div>

      <div className="lg:col-span-2">
        {textarea("Notes", "notes", "Your notes about this grant...")}
      </div>
    </div>
  );
}
