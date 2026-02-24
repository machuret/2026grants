"use client";

import { useEffect, useState } from "react";
import { Loader2, Shield, UserCheck, UserX, Save } from "lucide-react";
import { authFetch } from "@/lib/authFetch";

interface AppUser {
  id: string;
  authId: string;
  email: string;
  name: string;
  role: string;
  active: boolean;
  companyId: string;
  Company?: { id: string; name: string } | null;
  createdAt: string;
}

interface Company {
  id: string;
  name: string;
}

const ROLES = ["USER", "ADMIN", "SUPER_ADMIN"];

export default function AdminPage() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      authFetch("/api/admin/users").then((r) => r.json()),
      authFetch("/api/admin/companies").then((r) => r.json()),
    ])
      .then(([usersData, companiesData]) => {
        if (usersData.error) setError(usersData.error);
        else setUsers(usersData.users ?? []);
        setCompanies(companiesData.companies ?? []);
      })
      .catch(() => setError("Failed to load data"))
      .finally(() => setLoading(false));
  }, []);

  const updateUser = async (userId: string, updates: Record<string, unknown>) => {
    setSaving(userId);
    setMsg(null);
    try {
      const res = await authFetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, ...updates }),
      });
      const data = await res.json();
      if (data.success && data.user) {
        setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...data.user } : u)));
        setMsg("✓ Updated");
      } else {
        setMsg(data.error || "Update failed");
      }
    } catch {
      setMsg("Network error");
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-gray-400">
        <Loader2 className="mx-auto h-8 w-8 animate-spin mb-3" />
        Loading users…
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl py-20 text-center">
        <Shield className="mx-auto h-12 w-12 text-red-300 mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
        <p className="mt-1 text-gray-500">{users.length} registered user{users.length !== 1 ? "s" : ""}</p>
      </div>

      {msg && (
        <p className={`mb-4 rounded-lg px-3 py-2 text-sm font-medium ${msg.startsWith("✓") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
          {msg}
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">User</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Role</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Company</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Joined</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className={`border-b border-gray-100 hover:bg-gray-50 ${!user.active ? "opacity-50" : ""}`}>
                <td className="px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{user.name || user.email}</p>
                    <p className="text-xs text-gray-400">{user.email}</p>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <select
                    value={user.role}
                    onChange={(e) => updateUser(user.id, { role: e.target.value })}
                    className={`rounded-lg border px-2 py-1 text-xs font-semibold focus:outline-none ${
                      user.role === "SUPER_ADMIN"
                        ? "border-red-200 bg-red-50 text-red-700"
                        : user.role === "ADMIN"
                        ? "border-orange-200 bg-orange-50 text-orange-700"
                        : "border-gray-200 bg-gray-50 text-gray-700"
                    }`}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <select
                    value={user.companyId}
                    onChange={(e) => updateUser(user.id, { companyId: e.target.value })}
                    className="rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-700 focus:outline-none"
                  >
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => updateUser(user.id, { active: !user.active })}
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      user.active
                        ? "bg-green-100 text-green-700 hover:bg-green-200"
                        : "bg-red-100 text-red-700 hover:bg-red-200"
                    }`}
                  >
                    {user.active ? <><UserCheck className="h-3 w-3" /> Active</> : <><UserX className="h-3 w-3" /> Inactive</>}
                  </button>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {new Date(user.createdAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                </td>
                <td className="px-4 py-3">
                  {saving === user.id && <Loader2 className="h-4 w-4 animate-spin text-brand-600" />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
