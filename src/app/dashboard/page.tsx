"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TopNav } from "@/components/TopNav";
import { MetricTooltip } from "@/components/MetricTooltip";
import { formatNumber } from "@/lib/mockData";
import { useProjectStore } from "@/lib/store";
import { useVersion } from "@/contexts/VersionContext";
import { SegmentBuilder, emptyColumn } from "@/components/SegmentBuilder";
import type { SegmentColumn } from "@/components/SegmentBuilder";
import { scopedKey } from "@/lib/versionedStorage";

// ─── Confirmation Modal ───

function DeleteModal({
  projectName,
  onCancel,
  onConfirm,
}: {
  projectName: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white rounded-card border border-nz-border w-full max-w-md p-6 z-10 shadow-card">
        <h3 className="text-base font-heading font-semibold text-nz-text mb-2">
          Delete {projectName}?
        </h3>
        <p className="text-sm font-body text-nz-text-secondary mb-6">
          This will permanently remove all segments, analysis results, and data
          for this project. This cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium font-body text-nz-text bg-white border border-nz-border rounded-card hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium font-body text-white bg-nz-red rounded-card hover:bg-[#DC2626] transition-colors"
          >
            Delete Project
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Card Menu ───

function CardMenu({
  projectId,
  projectName,
  canDelete,
  onDelete,
}: {
  projectId: string;
  projectName: string;
  canDelete: boolean;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(!open);
        }}
        className="w-6 h-6 rounded flex items-center justify-center text-nz-text-secondary hover:bg-nz-bg-subtle transition-colors"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <circle cx="10" cy="4" r="1.5" />
          <circle cx="10" cy="10" r="1.5" />
          <circle cx="10" cy="16" r="1.5" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-8 bg-white border border-nz-border rounded-card min-w-[160px] z-[9999] py-1 shadow-card">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOpen(false);
              router.push(`/projects/${projectId}/audience`);
            }}
            className="w-full text-left px-4 py-2 text-sm font-body text-nz-text hover:bg-nz-bg-subtle transition-colors"
          >
            Open Project
          </button>
          <div className="border-t border-nz-border mx-2 my-1" />
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOpen(false);
              if (canDelete) onDelete();
            }}
            disabled={!canDelete}
            className={`w-full text-left px-4 py-2 text-sm font-body flex items-center gap-2 transition-colors ${
              canDelete
                ? "text-nz-red hover:bg-red-50"
                : "text-nz-red/40 cursor-not-allowed"
            }`}
            title={canDelete ? undefined : "Cannot delete last project"}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete Project
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Mock data for inline analysis results ───

const MOCK_TAXONOMIES = {
  genres: [{ name: "Adventure", mau: "63.7M", pct: 100 }, { name: "Shooter", mau: "34.8M", pct: 55 }, { name: "RPG", mau: "21.5M", pct: 34 }],
  subGenres: [{ name: "Action-Adventure", mau: "42.1M", pct: 66 }, { name: "Survival", mau: "18.3M", pct: 29 }, { name: "Open World", mau: "15.9M", pct: 25 }],
  mechanics: [{ name: "Combat", mau: "51.2M", pct: 80 }, { name: "Shooting", mau: "34.8M", pct: 55 }, { name: "Exploration", mau: "29.4M", pct: 46 }],
  artStyles: [{ name: "Realistic", mau: "45.7M", pct: 72 }, { name: "Stylized", mau: "22.3M", pct: 35 }, { name: "Cartoon", mau: "11.8M", pct: 19 }],
  themes: [{ name: "Crime", mau: "19.2M", pct: 30 }, { name: "Horror", mau: "14.7M", pct: 23 }, { name: "Sci-Fi", mau: "13.1M", pct: 21 }],
};

const MOCK_GAMES = [
  { title: "Grand Theft Auto V", publisher: "Rockstar Games", genre: "Adventure", date: "Sep 17, 2013", platforms: "\ud83d\udda5\ufe0f\ud83c\udfae", markets: 37, mau: "17.3M", share: "26.9%", playtime: "" },
  { title: "Red Dead Redemption 2", publisher: "Rockstar Games", genre: "Adventure", date: "Oct 18, 2018", platforms: "\ud83d\udda5\ufe0f\ud83c\udfae", markets: 37, mau: "4.13M", share: "6.44%", playtime: "" },
  { title: "Dead by Daylight", publisher: "Behaviour Interactive", genre: "Adventure", date: "Jun 14, 2016", platforms: "\ud83d\udda5\ufe0f\ud83c\udfae", markets: 37, mau: "3.67M", share: "5.72%", playtime: "" },
  { title: "Resident Evil Requiem", publisher: "Capcom", genre: "Adventure", date: "Feb 27, 2026", platforms: "\ud83c\udfae", markets: 37, mau: "2.62M", share: "4.52%", playtime: "" },
];

// ─── Inline Analysis Results (tabbed: Overview, Region, Overlap) ───

