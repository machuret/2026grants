"use client";

import { useCallback, useEffect, useState } from "react";
import { authFetch } from "@/lib/authFetch";

export interface Grant {
  id: string;
  companyId: string;
  name: string;
  founder?: string | null;
  url?: string | null;
  deadlineDate?: string | null;
  howToApply?: string | null;
  geographicScope?: string | null;
  eligibility?: string | null;
  amount?: string | null;
  projectDuration?: string | null;
  fitScore?: number | null;
  submissionEffort?: "Low" | "Medium" | "High" | null;
  decision?: "Apply" | "Maybe" | "No" | "Rejected" | null;
  notes?: string | null;
  aiScore?: number | null;
  aiVerdict?: string | null;
  matchScore?: number | null;
  complexityScore?: number | null;
  complexityLabel?: "Low" | "Medium" | "High" | "Very High" | null;
  complexityNotes?: string | null;
  publicGrantId?: string | null;
  crmStatus?: "Researching" | "Pipeline" | "Active" | "Submitted" | "Won" | "Lost" | null;
  crmNotes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export function useGrants() {
  const [grants, setGrants] = useState<Grant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [companyDNA, setCompanyDNA] = useState("");

  const fetchGrants = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [grantsRes, companyRes] = await Promise.all([
        authFetch("/api/grants"),
        authFetch("/api/company"),
      ]);
      if (!grantsRes.ok) throw new Error(`Failed to load grants (${grantsRes.status})`);
      const grantsData = await grantsRes.json();
      const companyData = companyRes.ok ? await companyRes.json() : {};

      setGrants(grantsData.grants ?? []);

      const info = companyData.info;
      const company = companyData.company;
      const parts = [
        company?.name ? `Company: ${company.name}` : null,
        company?.industry ? `Industry: ${company.industry}` : null,
        info?.bulkContent ? info.bulkContent : null,
        info?.values ? `Values: ${info.values}` : null,
        info?.corePhilosophy ? `Philosophy: ${info.corePhilosophy}` : null,
        info?.founders ? `Founders: ${info.founders}` : null,
        info?.achievements ? `Achievements: ${info.achievements}` : null,
        info?.products ? `Products: ${info.products}` : null,
      ].filter(Boolean);
      if (parts.length > 0) setCompanyDNA(parts.join("\n").slice(0, 2500));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load grants");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchGrants(); }, [fetchGrants]);

  const updateGrant = useCallback(async (id: string, data: Partial<Grant>): Promise<{ success: boolean; grant?: Grant }> => {
    const res = await authFetch(`/api/grants/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (result.success) {
      setGrants((prev) => prev.map((g) => g.id === id ? { ...g, ...result.grant } : g));
    }
    return result;
  }, []);

  const deleteGrant = useCallback(async (id: string): Promise<{ success: boolean }> => {
    const res = await authFetch(`/api/grants/${id}`, { method: "DELETE" });
    const result = await res.json();
    if (result.success) {
      setGrants((prev) => prev.filter((g) => g.id !== id));
    }
    return result;
  }, []);

  const addGrant = useCallback((grant: Grant) => {
    setGrants((prev) => [grant, ...prev]);
  }, []);

  return { grants, loading, error, companyDNA, fetchGrants, updateGrant, deleteGrant, addGrant };
}
