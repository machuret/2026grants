"use client";

import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { authFetch } from "@/lib/authFetch";
import type { Grant } from "@/hooks/useGrants";

interface Props {
  onClose: () => void;
  onSaved: (grant: Grant) => void;
}

export function AddGrantModal({ onClose, onSaved }: Props) {
  const [name, setName] = useState("");
  const [founder, setFounder] = useState("");
  const [url, setUrl] = useState("");
  const [deadlineDate, setDeadlineDate] = useState("");
  const [amount, setAmount] = useState("");
  const [geographicScope, setGeographicScope] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await authFetch("/api/grants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          founder: founder || null,
          url: url || null,
          deadlineDate: deadlineDate || null,
          amount: amount || null,
          geographicScope: geographicScope || null,
        }),
      });
      const data = await res.json();
      if (data.success && data.grant) {
        onSaved(data.grant);
        onClose();
      } else {
        setError(data.error || "Failed to create grant");
      }
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Add Grant</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>

        {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Grant Name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder="e.g. Innovation Fund 2026" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Organisation</label>
              <input value={founder} onChange={(e) => setFounder(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                placeholder="e.g. Dept of Industry" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Amount</label>
              <input value={amount} onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                placeholder="e.g. $50,000" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Deadline</label>
              <input type="date" value={deadlineDate} onChange={(e) => setDeadlineDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Region</label>
              <input value={geographicScope} onChange={(e) => setGeographicScope(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                placeholder="e.g. Australia" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">URL</label>
            <input value={url} onChange={(e) => setUrl(e.target.value)} type="url"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder="https://..." />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Add Grant
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