function InlineAnalysisResults() {
  const [activeTab, setActiveTab] = useState<"overview" | "region" | "overlap">("overview");

  const tabs = [
    { key: "overview" as const, label: "Overview" },
    { key: "region" as const, label: "Segment by Region or Market" },
    { key: "overlap" as const, label: "Segment Overlap" },
  ];

  return (
    <div className="mt-6">
      {/* Tab row */}
      <div className="flex gap-0 border-b border-nz-border mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-body font-medium transition-colors relative ${
              activeTab === tab.key
                ? "text-nz-primary"
                : "text-nz-text-secondary hover:text-nz-text"
            }`}
          >
            {tab.label}
            {activeTab === tab.key && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-nz-primary" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "overview" && (
        <div>
          {/* Top stat cards */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            {/* MAU */}
            <div className="bg-white border border-nz-border rounded-card shadow-card p-5">
              <div className="text-xs font-body text-nz-text-secondary mb-1">MAU</div>
              <div className="text-3xl font-mono font-bold text-nz-text mb-1">64.1M</div>
              <div className="text-xs font-body text-nz-text-muted mb-3">Total deduplicated MAU for games that fit your criteria</div>
              <div className="flex h-2 rounded-full overflow-hidden bg-nz-bg-subtle">
                <div className="bg-nz-primary" style={{ width: "45.2%" }} />
                <div className="bg-nz-bg-subtle" style={{ width: "54.8%" }} />
              </div>
              <div className="flex justify-between text-[10px] font-mono text-nz-text-muted mt-1">
                <span>45.2%</span><span>54.8%</span>
              </div>
            </div>
            {/* Avg Monthly Playtime */}
            <div className="bg-white border border-nz-border rounded-card shadow-card p-5">
              <div className="text-xs font-body text-nz-text-secondary mb-1">Avg. Monthly Playtime</div>
              <div className="text-3xl font-mono font-bold text-nz-text mb-1">15.7</div>
              <div className="text-xs font-body text-nz-text-muted mb-3">Hours spent on games that fit your criteria, on average</div>
              <div className="flex h-2 rounded-full overflow-hidden bg-nz-bg-subtle">
                <div className="bg-nz-primary" style={{ width: "29%" }} />
                <div className="bg-nz-bg-subtle" style={{ width: "71%" }} />
              </div>
              <div className="flex justify-between text-[10px] font-mono text-nz-text-muted mt-1">
                <span>29.0%</span><span>71.0%</span>
              </div>
            </div>
            {/* Playtime Distribution */}
            <div className="bg-white border border-nz-border rounded-card shadow-card p-5">
              <div className="text-xs font-body text-nz-text-secondary mb-1">Playtime Distribution</div>
              <div className="flex items-end gap-1.5 h-16 mt-2">
                {[
                  { label: "1", h: 20 }, { label: ">1", h: 45 }, { label: ">5", h: 70 },
                  { label: ">10", h: 90 }, { label: ">25", h: 55 }, { label: ">50", h: 30 },
                ].map((b) => (
                  <div key={b.label} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full rounded-t bg-nz-primary" style={{ height: `${b.h}%` }} />
                    <span className="text-[9px] font-mono text-nz-text-muted">{b.label}</span>
                  </div>
                ))}
              </div>
              <div className="text-[9px] font-body text-nz-text-muted mt-1 text-center">hours</div>
            </div>
          </div>

          {/* Taxonomies section */}
          <div className="bg-white border border-nz-border rounded-card shadow-card p-6 mb-8">
            <h3 className="text-base font-heading font-semibold text-nz-text mb-1">Taxonomies that resonate with your Segment</h3>
            <p className="text-xs font-body text-nz-text-muted mb-5">Ranked on MAU | February 2026 | 37 Markets</p>
            <div className="grid grid-cols-5 gap-6">
              {([
                { title: "GENRES", items: MOCK_TAXONOMIES.genres },
                { title: "SUB-GENRES", items: MOCK_TAXONOMIES.subGenres },
                { title: "GAME MECHANICS", items: MOCK_TAXONOMIES.mechanics },
                { title: "ART STYLES", items: MOCK_TAXONOMIES.artStyles },
                { title: "THEMES", items: MOCK_TAXONOMIES.themes },
              ]).map((col) => (
                <div key={col.title}>
                  <div className="text-[10px] font-heading font-semibold text-nz-text-secondary uppercase tracking-wider mb-3">{col.title}</div>
                  <div className="space-y-3">
                    {col.items.map((item) => (
                      <div key={item.name}>
                        <div className="flex justify-between text-xs font-body mb-1">
                          <span className="text-nz-text">{item.name}</span>
                          <span className="text-nz-text-muted font-mono">{item.mau}</span>
                        </div>
                        <div className="h-1.5 bg-nz-bg-subtle rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-nz-primary" style={{ width: `${item.pct}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Included Games */}
          <div className="bg-white border border-nz-border rounded-card shadow-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-heading font-semibold text-nz-text">Included Games</h3>
              <span className="text-xs font-mono text-nz-text-muted">524 games</span>
            </div>
            {/* Filter chips */}
            <div className="flex gap-2 mb-4">
              {["Table Filters", "Games set", "Genre", "Subgenre", "Clear All"].map((chip) => (
                <span key={chip} className={`text-xs font-body px-2.5 py-1 rounded-full border cursor-pointer ${
                  chip === "Clear All"
                    ? "text-nz-red border-nz-red/20 hover:bg-red-50"
                    : "text-nz-text-secondary border-nz-border hover:border-nz-primary/30"
                }`}>
                  {chip}
                </span>
              ))}
            </div>
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-nz-border">
                    {["GAME", "PUBLISHER", "GENRE", "RELEASE DATE", "PLATFORMS", "MARKETS", "MAU", "PLAYER SHARE"].map((h) => (
                      <th key={h} className="text-left text-[10px] font-heading font-semibold text-nz-text-secondary uppercase tracking-wider py-2 pr-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MOCK_GAMES.map((g) => (
                    <tr key={g.title} className="border-b border-nz-bg-subtle hover:bg-nz-bg-subtle/50">
                      <td className="py-2.5 pr-3 font-body font-medium text-nz-text">{g.title}</td>
                      <td className="py-2.5 pr-3 font-body text-nz-text-secondary">{g.publisher}</td>
                      <td className="py-2.5 pr-3 font-body text-nz-text-secondary">{g.genre}</td>
                      <td className="py-2.5 pr-3 font-body text-nz-text-muted whitespace-nowrap">{g.date}</td>
                      <td className="py-2.5 pr-3">{g.platforms}</td>
                      <td className="py-2.5 pr-3 font-mono text-nz-text-secondary">{g.markets}</td>
                      <td className="py-2.5 pr-3 font-mono font-semibold text-nz-text">{g.mau}</td>
                      <td className="py-2.5 pr-3 font-mono text-nz-text-secondary">{g.share}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === "region" && (
        <div className="bg-white border border-nz-border rounded-card shadow-card p-12 text-center">
          <p className="text-sm font-body text-nz-text-muted">Coming soon</p>
        </div>
      )}

      {activeTab === "overlap" && (
        <div className="bg-white border border-nz-border rounded-card shadow-card p-12 text-center">
          <p className="text-sm font-body text-nz-text-muted">Coming soon</p>
        </div>
      )}
    </div>
  );
}

