"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Trophy,
  KanbanSquare,
  PenLine,
  UserCheck,
  Building2,
  LogOut,
  Download,
  Search,
  Sparkles,
  Database,
  Users,
  Link2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }> };

const dashNav: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
];

const grantsNav: NavItem[] = [
  { href: "/grants/database", label: "Grants Database", icon: Database },
  { href: "/grants", label: "My Grants", icon: Trophy },
  { href: "/grants/crm", label: "Grants CRM", icon: KanbanSquare },
  { href: "/grants/builder", label: "Grant Builder", icon: PenLine },
  { href: "/grants/profile", label: "Grant Profile", icon: UserCheck },
];

const settingsNav: NavItem[] = [
  { href: "/company", label: "Company Info", icon: Building2 },
];

const adminNav: NavItem[] = [
  { href: "/admin/sources", label: "Grant Sources", icon: Link2 },
  { href: "/admin/scraper", label: "Grant Scraper", icon: Search },
  { href: "/admin/grants", label: "Manage Grants", icon: Sparkles },
  { href: "/admin", label: "User Management", icon: Users },
];

export function Sidebar() {
  const pathname = usePathname();
  const supabase = createClient();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/users/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.user) {
          setUserEmail(d.user.email);
          setUserRole(d.user.role);
        }
      })
      .catch(() => {});
  }, []);

  const isAdmin = userRole === "ADMIN" || userRole === "SUPER_ADMIN";

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const exactOnly = new Set(["/", "/grants", "/admin"]);
  const navLink = (item: NavItem) => {
    const isActive = exactOnly.has(item.href)
      ? pathname === item.href
      : pathname === item.href || pathname.startsWith(item.href + "/");
    return (
      <Link
        key={item.href}
        href={item.href}
        className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
          isActive
            ? "bg-brand-600 text-white shadow-md shadow-brand-900/30"
            : "text-gray-400 hover:bg-gray-800 hover:text-white"
        }`}
      >
        <item.icon
          className={`h-4 w-4 shrink-0 transition-colors ${
            isActive ? "text-white" : "text-gray-500 group-hover:text-gray-300"
          }`}
        />
        <span className="truncate">{item.label}</span>
        {isActive && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white/60" />}
      </Link>
    );
  };

  const sectionLabel = (label: string) => (
    <p className="mb-1 mt-1 px-3 text-[10px] font-bold uppercase tracking-widest text-gray-600">{label}</p>
  );

  return (
    <aside className="flex w-64 flex-col bg-gray-950 px-3 py-5">
      <div className="mb-5 flex items-center gap-3 px-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 shadow-lg shadow-brand-900/40">
          <Download className="h-4 w-4 text-white" />
        </div>
        <div>
          <h1 className="text-base font-bold leading-none text-white">GrantsHub</h1>
          <p className="text-[10px] text-gray-500 leading-tight">Grant Management Platform</p>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto pb-4">
        {dashNav.map(navLink)}

        <div className="my-3 border-t border-gray-800" />
        {sectionLabel("Grants")}
        {grantsNav.map(navLink)}

        <div className="my-3 border-t border-gray-800" />
        {sectionLabel("Settings")}
        {settingsNav.map(navLink)}

        {isAdmin && (
          <>
            <div className="my-3 border-t border-gray-800" />
            {sectionLabel("Admin")}
            {adminNav.map(navLink)}
          </>
        )}
      </nav>

      {/* User footer */}
      <div className="mt-auto border-t border-gray-800 pt-3">
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-700 text-xs font-bold text-white">
            {userEmail ? userEmail[0].toUpperCase() : "?"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-gray-300">{userEmail ?? "..."}</p>
            <p className="text-[10px] capitalize text-gray-600">{userRole?.toLowerCase().replace("_", " ") ?? ""}</p>
          </div>
          <button
            onClick={handleLogout}
            title="Sign out"
            className="shrink-0 rounded p-1 text-gray-600 hover:bg-gray-800 hover:text-red-400 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
