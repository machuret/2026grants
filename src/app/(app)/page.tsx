"use client";

import { useEffect, useState } from "react";
import { Trophy, Clock, CheckCircle, AlertTriangle, TrendingUp } from "lucide-react";
import { authFetch } from "@/lib/authFetch";
import Link from "next/link";

interface Stats {
  total: number;
  apply: number;
  maybe: number;
  rejected: number;
  closingSoon: number;
  expired: number;
  inCrm: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    authFetch("/api/grants/stats")
      .then((r) => r.json())
      .then((d) => { if (d.stats) setStats(d.stats); })
      .catch(() => {});
  }, []);

  const cards = stats
    ? [
        { label: "Total Grants", value: stats.total, icon: Trophy, color: "bg-brand-50 text-brand-700 border-brand-200" },
        { label: "Apply", value: stats.apply, icon: CheckCircle, color: "bg-green-50 text-green-700 border-green-200" },
        { label: "Maybe", value: stats.maybe, icon: TrendingUp, color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
        { label: "Closing Soon", value: stats.closingSoon, icon: Clock, color: "bg-orange-50 text-orange-700 border-orange-200" },
        { label: "Expired", value: stats.expired, icon: AlertTriangle, color: "bg-red-50 text-red-700 border-red-200" },
        { label: "In CRM", value: stats.inCrm, icon: TrendingUp, color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
      ]
    : [];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-gray-500">Overview of your grant pipeline</p>
      </div>

      {!stats ? (
        <div className="py-20 text-center text-gray-400">Loading…</div>
      ) : (
        <>
          <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {cards.map((c) => (
              <div key={c.label} className={`rounded-xl border px-4 py-4 ${c.color}`}>
                <div className="flex items-center gap-2 mb-1">
                  <c.icon className="h-4 w-4" />
                  <p className="text-xs font-medium">{c.label}</p>
                </div>
                <p className="text-2xl font-bold">{c.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">Quick Actions</h2>
              <div className="space-y-2">
                <Link href="/grants" className="flex items-center gap-3 rounded-lg bg-brand-50 px-4 py-3 text-sm font-medium text-brand-700 hover:bg-brand-100">
                  <Trophy className="h-4 w-4" /> View All Grants
                </Link>
                <Link href="/grants/crm" className="flex items-center gap-3 rounded-lg bg-indigo-50 px-4 py-3 text-sm font-medium text-indigo-700 hover:bg-indigo-100">
                  <TrendingUp className="h-4 w-4" /> Grants CRM Pipeline
                </Link>
                <Link href="/grants/builder" className="flex items-center gap-3 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 hover:bg-emerald-100">
                  <CheckCircle className="h-4 w-4" /> Write a Grant Application
                </Link>
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">Getting Started</h2>
              <ol className="space-y-3 text-sm text-gray-600">
                <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">1</span> Fill in your <Link href="/company" className="text-brand-600 underline">Company Info</Link> so AI can match grants to you</li>
                <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">2</span> Complete your <Link href="/grants/profile" className="text-brand-600 underline">Grant Profile</Link> for better AI ranking</li>
                <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">3</span> <Link href="/grants" className="text-brand-600 underline">Add grants</Link> manually or use AI search to find opportunities</li>
                <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">4</span> Rank grants by profile match and score complexity</li>
                <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">5</span> Use the <Link href="/grants/builder" className="text-brand-600 underline">Grant Builder</Link> to draft applications with AI</li>
              </ol>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