// ─── Inline Segment Builder View (V0 and V1) ───

function SegmentBuilderView({ onBack }: { onBack: () => void }) {
  const projects = useProjectStore((s) => s.projects);
  const syncProjectSegments = useProjectStore((s) => s.syncProjectSegments);
  const { version } = useVersion();
  const proj = projects[0];
  const projectId = proj?.id ?? "default";

  const [columns, setColumns] = useState<SegmentColumn[]>(() => {
    const col = emptyColumn(0);
    col.name = "Unnamed Player Segment";
    return [col];
  });
  const [isSavedSegment, setIsSavedSegment] = useState(false);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [rulesChanged, setRulesChanged] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [saveDropdownOpen, setSaveDropdownOpen] = useState(false);
  const [actionsDropdownOpen, setActionsDropdownOpen] = useState(false);
  const [saveAsNameInput, setSaveAsNameInput] = useState(false);
  const [saveAsName, setSaveAsName] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);

  const saveDropdownRef = useRef<HTMLDivElement>(null);
  const actionsDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (saveDropdownRef.current && !saveDropdownRef.current.contains(e.target as Node)) setSaveDropdownOpen(false);
      if (actionsDropdownRef.current && !actionsDropdownRef.current.contains(e.target as Node)) setActionsDropdownOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toastMsg) return;
    const t = setTimeout(() => setToastMsg(null), 3000);
    return () => clearTimeout(t);
  }, [toastMsg]);

  // Load from localStorage on mount
  useEffect(() => {
    const key = scopedKey(`project_${projectId}_segments`);
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setColumns(parsed);
          setIsSavedSegment(true);
        }
      }
    } catch { /* ignore */ }
  }, [projectId]);

  // Persist on change
  useEffect(() => {
    const key = scopedKey(`project_${projectId}_segments`);
    localStorage.setItem(key, JSON.stringify(columns));
  }, [columns, projectId]);

  // Track rule fingerprint to detect changes after analysis
  const col0 = columns[0];
  const ruleFingerprint = JSON.stringify([
    col0?.playRules?.map((r: { entityValue: string }) => r.entityValue),
    col0?.demoRules?.map((r: { value: string }) => r.value),
    col0?.psychoRules?.map((r: { value: string }) => r.value),
    col0?.moneyRules?.length,
  ]);
  const lastAnalyzedFingerprintRef = useRef<string | null>(null);

  // Watch for analysis completion
  const wasAnalyzedRef = useRef(col0?.analyzed ?? false);
  useEffect(() => {
    if (col0?.analyzed && !wasAnalyzedRef.current) {
      setAnalysisLoading(true);
      setShowResults(false);
      setRulesChanged(false);
      lastAnalyzedFingerprintRef.current = ruleFingerprint;
      const timer = setTimeout(() => {
        setAnalysisLoading(false);
        setShowResults(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
    wasAnalyzedRef.current = col0?.analyzed ?? false;
  }, [col0?.analyzed, ruleFingerprint]);

  // Detect rule changes after analysis
  useEffect(() => {
    if (showResults && lastAnalyzedFingerprintRef.current && ruleFingerprint !== lastAnalyzedFingerprintRef.current) {
      setShowResults(false);
      setRulesChanged(true);
    }
  }, [ruleFingerprint, showResults]);

  // Wrap setColumns to also reset analyzed state on rule change
  const handleColumnsChange = useCallback((newCols: SegmentColumn[]) => {
    setColumns(newCols);
  }, []);

  const doSave = useCallback((name?: string) => {
    const saveCols = name
      ? columns.map((col, i) => i === 0 ? { ...col, name } : col)
      : columns;
    if (name) setColumns(saveCols);
    syncProjectSegments(projectId, saveCols.map((col) => ({
      name: col.name,
      color: "#00C9A7",
      analyzed: col.analyzed,
      size: col.size,
      convRate: col.convRate,
    })));
    setIsSavedSegment(true);
    setToastMsg("Segment saved");
    setSaveDropdownOpen(false);
    setSaveAsNameInput(false);
    setSaveAsName("");
  }, [columns, projectId, syncProjectSegments]);

  return (
    <div>
      <TopNav breadcrumbs={[]} title="" minimal />
      <div className="p-6">
        {/* Player Segments breadcrumb */}
        <button
          type="button"
          onClick={onBack}
          className="text-xs font-body text-nz-text-muted hover:text-nz-primary transition-colors mb-2"
        >
          Player Segments
        </button>

        {/* Header row */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2 min-w-0 flex-1 mr-4">
            {editingTitle ? (
              <input
                autoFocus
                defaultValue={col0?.name || "Unnamed Player Segment"}
                onBlur={(e) => {
                  const val = e.target.value.trim() || "Unnamed Player Segment";
                  setColumns((prev) => prev.map((c, i) => i === 0 ? { ...c, name: val } : c));
                  setEditingTitle(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const val = e.currentTarget.value.trim() || "Unnamed Player Segment";
                    setColumns((prev) => prev.map((c, i) => i === 0 ? { ...c, name: val } : c));
                    setEditingTitle(false);
                  }
                  if (e.key === "Escape") setEditingTitle(false);
                }}
                className="text-xl font-heading font-semibold text-nz-text border-b-2 border-nz-primary focus:outline-none bg-transparent min-w-0 flex-1"
              />
            ) : (
              <>
                <h1
                  className="text-xl font-heading font-semibold text-nz-text truncate cursor-pointer hover:text-nz-primary transition-colors"
                  onClick={() => setEditingTitle(true)}
                >
                  {col0?.name || "Unnamed Player Segment"}
                </h1>
                <button
                  type="button"
                  onClick={() => setEditingTitle(true)}
                  className="text-nz-text-muted hover:text-nz-primary shrink-0 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Save button with dropdown */}
            <div ref={saveDropdownRef} className="relative">
              <button
                type="button"
                onClick={() => { setSaveDropdownOpen(!saveDropdownOpen); setActionsDropdownOpen(false); }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-heading font-semibold text-nz-text bg-white border border-nz-border rounded-card hover:bg-nz-bg-subtle transition-colors"
              >
                Save
                <svg className="w-3 h-3 text-nz-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {saveDropdownOpen && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-nz-border rounded-card shadow-card py-1 min-w-[180px] z-50">
                  {isSavedSegment && (
                    <button
                      type="button"
                      onClick={() => doSave()}
                      className="w-full text-left px-4 py-2 text-sm font-body text-nz-text hover:bg-nz-bg-subtle transition-colors"
                    >
                      Save Current
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => { setSaveAsNameInput(true); setSaveDropdownOpen(false); }}
                    className="w-full text-left px-4 py-2 text-sm font-body text-nz-text hover:bg-nz-bg-subtle transition-colors"
                  >
                    Save as New
                  </button>
                </div>
              )}
            </div>

            {/* Actions button with dropdown */}
            <div ref={actionsDropdownRef} className="relative">
              <button
                type="button"
                onClick={() => { setActionsDropdownOpen(!actionsDropdownOpen); setSaveDropdownOpen(false); }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-heading font-semibold text-nz-text bg-white border border-nz-border rounded-card hover:bg-nz-bg-subtle transition-colors"
              >
                Actions
                <svg className="w-3 h-3 text-nz-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {actionsDropdownOpen && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-nz-border rounded-card shadow-card py-1 min-w-[160px] z-50">
                  <button
                    type="button"
                    onClick={() => { setActionsDropdownOpen(false); onBack(); }}
                    className="w-full text-left px-4 py-2 text-sm font-body text-nz-red hover:bg-red-50 transition-colors"
                  >
                    Exit Segment
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Save as New inline input */}
        {saveAsNameInput && (
          <div className="mb-4 flex items-center gap-3 bg-white border border-nz-border rounded-card p-3 shadow-card">
            <input
              autoFocus
              type="text"
              value={saveAsName}
              onChange={(e) => setSaveAsName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && saveAsName.trim()) doSave(saveAsName.trim()); }}
              placeholder="Enter segment name..."
              className="flex-1 px-3 py-1.5 text-sm font-body text-nz-text border border-nz-border rounded-card focus:outline-none focus:border-nz-primary placeholder:text-nz-text-muted"
            />
            <button
              type="button"
              onClick={() => { if (saveAsName.trim()) doSave(saveAsName.trim()); }}
              disabled={!saveAsName.trim()}
              className="px-4 py-1.5 text-sm font-heading font-semibold text-white bg-nz-primary rounded-card hover:bg-nz-primary-hover transition-colors disabled:opacity-50"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => { setSaveAsNameInput(false); setSaveAsName(""); }}
              className="text-nz-text-muted hover:text-nz-text transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Segment Builder */}
        <SegmentBuilder
          columns={columns}
          onChange={handleColumnsChange}
          projectId={projectId}
        />

        {/* Loading state after Run Analysis */}
        {analysisLoading && (
          <div className="mt-6 bg-white border border-nz-border rounded-card shadow-card p-8 flex items-center justify-center gap-3">
            <svg className="w-5 h-5 animate-spin text-nz-primary" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-sm font-body text-nz-text-secondary">Running analysis...</span>
          </div>
        )}

        {/* Inline analysis results — only after Run Analysis completes */}
        {showResults && !analysisLoading && <InlineAnalysisResults />}

        {/* Empty state placeholder — before Run Analysis or after rules change */}
        {!showResults && !analysisLoading && (
          <div className="mt-6 py-16 flex flex-col items-center justify-center">
            {/* Illustration: overlapping PieChart + Search icons */}
            <div className="relative" style={{ width: 80, height: 80 }}>
              {/* PieChart icon */}
              <svg className="absolute left-0 top-0" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#E879A0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
                <path d="M22 12A10 10 0 0 0 12 2v10z" />
              </svg>
              {/* Search icon */}
              <svg className="absolute bottom-0 right-0" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#00C9A7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </div>
            <h3 className="text-base font-heading font-semibold text-nz-text text-center mt-6">
              Run Query to Populate Dashboard
            </h3>
            <p className={`text-sm font-body text-center max-w-xs mx-auto mt-2 ${
              rulesChanged ? "text-nz-orange" : "text-nz-text-secondary"
            }`}>
              {rulesChanged
                ? "Rules changed \u2014 re-run analysis to update results"
                : "Please run your query above to display data on this dashboard or change scope filters. Unintended changes can be reverted."
              }
            </p>
          </div>
        )}
      </div>

      {/* Toast notification — bottom left */}
      {toastMsg && (
        <div className="fixed bottom-6 left-6 z-[9999] px-4 py-3 bg-nz-accent text-white text-sm font-body rounded-card shadow-card-hover flex items-center gap-2 animate-in">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M5 13l4 4L19 7" />
          </svg>
          {toastMsg}
        </div>
      )}
    </div>
  );
}

// ─── Helpers for segment card rule summaries ───

function buildRuleSummary(projectId: string): { rules: string[]; keywords: string[] } {
  try {
    const raw = localStorage.getItem(scopedKey(`project_${projectId}_segments`));
    if (!raw) return { rules: [], keywords: [] };
    const cols = JSON.parse(raw);
    if (!Array.isArray(cols) || cols.length === 0) return { rules: [], keywords: [] };
    const col = cols[0];
    const rules: string[] = [];
    const keywords: string[] = [];
    if (col.playRules) {
      for (const r of col.playRules) {
        if (r.entityValue) {
          const vals = r.entityValue.split("||").filter(Boolean);
          keywords.push(...vals);
          rules.push(`${r.ruleType === "not_played" ? "Excludes" : "Played"} ${r.entityType}: ${vals.join(", ")}`);
        }
      }
    }
    if (col.demoRules) {
      for (const r of col.demoRules) {
        if (r.value) {
          keywords.push(r.value);
          rules.push(`${r.attribute}: ${r.value}`);
        }
      }
    }
    if (col.psychoRules) {
      for (const r of col.psychoRules) {
        if (r.value) {
          keywords.push(r.value);
          rules.push(`${r.attribute}: ${r.value}`);
        }
      }
    }
    return { rules, keywords };
  } catch {
    return { rules: [], keywords: [] };
  }
}

// ─── Single Segment Workspace Landing (V0/V1) ───

function SingleSegmentWorkspace() {
  const projects = useProjectStore((s) => s.projects);
  const { version } = useVersion();
  const [view, setView] = useState<"landing" | "builder">("landing");
  const [searchQuery, setSearchQuery] = useState("");

  const proj = projects[0];

  if (view === "builder") {
    return <SegmentBuilderView onBack={() => setView("landing")} />;
  }

  const savedSegments = proj
    ? proj.segments.filter((s) => s.addressableMarket > 0 || (s.name !== "Segment 1" && s.name !== "Unnamed Player Segment"))
    : [];
  const ruleSummary = proj ? buildRuleSummary(proj.id) : { rules: [], keywords: [] };
  const filteredSegments = searchQuery
    ? savedSegments.filter((s) => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : savedSegments;

  return (
    <div>
      <TopNav breadcrumbs={[]} title="" minimal />

      {/* Hero section */}
      <div
        className="px-8 py-10"
        style={{
          background: "linear-gradient(135deg, #F0FDF9 0%, #F5F3FF 50%, #FAF5FF 100%)",
          borderBottom: "1px solid #E5E7EB",
        }}
      >
        <div className="max-w-3xl">
          {version === "v1" ? (
            <>
              <h1 className="text-2xl font-heading font-bold text-nz-text mb-2">
                Player Segments on STEROID {"\ud83d\udc89"}
              </h1>
              <p className="text-sm font-body text-nz-text-secondary mb-4">
                Create your own group of players to analyze
              </p>
              <p className="text-sm font-body text-nz-text-body mb-4 max-w-2xl">
                The Player Segments Creator allows you to build highly enriched audience segments using
                four powerful dimensions — what they play, who they are, why they play, and what they pay.
                Go beyond gameplay behaviour and layer in demographics, psychographics, and monetization
                signals to define your most valuable player segments with precision.
              </p>
              <div className="text-xs font-body font-medium text-nz-primary-text bg-nz-primary-light rounded-card px-3 py-1.5 inline-block mb-4">
                {"\u2726"} Unlocks: enrich segments with demographics, psychographics, and monetization signals
              </div>
              <div className="flex flex-wrap gap-2 mb-6">
                {["4 dimensions", "Demographic filters", "Psychographic filters", "Monetization filters"].map((chip) => (
                  <span key={chip} className="bg-nz-primary-light text-nz-primary-text border border-nz-primary/20 rounded-full text-xs px-3 py-1 font-body font-medium">
                    {chip}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-heading font-bold text-nz-text mb-2">Player Segments</h1>
              <p className="text-sm font-body text-nz-text-secondary mb-4">
                Create your own group of players to analyze
              </p>
              <p className="text-sm font-body text-nz-text-body mb-6 max-w-2xl">
                The Player Segments Creator allows you to build your own segment of players in the market
                based on players&apos; engagement across titles, genres, and more. With this segment of players
                you can analyze the total addressable market, overlap with genres and games, and other key metrics.
              </p>
            </>
          )}
          <button
            type="button"
            onClick={() => setView("builder")}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-heading font-semibold text-white bg-nz-primary rounded-card hover:bg-nz-primary-hover transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M12 4v16m8-8H4" />
            </svg>
            Create New
          </button>
        </div>
      </div>

      {/* My Player Segments section */}
      <div className="p-8">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-heading font-semibold text-nz-text">My Player Segments</h2>
            <span className="text-xs font-mono font-semibold bg-nz-bg-subtle text-nz-text-secondary px-2 py-0.5 rounded-full">
              {savedSegments.length}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <select className="text-sm font-body text-nz-text-secondary bg-white border border-nz-border rounded-card px-3 py-1.5 focus:outline-none focus:border-nz-primary">
              <option>Sort by Last updated</option>
              <option>Sort by Name</option>
              <option>Sort by Size</option>
            </select>
            <div className="relative">
              <svg className="w-4 h-4 text-nz-text-muted absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Find player segments"
                className="text-sm font-body text-nz-text pl-9 pr-3 py-1.5 border border-nz-border rounded-card bg-white focus:outline-none focus:border-nz-primary w-56 placeholder:text-nz-text-muted"
              />
            </div>
          </div>
        </div>

        {/* Segment cards — grid layout */}
        {filteredSegments.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSegments.map((seg, i) => (
              <div key={i} className="bg-white border border-nz-border rounded-card shadow-card p-4">
                <div className="mb-2">
                  <h3 className="font-heading font-semibold text-nz-text">{seg.name}</h3>
                  <span className="text-xs font-body text-nz-text-muted">Created recently</span>
                </div>

                {ruleSummary.rules.length > 0 ? (
                  <p className="text-sm font-body text-nz-text-body mb-3">
                    {ruleSummary.rules.map((rule, ri) => {
                      const keyword = ruleSummary.keywords[ri];
                      if (keyword && rule.includes(keyword)) {
                        const parts = rule.split(keyword);
                        return (
                          <span key={ri}>
                            {ri > 0 && <span className="text-nz-text-muted"> &middot; </span>}
                            {parts[0]}<span className="text-nz-primary font-semibold">{keyword}</span>{parts.slice(1).join(keyword)}
                          </span>
                        );
                      }
                      return (
                        <span key={ri}>
                          {ri > 0 && <span className="text-nz-text-muted"> &middot; </span>}
                          {rule}
                        </span>
                      );
                    })}
                  </p>
                ) : (
                  <p className="text-sm font-body text-nz-text-muted mb-3">No rules defined yet</p>
                )}

                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-body text-nz-text-muted">Not shared with anyone</span>
                  <span className="text-sm font-body text-nz-primary cursor-pointer hover:underline">Manage</span>
                </div>

                <div className="flex items-center gap-3 pt-3 border-t border-nz-border">
                  <button type="button" className="text-nz-red hover:text-nz-red/80 transition-colors" title="Delete">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                  <button type="button" className="text-sm font-body text-nz-text-secondary hover:text-nz-text transition-colors">
                    Duplicate
                  </button>
                  <div className="flex-1" />
                  <button
                    type="button"
                    onClick={() => setView("builder")}
                    className="px-3 py-1.5 text-sm font-body font-medium text-white bg-nz-accent rounded-card hover:bg-nz-accent-hover transition-colors"
                  >
                    Open
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-nz-border rounded-card shadow-card p-12 text-center">
            <p className="text-sm font-body text-nz-text-muted">
              No saved player segments yet. Create one to get started.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── V2+ Hero content per version ───

const V2_PLUS_HERO: Record<string, { title: string; subtitle: string; body: string; unlock: string; chips: string[] }> = {
  v2: {
    title: "Multi-Segment Analysis",
    subtitle: "Find and prioritize your highest-value player segments",
    body: "Build multi-segment projects and compare audience potential across your game\u2019s lifecycle stages. Layer GPME behavioral data to understand who your players are and where the biggest conversion opportunities lie.",
    unlock: "Unlocks: compare multiple segments side by side with conversion rate data",
    chips: ["Multi-segment", "Conversion rate", "Audience overlap", "Project model"],
  },
  v3: {
    title: "Multi-Segment Analysis + Trends",
    subtitle: "Track how your target segments evolve over time",
    body: "Everything in V2, plus longitudinal tracking to monitor segment growth and decay. See whether your core audience is expanding or contracting \u2014 and benchmark against comparable titles.",
    unlock: "Unlocks: track segment trends over time and benchmark against comparable titles",
    chips: ["Multi-segment", "Trend tracking", "S-curve projection", "Benchmarking"],
  },
  v4: {
    title: "Audience Intelligence",
    subtitle: "From segment discovery to campaign execution",
    body: "The complete audience intelligence suite. Connect segment insights to Data Fusion and GPMR signals, export campaign briefs, and build a full go-to-market strategy grounded in player behavior data.",
    unlock: "Unlocks: export campaign briefs and connect to Data Fusion + GPMR",
    chips: ["Multi-segment", "Data Fusion", "Campaign brief", "Export"],
  },
  v5: {
    title: "AI-Powered Audience Intelligence",
    subtitle: "Describe your player. We\u2019ll build the strategy.",
    body: "The full platform plus AI-assisted segment building. Describe your ideal player in plain language and let the system define the segments, surface the insights, and recommend the strategy \u2014 powered by GPMR, GGS, and Data Fusion.",
    unlock: "Unlocks: AI segment building from natural language \u2014 no manual rules needed",
    chips: ["AI segment building", "Full Data Fusion", "Campaign brief", "Full automation"],
  },
};

// ─── Recent projects tracker ───

function getRecentProjects(version: string): { id: string; name: string; openedAt: number }[] {
  try {
    const raw = localStorage.getItem(scopedKey(`recent_projects`));
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}

function trackRecentProject(version: string, id: string, name: string) {
  const recent = getRecentProjects(version);
  const filtered = recent.filter((r) => r.id !== id);
  filtered.unshift({ id, name, openedAt: Date.now() });
  try {
    localStorage.setItem(scopedKey(`recent_projects`), JSON.stringify(filtered.slice(0, 3)));
  } catch { /* ignore */ }
}

// ─── Main ───

export default function DashboardPage() {
  const projects = useProjectStore((s) => s.projects);
  const deleteProject = useProjectStore((s) => s.deleteProject);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const { showConversionRate, hasProjectModel, version } = useVersion();
  const [searchQuery, setSearchQuery] = useState("");
  const [recentProjects, setRecentProjects] = useState<{ id: string; name: string; openedAt: number }[]>([]);
  const router = useRouter();

  // Load recent projects on mount
  useEffect(() => {
    if (hasProjectModel) {
      setRecentProjects(getRecentProjects(version));
    }
  }, [hasProjectModel, version]);

  // V0/V1: single segment workspace — no project grid
  if (!hasProjectModel) {
    return <SingleSegmentWorkspace />;
  }

  // V2+ hero content
  const hero = V2_PLUS_HERO[version] ?? V2_PLUS_HERO.v2;

  // Search filter — matches project names and segment names
  const filteredProjects = searchQuery.trim()
    ? projects.filter((p) => {
        const q = searchQuery.toLowerCase();
        if (p.title.toLowerCase().includes(q)) return true;
        return p.segments.some((s) => s.name.toLowerCase().includes(q));
      })
    : projects;

  const handleOpenProject = (projId: string, projName: string) => {
    trackRecentProject(version, projId, projName);
    router.push(`/projects/${projId}/audience`);
  };

  return (
    <div>
      <TopNav breadcrumbs={[]} title="" minimal />

      {/* Hero section */}
      <div
        className="px-8 py-10"
        style={{
          background: "linear-gradient(135deg, #F0FDF9 0%, #F5F3FF 50%, #FAF5FF 100%)",
          borderBottom: "1px solid #E5E7EB",
        }}
      >
        <div className="max-w-3xl">
          <h1 className="text-2xl font-heading font-bold text-nz-text mb-2">{hero.title}</h1>
          <p className="text-sm font-body text-nz-text-secondary mb-4">{hero.subtitle}</p>
          <p className="text-sm font-body text-nz-text-body mb-4 max-w-2xl">{hero.body}</p>
          <div className="text-xs font-body font-medium text-nz-primary-text bg-nz-primary-light rounded-card px-3 py-1.5 inline-block mb-4">
            {"\u2726"} {hero.unlock}
          </div>
          <div className="flex flex-wrap gap-2 mb-6">
            {hero.chips.map((chip) => (
              <span key={chip} className="bg-nz-primary-light text-nz-primary-text border border-nz-primary/20 rounded-full text-xs px-3 py-1 font-body font-medium">
                {chip}
              </span>
            ))}
          </div>
          <Link
            href="/projects/new"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-heading font-semibold text-white bg-nz-primary rounded-card hover:bg-nz-primary-hover transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M12 4v16m8-8H4" />
            </svg>
            New Project
          </Link>
        </div>
      </div>

      <div className="p-8">
        {/* Recently opened */}
        {!searchQuery && recentProjects.length > 0 && (
          <div className="mb-6">
            <div className="text-xs font-heading font-semibold text-nz-text-secondary uppercase tracking-wider mb-2">Recently opened</div>
            <div className="flex gap-3">
              {recentProjects.map((rp) => (
                <button
                  key={rp.id}
                  type="button"
                  onClick={() => handleOpenProject(rp.id, rp.name)}
                  className="bg-white border border-nz-border rounded-card shadow-card px-4 py-3 flex items-center gap-3 hover:shadow-card-hover transition-all text-left min-w-[200px]"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-heading font-semibold text-nz-text truncate">{rp.name}</div>
                    <div className="text-[10px] font-body text-nz-text-muted mt-0.5">
                      {new Date(rp.openedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </div>
                  </div>
                  <span className="text-sm font-body text-nz-primary shrink-0">Open</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* My Projects header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-heading font-semibold text-nz-text">My Projects</h2>
            <span className="text-xs font-mono font-semibold bg-nz-bg-subtle text-nz-text-secondary px-2 py-0.5 rounded-full">
              {projects.length}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <select className="text-sm font-body text-nz-text-secondary bg-white border border-nz-border rounded-card px-3 py-1.5 focus:outline-none focus:border-nz-primary">
              <option>Sort by Last updated</option>
              <option>Sort by Name</option>
              <option>Sort by Size</option>
            </select>
            <div className="relative">
              <svg className="w-4 h-4 text-nz-text-muted absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Find projects"
                className="text-sm font-body text-nz-text pl-9 pr-3 py-1.5 border border-nz-border rounded-card bg-white focus:outline-none focus:border-nz-primary w-56 placeholder:text-nz-text-muted"
              />
            </div>
          </div>
        </div>

        {/* Project cards grid */}
        {filteredProjects.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProjects.map((proj) => {
              const segs = proj.segments;
              const gradientColors =
                segs.length >= 2
                  ? `linear-gradient(to right, ${segs[0].color}, ${segs[1].color})`
                  : segs.length === 1
                  ? segs[0].color
                  : "#E5E7EB";

              const matchedSegName = searchQuery.trim()
                ? segs.find((s) => s.name.toLowerCase().includes(searchQuery.toLowerCase()))?.name
                : null;

              return (
                <div key={proj.id} className="bg-white border border-nz-border rounded-card shadow-card overflow-hidden">
                  {/* Top gradient bar */}
                  <div className="h-1.5" style={{ background: gradientColors }} />

                  <div className="p-4">
                    {/* Title + badges */}
                    <h3 className="font-heading font-semibold text-nz-text">{proj.title}</h3>
                    <div className="flex gap-2 mt-2">
                      {proj.lifecycle && (
                        <span className="text-[11px] font-medium font-body px-2 py-0.5 rounded-full bg-nz-teal/10 text-nz-teal">
                          {proj.lifecycle}
                        </span>
                      )}
                      {proj.monetization && (
                        <span className="text-[11px] font-medium font-body px-2 py-0.5 rounded-full bg-nz-bg-subtle text-nz-text-secondary">
                          {proj.monetization}
                        </span>
                      )}
                    </div>

                    {/* Segment bars */}
                    <div className="mt-4 space-y-2.5">
                      {segs.map((seg, i) => {
                        const isMatch = matchedSegName === seg.name;
                        return (
                          <div key={i}>
                            <div className="flex items-center justify-between mb-1">
                              <span className={`text-[11px] font-body ${isMatch ? "text-nz-primary font-semibold" : "text-nz-text-secondary"}`}>
                                {seg.name}
                              </span>
                              {showConversionRate && (
                                <span className="text-[11px] font-mono font-semibold text-nz-text">
                                  {seg.conversionRate > 0 ? `${seg.conversionRate}%` : "\u2014"}
                                </span>
                              )}
                            </div>
                            {showConversionRate && seg.conversionRate > 0 && (
                              <div className="h-1.5 bg-nz-bg-subtle rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${Math.min(seg.conversionRate * 5, 100)}%`,
                                    backgroundColor: seg.color,
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Bottom stats */}
                    <div className={`mt-4 pt-3 border-t border-nz-border grid gap-2 text-center ${showConversionRate ? "grid-cols-3" : "grid-cols-2"}`}>
                      <div>
                        <div className="text-[10px] font-body text-nz-text-secondary uppercase tracking-wider">
                          <MetricTooltip
                            label="Market"
                            definition="Unique players behaviorally qualified for your game across all segments."
                            whyItMatters="Tells you the real size of your targetable audience."
                          />
                        </div>
                        <div className="text-sm font-mono font-semibold text-nz-text mt-0.5">
                          {proj.totalAddressableAudience > 0 ? formatNumber(proj.totalAddressableAudience) : "\u2014"}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] font-body text-nz-text-secondary uppercase tracking-wider">
                          <MetricTooltip
                            label="Adopters"
                            definition="Players who purchased and played your game, drawn from the addressable market."
                            whyItMatters="Your actual conversion pool."
                          />
                        </div>
                        <div className="text-sm font-mono font-semibold text-nz-text mt-0.5">
                          {proj.totalAdopters > 0 ? formatNumber(proj.totalAdopters) : "\u2014"}
                        </div>
                      </div>
                      {showConversionRate && (
                        <div>
                          <div className="text-[10px] font-body text-nz-text-secondary uppercase tracking-wider">
                            <MetricTooltip
                              label="Conv %"
                              definition="Adopters / Addressable Market x 100."
                              whyItMatters="Your efficiency rate. Higher = your segments are well-targeted."
                            />
                          </div>
                          <div className="text-sm font-mono font-semibold text-nz-text mt-0.5">
                            {proj.generalPopConversionRate > 0 ? `${proj.generalPopConversionRate}%` : "\u2014"}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions row */}
                    <div className="flex items-center gap-3 mt-3 pt-3 border-t border-nz-border">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: proj.id, name: proj.title }); }}
                        className="text-nz-red hover:text-nz-red/80 transition-colors"
                        title="Delete"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                      <button type="button" className="text-sm font-body text-nz-text-secondary hover:text-nz-text transition-colors">
                        Duplicate
                      </button>
                      <div className="flex-1" />
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleOpenProject(proj.id, proj.title); }}
                        className="px-3 py-1.5 text-sm font-body font-medium text-white bg-nz-accent rounded-card hover:bg-nz-accent-hover transition-colors"
                      >
                        Open
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : searchQuery.trim() ? (
          <div className="bg-white border border-nz-border rounded-card shadow-card p-12 text-center">
            <p className="text-sm font-body text-nz-text-muted">
              No projects or segments matching &ldquo;{searchQuery}&rdquo;
            </p>
          </div>
        ) : (
          <div className="bg-white border border-nz-border rounded-card shadow-card p-12 text-center">
            <p className="text-sm font-body text-nz-text-muted">
              No saved projects yet. Create one to get started.
            </p>
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <DeleteModal
          projectName={deleteTarget.name}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => {
            deleteProject(deleteTarget.id);
            setDeleteTarget(null);
          }}
        />
      )}
    </div>
  );
}
