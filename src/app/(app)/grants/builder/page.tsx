"use client";

import { useState, useEffect, Suspense } from "react";
import { Loader2, FileText, Download, Copy, RefreshCw } from "lucide-react";
import { authFetch } from "@/lib/authFetch";
import { useSearchParams } from "next/navigation";

const ALL_SECTIONS = [
  "Executive Summary",
  "Project Description",
  "Goals & Objectives",
  "Methodology",
  "Timeline & Milestones",
  "Budget Justification",
  "Evaluation Plan",
  "Organisational Capability",
  "Contact Details",
] as const;

type Section = (typeof ALL_SECTIONS)[number];

function BuilderInner() {
  const params = useSearchParams();
  const grantId = params.get("grantId");

  const [grantName, setGrantName] = useState("");
  const [brief, setBrief] = useState("");
  const [tone, setTone] = useState("Professional");
  const [length, setLength] = useState<"short" | "medium" | "long">("medium");
  const [enabled, setEnabled] = useState<Set<Section>>(new Set(ALL_SECTIONS));
  const [sections, setSections] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState(false);
  const [writingSection, setWritingSection] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (grantId) {
      authFetch(`/api/grants/${grantId}`)
        .then(async (r) => {
          if (!r.ok) return;
          // The PATCH endpoint returns { success, grant }, but GET doesn't exist separately
          // So we'll just set the name from the grants list
        })
        .catch(() => {});
    }
  }, [grantId]);

  const toggleSection = (s: Section) => {
    setEnabled((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s); else next.add(s);
      return next;
    });
  };

  const generateBrief = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await authFetch("/api/grants/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "brief", grantName, tone, length }),
      });
      const data = await res.json();
      if (data.brief) setBrief(data.brief);
      else setError(data.error || "Failed to generate brief");
    } catch {
      setError("Network error");
    } finally {
      setGenerating(false);
    }
  };

  const writeSection = async (section: string) => {
    setWritingSection(section);
    setError(null);
    try {
      const res = await authFetch("/api/grants/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "section", section, brief, tone, length, grantName }),
      });
      const data = await res.json();
      if (data.content) {
        setSections((prev) => ({ ...prev, [section]: data.content }));
      } else {
        setError(data.error || `Failed to write ${section}`);
      }
    } catch {
      setError("Network error");
    } finally {
      setWritingSection(null);
    }
  };

  const writeAll = async () => {
    for (const section of ALL_SECTIONS) {
      if (enabled.has(section)) {
        await writeSection(section);
      }
    }
  };

  const downloadTxt = () => {
    const text = ALL_SECTIONS
      .filter((s) => enabled.has(s) && sections[s])
      .map((s) => `## ${s}\n\n${sections[s]}`)
      .join("\n\n---\n\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${grantName || "grant-application"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyAll = () => {
    const text = ALL_SECTIONS
      .filter((s) => enabled.has(s) && sections[s])
      .map((s) => `## ${s}\n\n${sections[s]}`)
      .join("\n\n---\n\n");
    navigator.clipboard.writeText(text);
  };

  const writtenCount = Object.keys(sections).length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Grant Builder</h1>
        <p className="mt-1 text-gray-500">AI-powered grant application writer</p>
      </div>

      {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: Config */}
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">Configuration</h2>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Grant Name</label>
                <input value={grantName} onChange={(e) => setGrantName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  placeholder="e.g. Innovation Fund 2026" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Tone</label>
                <select value={tone} onChange={(e) => setTone(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500">
                  {["Professional", "Persuasive", "Academic", "Conversational"].map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Length</label>
                <select value={length} onChange={(e) => setLength(e.target.value as "short" | "medium" | "long")}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500">
                  <option value="short">Short</option>
                  <option value="medium">Medium</option>
                  <option value="long">Long</option>
                </select>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">Sections</h2>
            <div className="space-y-1.5">
              {ALL_SECTIONS.map((s) => (
                <label key={s} className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={enabled.has(s)} onChange={() => toggleSection(s)}
                    className="h-3.5 w-3.5 rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
                  {s}
                  {sections[s] && <span className="ml-auto text-xs text-green-600">✓</span>}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <button onClick={generateBrief} disabled={generating || !grantName}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50">
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              {generating ? "Generating…" : "Generate Writing Brief"}
            </button>
            <button onClick={writeAll} disabled={!brief || !!writingSection}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-brand-300 bg-brand-50 px-4 py-2.5 text-sm font-medium text-brand-700 hover:bg-brand-100 disabled:opacity-50">
              Write All Sections
            </button>
          </div>
        </div>

        {/* Right: Generated content */}
        <div className="lg:col-span-2 space-y-4">
          {brief && (
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-900">Writing Brief</h3>
                <button onClick={generateBrief} disabled={generating} className="text-xs text-brand-600 hover:underline">
                  <RefreshCw className="inline h-3 w-3 mr-1" />Regenerate
                </button>
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{brief}</p>
            </div>
          )}

          {ALL_SECTIONS.filter((s) => enabled.has(s)).map((section) => (
            <div key={section} className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-900">{section}</h3>
                <div className="flex items-center gap-2">
                  {sections[section] && (
                    <button onClick={() => navigator.clipboard.writeText(sections[section])} className="text-xs text-gray-500 hover:text-gray-700">
                      <Copy className="inline h-3 w-3 mr-1" />Copy
                    </button>
                  )}
                  <button onClick={() => writeSection(section)} disabled={!brief || writingSection === section}
                    className="text-xs text-brand-600 hover:underline disabled:opacity-50">
                    {writingSection === section ? <Loader2 className="inline h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="inline h-3 w-3 mr-1" />}
                    {sections[section] ? "Rewrite" : "Write"}
                  </button>
                </div>
              </div>
              {sections[section] ? (
                <textarea
                  value={sections[section]}
                  onChange={(e) => setSections((prev) => ({ ...prev, [section]: e.target.value }))}
                  rows={6}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-brand-500 focus:outline-none"
                />
              ) : (
                <p className="text-sm text-gray-400 italic">Not written yet — click Write to generate</p>
              )}
            </div>
          ))}

          {writtenCount > 0 && (
            <div className="flex gap-2">
              <button onClick={downloadTxt} className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800">
                <Download className="h-4 w-4" /> Download .txt
              </button>
              <button onClick={copyAll} className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
                <Copy className="h-4 w-4" /> Copy All
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function BuilderPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-gray-400"><Loader2 className="mx-auto h-8 w-8 animate-spin" /></div>}>
      <div className="mx-auto max-w-6xl">
        <BuilderInner />
      </div>
    </Suspense>
  );
}
