"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { TopNav } from "@/components/TopNav";
import { MetricTooltip } from "@/components/MetricTooltip";
import {
  segments as kcd2Segments,
  project as kcd2Project,
  overlapMatrix,
  segmentOverlapGames,
  formatNumber,
} from "@/lib/mockData";
import { useProjectStore } from "@/lib/store";
import type { ProjectData, SegmentData, ComparableTitle } from "@/lib/store";
import { useVersion } from "@/contexts/VersionContext";
import { scopedKey } from "@/lib/versionedStorage";

const SEGMENT_COLORS = ["#4F46E5", "#22C55E", "#F6A623", "#805AD5", "#A0AEC0"];
const TIERS = ["Core", "Secondary", "Tertiary", "Quaternary", "Additional"];

// ─── Lifecycle helpers ───

type LifecycleStage = "greenlight" | "prelaunch" | "launched" | "live";

function getLifecycleStage(lifecycle: string): LifecycleStage {
  const lc = lifecycle.toLowerCase();
  if (lc.includes("greenlight") || lc.includes("concept")) return "greenlight";
  if (lc.includes("pre-launch") || lc.includes("prelaunch") || lc.includes("development")) return "prelaunch";
  if (lc.includes("live service") || lc.includes("live")) return "live";
  if (lc.includes("launched") || lc.includes("launch")) return "launched";
  return "prelaunch";
}

function isPreLaunchStage(stage: LifecycleStage): boolean {
  return stage === "greenlight" || stage === "prelaunch";
}

function lifecyclePillLabel(stage: LifecycleStage): string {
  switch (stage) {
    case "greenlight": return "GREENLIGHT";
    case "prelaunch": return "PRE-LAUNCH";
    case "launched": return "LAUNCHED";
    case "live": return "LIVE";
  }
}

function lifecyclePillStyle(stage: LifecycleStage): { bg: string; color: string; pulse?: boolean } {
  switch (stage) {
    case "greenlight": return { bg: "#FEF3E0", color: "#B96B00" };
    case "prelaunch": return { bg: "#EEF2FF", color: "#4F46E5" };
    case "launched": return { bg: "#00C9A7", color: "#FFFFFF" };
    case "live": return { bg: "#10B981", color: "#FFFFFF", pulse: true };
  }
}

// ─── Priority Score ───

function computePriorityScores(
  segs: SegmentView[],
  stage: LifecycleStage,
): number[] {
  if (segs.length === 0) return [];

  const maxBenchmarkMid = Math.max(...segs.map((s) => s.benchmarkConvMid || 0), 0.01);
  const maxActualConv = Math.max(...segs.map((s) => s.conversionRate || 0), 0.01);
  const maxAddressable = Math.max(...segs.map((s) => s.addressableMarket), 1);

  return segs.map((seg) => {
    const specificity = Math.min(seg.ruleCount / 10, 1);
    const addressableSizeIndex = seg.addressableMarket / maxAddressable;

    if (isPreLaunchStage(stage)) {
      const convNorm = (seg.benchmarkConvMid || 0) / maxBenchmarkMid;
      return Math.round((convNorm * 0.5 + addressableSizeIndex * 0.4 + specificity * 0.1) * 100) / 100;
    } else {
      const convNorm = (seg.conversionRate || 0) / maxActualConv;
      return Math.round((convNorm * 0.5 + addressableSizeIndex * 0.3 + specificity * 0.2) * 100) / 100;
    }
  });
}

// ─── Segment View ───

interface SegmentView {
  id: string;
  name: string;
  tier: string;
  color: string;
  addressableMarket: number;
  conversionRate: number;
  adopters: number;
  ruleCount: number;
  benchmarkConvLow: number;
  benchmarkConvMid: number;
  benchmarkConvHigh: number;
  comparableTitles: ComparableTitle[];
  confidence: "High" | "Medium" | "Low";
  priorityScore: number;
}

function buildSegmentViews(project: ProjectData, isKcd2: boolean): SegmentView[] {
  if (isKcd2) {
    return kcd2Segments.map((s, i) => ({
      id: s.id,
      name: s.name,
      tier: s.tier,
      color: s.color,
      addressableMarket: s.addressableMarket,
      conversionRate: s.conversionRate,
      adopters: s.adopters,
      ruleCount: [3, 2, 2][i] || 2,
      benchmarkConvLow: [10.2, 2.0, 1.1][i],
      benchmarkConvMid: [12.5, 2.8, 1.7][i],
      benchmarkConvHigh: [15.1, 4.0, 2.5][i],
      comparableTitles: [
        { title: "The Witcher 3", convRate: [14.2, 3.5, 2.1][i], similarity: [88, 72, 80][i], genre: "Action RPG", year: 2015 },
        { title: "Elden Ring", convRate: [11.8, 4.1, 1.4][i], similarity: [75, 82, 65][i], genre: "Action RPG", year: 2022 },
        { title: "Red Dead Redemption 2", convRate: [9.5, 2.2, 2.0][i], similarity: [70, 60, 78][i], genre: "Action-Adventure", year: 2018 },
        { title: "Baldur's Gate 3", convRate: [15.0, 2.8, 1.8][i], similarity: [85, 68, 72][i], genre: "RPG", year: 2023 },
        { title: "Medieval Dynasty", convRate: [12.1, 1.9, 2.3][i], similarity: [92, 55, 85][i], genre: "Simulation RPG", year: 2021 },
      ],
      confidence: "High" as const,
      priorityScore: 0,
    }));
  }

  return (project.segments || []).map((s, i) => ({
    id: `seg-${i}`,
    name: s.name,
    tier: s.tier,
    color: s.color || SEGMENT_COLORS[i] || SEGMENT_COLORS[0],
    addressableMarket: s.addressableMarket,
    conversionRate: s.conversionRate,
    adopters:
      s.addressableMarket > 0 && s.conversionRate > 0
        ? Math.round(s.addressableMarket * (s.conversionRate / 100))
        : 0,
    ruleCount: 2,
    benchmarkConvLow: s.benchmarkConvLow ?? 0,
    benchmarkConvMid: s.benchmarkConvMid ?? 0,
    benchmarkConvHigh: s.benchmarkConvHigh ?? 0,
    comparableTitles: s.comparableTitles ?? [],
    confidence: s.confidence ?? "Medium",
    priorityScore: s.priorityScore ?? 0,
  }));
}

// ─── Prioritization State ───

interface PrioritizationState {
  mode: "auto" | "manual";
  manualOrder: string[];
  dismissedBanner: boolean;
}

function loadPrioritizationState(projectId: string): PrioritizationState {
  if (typeof window === "undefined") return { mode: "auto", manualOrder: [], dismissedBanner: false };
  try {
    const raw = localStorage.getItem(scopedKey(`project_${projectId}_prioritization`));
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { mode: "auto", manualOrder: [], dismissedBanner: false };
}

function savePrioritizationState(projectId: string, state: PrioritizationState) {
  if (typeof window !== "undefined") {
    localStorage.setItem(scopedKey(`project_${projectId}_prioritization`), JSON.stringify(state));
  }
}

// ─── UI Components ───

function HeatCell({ value, color }: { value: number; color: string }) {
  const opacity = Math.min(value / 100, 1) * 0.7 + 0.1;
  return (
    <span
      className="inline-block px-2.5 py-1 rounded text-[11px] font-semibold"
      style={{
        backgroundColor: color + Math.round(opacity * 255).toString(16).padStart(2, "0"),
        color: opacity > 0.4 ? "#fff" : "#111827",
      }}
    >
      {value}%
    </span>
  );
}

function BullseyeDiagram({
  segs,
  totalAdopters,
  stage,
}: {
  segs: SegmentView[];
  totalAdopters: number;
  stage: LifecycleStage;
}) {
  const cx = 220;
  const cy = 200;
  const maxR = 160;

  if (segs.length === 0) return null;

  const maxSize = Math.max(...segs.map((s) => s.addressableMarket), 1);
  const radii = segs.map((s) => Math.sqrt(s.addressableMarket / maxSize) * maxR);

  const indexed = segs.map((seg, i) => ({ seg, r: radii[i], i }));
  const rings = [...indexed].sort((a, b) => b.r - a.r);

  const calloutSpacing = Math.min(120, 340 / Math.max(segs.length, 1));
  const calloutStartY = cy - ((segs.length - 1) * calloutSpacing) / 2;

  return (
    <svg viewBox="0 0 620 400" className="w-full max-w-2xl mx-auto" style={{ overflow: "visible" }}>
      {rings.map(({ seg, r }) => (
        <circle
          key={seg.id}
          cx={cx}
          cy={cy}
          r={r}
          fill={seg.color}
          fillOpacity={0.12}
          stroke={seg.color}
          strokeWidth={2}
        />
      ))}

      <text x={cx} y={cy - 8} textAnchor="middle" fill="#111827" fontSize={16} fontWeight={700}>
        {formatNumber(totalAdopters)}
      </text>
      <text x={cx} y={cy + 10} textAnchor="middle" fill="#6B7280" fontSize={10}>
        {isPreLaunchStage(stage) ? "Predicted Adopters" : "Total Adopters"}
      </text>

      {segs.map((seg, i) => {
        const angle = -0.3 + (i * 0.9) / Math.max(segs.length - 1, 1);
        const ly = calloutStartY + i * calloutSpacing;
        const edgeX = cx + radii[i] * Math.cos(angle);
        const edgeY = cy + radii[i] * Math.sin(angle);

        return (
          <g key={seg.id}>
            <line x1={edgeX} y1={edgeY} x2={440} y2={ly} stroke="#E5E7EB" strokeWidth={1} />
            <circle cx={edgeX} cy={edgeY} r={3} fill={seg.color} />
            <text x={445} y={ly - 10} textAnchor="start" fill="#111827" fontSize={11} fontWeight={600}>
              {seg.name}
            </text>
            <text x={445} y={ly + 4} textAnchor="start" fill="#6B7280" fontSize={10}>
              {formatNumber(seg.addressableMarket)} players addressable
            </text>
            {isPreLaunchStage(stage) ? (
              <>
                <text x={445} y={ly + 18} textAnchor="start" fill="#6B7280" fontSize={10}>
                  {seg.benchmarkConvMid > 0
                    ? `~${formatNumber(Math.round(seg.addressableMarket * (seg.benchmarkConvLow / 100)))}–${formatNumber(Math.round(seg.addressableMarket * (seg.benchmarkConvHigh / 100)))} predicted`
                    : "Benchmark pending…"}
                </text>
                {seg.benchmarkConvMid > 0 && (
                  <text x={445} y={ly + 32} textAnchor="start" fill="#6B7280" fontSize={10}>
                    {seg.benchmarkConvLow}%&ndash;{seg.benchmarkConvHigh}% benchmark
                  </text>
                )}
              </>
            ) : (
              <text x={445} y={ly + 18} textAnchor="start" fill="#6B7280" fontSize={10}>
                {seg.conversionRate}% conv.
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ─── Comparable Titles Modal ───

function ComparableTitlesModal({
  segmentName,
  titles,
  onClose,
}: {
  segmentName: string;
  titles: ComparableTitle[];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E7EB]">
          <div>
            <h3 className="text-sm font-semibold text-[#111827]">
              Comparable Titles &mdash; {segmentName}
            </h3>
            <p className="text-xs text-[#6B7280] mt-0.5">
              {titles.length} launched titles used to calculate benchmark conversion rate
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-[#6B7280] hover:text-[#111827]">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#E5E7EB]">
                <th className="text-left py-2 px-3 text-[#6B7280] font-semibold uppercase text-[10px]">
                  Game Title
                </th>
                <th className="text-left py-2 px-3 text-[#6B7280] font-semibold uppercase text-[10px]">
                  Genre
                </th>
                <th className="text-center py-2 px-3 text-[#6B7280] font-semibold uppercase text-[10px]">
                  Launch Year
                </th>
                <th className="text-center py-2 px-3 text-[#6B7280] font-semibold uppercase text-[10px]">
                  Conv. Rate
                </th>
                <th className="text-center py-2 px-3 text-[#6B7280] font-semibold uppercase text-[10px]">
                  Similarity
                </th>
              </tr>
            </thead>
            <tbody>
              {titles.map((t, i) => (
                <tr key={i} className="border-b border-[#F5F6F8] last:border-0">
                  <td className="py-2.5 px-3 font-medium text-[#111827]">{t.title}</td>
                  <td className="py-2.5 px-3 text-[#374151]">{t.genre}</td>
                  <td className="py-2.5 px-3 text-center text-[#374151]">{t.year}</td>
                  <td className="py-2.5 px-3 text-center font-semibold text-[#111827]">{t.convRate}%</td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold"
                      style={{
                        backgroundColor: t.similarity >= 80 ? "#E6FAF7" : t.similarity >= 60 ? "#FEF3E0" : "#F5F6F8",
                        color: t.similarity >= 80 ? "#007A6E" : t.similarity >= 60 ? "#B96B00" : "#6B7280",
                      }}
                    >
                      {t.similarity}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-[#E5E7EB] text-[10px] text-[#6B7280]">
          Similarity calculated from genre, mechanics, theme overlap, and behavioral profile match via Naz GPME data.
        </div>
      </div>
    </div>
  );
}

// ─── Recommended Budget Split ───

type BudgetPhase = "pre-launch" | "launch-window" | "post-launch";

const TIER_BADGES: Record<string, { label: string; color: string }> = {
  Core: { label: "Highest ROI", color: "#4F46E5" },
  Secondary: { label: "Scale after Core", color: "#22C55E" },
  Tertiary: { label: "Awareness", color: "#F6A623" },
  Quaternary: { label: "Broad reach", color: "#805AD5" },
  Additional: { label: "Broad reach", color: "#A0AEC0" },
};

function computeBudgetAllocations(
  segs: SegmentView[],
  phase: BudgetPhase,
): { name: string; color: string; tier: string; pct: number }[] {
  if (segs.length === 0) return [];
  if (segs.length === 1) {
    return [{ name: segs[0].name, color: segs[0].color, tier: segs[0].tier, pct: 100 }];
  }

  const totalSize = segs.reduce((s, seg) => s + seg.addressableMarket, 0) || 1;
  const totalConv = segs.reduce((s, seg) => s + (seg.benchmarkConvMid || 0), 0) || 1;

  const rawWeights = segs.map((seg) => {
    const sizeIndex = seg.addressableMarket / totalSize;
    const convIndex = (seg.benchmarkConvMid || 0) / totalConv;
    if (seg.priorityScore > 0) {
      return convIndex * 0.5 + sizeIndex * 0.3 + seg.priorityScore * 0.2;
    }
    return convIndex * 0.6 + sizeIndex * 0.4;
  });

  const totalWeight = rawWeights.reduce((s, w) => s + w, 0) || 1;
  let pcts = rawWeights.map((w) => Math.round((w / totalWeight) * 100));

  // Apply phase modifier
  if (phase === "pre-launch" && segs.length > 1) {
    const coreIdx = segs.findIndex((s) => s.tier === "Core");
    if (coreIdx >= 0 && pcts[coreIdx] > 8) {
      const reduction = 8;
      pcts[coreIdx] -= reduction;
      const perOther = Math.floor(reduction / (segs.length - 1));
      const leftover = reduction - perOther * (segs.length - 1);
      pcts = pcts.map((p, i) => (i === coreIdx ? p : p + perOther));
      // give leftover to next segment after core
      const nextIdx = coreIdx + 1 < segs.length ? coreIdx + 1 : 0;
      if (nextIdx !== coreIdx) pcts[nextIdx] += leftover;
    }
  } else if (phase === "post-launch" && segs.length > 1) {
    const coreIdx = segs.findIndex((s) => s.tier === "Core");
    if (coreIdx >= 0) {
      const increase = 8;
      // Take from lowest-tier segments first (reverse order)
      let remaining = increase;
      for (let i = segs.length - 1; i >= 0 && remaining > 0; i--) {
        if (i === coreIdx) continue;
        const take = Math.min(remaining, Math.max(pcts[i] - 1, 0));
        pcts[i] -= take;
        remaining -= take;
      }
      pcts[coreIdx] += increase - remaining;
    }
  }

  // Fix rounding to sum to exactly 100
  const sum = pcts.reduce((s, p) => s + p, 0);
  if (sum !== 100) {
    const maxIdx = pcts.indexOf(Math.max(...pcts));
    pcts[maxIdx] += 100 - sum;
  }

  return segs.map((seg, i) => ({
    name: seg.name,
    color: seg.color,
    tier: seg.tier,
    pct: pcts[i],
  }));
}

const DONUT_COLORS = ["#1D9E75", "#7F77DD", "#888780", "#EF9F27", "#378ADD"];

function BudgetSplitSection({
  segs,
  stage,
}: {
  segs: SegmentView[];
  stage: LifecycleStage;
}) {
  const defaultPhase: BudgetPhase =
    stage === "launched" || stage === "live" ? "post-launch" : "launch-window";
  const [phase, setPhase] = useState<BudgetPhase>(defaultPhase);
  const chartRef = useRef<any>(null);
  const [chartReady, setChartReady] = useState(false);
  const canvasId = useRef("budget-donut-" + Math.random().toString(36).slice(2, 9)).current;

  const allocations = computeBudgetAllocations(segs, phase);
  const showToggle = allocations.length > 1;

  const phases: { id: BudgetPhase; label: string }[] = [
    { id: "pre-launch", label: "Pre-Launch" },
    { id: "launch-window", label: "Launch Window" },
    { id: "post-launch", label: "Post-Launch" },
  ];

  // Load Chart.js UMD from cdnjs
  useEffect(() => {
    if ((window as any).Chart) {
      setChartReady(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js";
    script.onload = () => setChartReady(true);
    document.head.appendChild(script);
  }, []);

  // Create / update donut chart
  useEffect(() => {
    if (!chartReady || allocations.length === 0) return;
    const ChartJS = (window as any).Chart;
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
    if (!ChartJS || !canvas) return;

    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    const colors = allocations.map((_, i) => DONUT_COLORS[i % DONUT_COLORS.length]);

    const centerTextPlugin = {
      id: "budgetCenterText",
      afterDraw(chart: any) {
        const { ctx, chartArea } = chart;
        const cx = (chartArea.left + chartArea.right) / 2;
        const cy = (chartArea.top + chartArea.bottom) / 2;
        const text = chart._budgetCenterText || "";
        if (!text) { ctx.restore(); return; }
        ctx.save();
        ctx.font = "bold 20px system-ui, sans-serif";
        ctx.fillStyle = "#1F2937";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(text, cx, cy);
        ctx.restore();
      },
    };

    const chart = new ChartJS(canvas, {
      type: "doughnut",
      data: {
        labels: allocations.map((a) => a.name),
        datasets: [
          {
            data: allocations.map((a) => a.pct),
            backgroundColor: colors,
            borderWidth: 0,
            hoverOffset: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        cutout: "65%",
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false },
        },
        onHover: (_event: any, elements: any[]) => {
          if (elements.length > 0) {
            const idx = elements[0].index;
            const pct = allocations[idx].pct + "%";
            chart._budgetCenterText = pct;
          } else {
            chart._budgetCenterText = "";
          }
        },
      },
      plugins: [centerTextPlugin],
    });

    chart._budgetCenterText = "";
    chartRef.current = chart;

    return () => {
      chart.destroy();
      chartRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartReady, canvasId, allocations.map((a) => `${a.name}:${a.pct}`).join(",")]);

  if (allocations.length === 0) return null;

  return (
    <div className="bg-white rounded-card border border-nz-border p-4 mb-6 shadow-card">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-base font-heading font-bold text-nz-text">Recommended Budget Split</h3>
        {showToggle && (
          <div className="flex gap-1">
            {phases.map((p) => (
              <button
                key={p.id}
                onClick={() => setPhase(p.id)}
                className={`px-3 py-1 text-[11px] font-medium rounded-full border transition-colors ${
                  phase === p.id
                    ? "bg-nz-primary text-white border-nz-primary"
                    : "bg-white text-[#374151] border-[#E5E7EB] hover:border-nz-primary/30"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <p className="text-xs text-[#6B7280] italic mb-4">
        Relative allocation based on segment priority, addressable market size, and benchmark conversion rates.
      </p>

      <div style={{ display: "flex", alignItems: "center", gap: 24, paddingLeft: 16, overflow: "visible" }}>
        {/* Donut chart */}
        <div style={{ position: "relative", width: 200, height: 200, flexShrink: 0, overflow: "visible" }}>
          <canvas id={canvasId} />
        </div>

        {/* Legend */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
          {allocations.map((alloc, i) => {
            const badge = TIER_BADGES[alloc.tier] || TIER_BADGES.Additional;
            const color = DONUT_COLORS[i % DONUT_COLORS.length];
            return (
              <div key={alloc.name} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: color, flexShrink: 0 }} />
                <span className="text-sm text-nz-text font-medium" style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{alloc.name}</span>
                <span
                  className="text-[10px] font-semibold"
                  style={{ backgroundColor: badge.color + "18", color: badge.color, padding: "2px 8px", borderRadius: 9999, whiteSpace: "nowrap" }}
                >
                  {badge.label}
                </span>
                <span className="text-sm text-nz-text" style={{ fontWeight: 600, minWidth: 36, textAlign: "right" }}>{alloc.pct}%</span>
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-[11px] text-[#6B7280] mt-4 flex items-start gap-1">
        <svg className="w-3 h-3 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
        Allocation reflects relative audience opportunity, not absolute spend. Adjust for your media costs, platform mix, and creative budget. Phase modifier shifts weight between awareness and conversion goals.
      </p>
    </div>
  );
}

// ─── Priority Score Tooltip Content ───

function priorityScoreTooltipFormula(stage: LifecycleStage): string {
  if (isPreLaunchStage(stage)) {
    return "Score = (Benchmark Conv. 50%) + (Audience Size 40%) + (Specificity 10%)\nWhere:\nConv = your benchmark mid / highest benchmark mid\nSize = your addressable / largest addressable\nSpecificity = rule count / 10 (max 1.0)";
  }
  return "Score = (Actual Conv. 50%) + (Audience Size 30%) + (Specificity 20%)\nWhere:\nConv = your actual conv / highest actual conv\nSize = your addressable / largest addressable\nSpecificity = rule count / 10 (max 1.0)";
}

// ─── Toast Notification ───

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2000);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[10000] animate-fade-in">
      <div className="bg-[#38A169] text-white text-sm font-medium px-4 py-2 rounded-full shadow-lg">
        {message}
      </div>
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateX(-50%) translateY(8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}.animate-fade-in{animation:fadeIn .2s ease-out}`}</style>
    </div>
  );
}

// ─── Export Dropdown ───

function ExportDropdown({
  projectTitle,
  lifecycle,
  segs,
  totalAddressableAudience,
  generalPopConversionRate,
  onToast,
}: {
  projectTitle: string;
  lifecycle: string;
  segs: SegmentView[];
  totalAddressableAudience: number;
  generalPopConversionRate: number;
  onToast: (msg: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function handlePDF() {
    setOpen(false);
    window.print();
  }

  function handleCSV() {
    setOpen(false);
    const today = new Date().toISOString().slice(0, 10);
    const slug = projectTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const stage = getLifecycleStage(lifecycle);
    const defaultPhase: BudgetPhase = stage === "launched" || stage === "live" ? "post-launch" : "launch-window";
    const allocations = computeBudgetAllocations(segs, defaultPhase);
    const allocMap = new Map(allocations.map((a) => [a.name, a.pct]));

    const headers = ["Segment Name", "Tier", "Addressable Market", "Predicted Adopters", "Conv Rate (Low)", "Conv Rate (Mid)", "Conv Rate (High)", "Benchmark Confidence", "Priority Score", "Comparable Titles Count", "Budget Split %"];
    const rows = segs.map((s) => [
      s.name,
      s.tier,
      s.addressableMarket,
      s.adopters,
      s.benchmarkConvLow,
      s.benchmarkConvMid,
      s.benchmarkConvHigh,
      s.confidence,
      s.priorityScore.toFixed(2),
      s.comparableTitles.length,
      allocMap.get(s.name) ?? 0,
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.map((v) => `"${v}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug}-audience-segments-${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    onToast("CSV downloaded!");
  }

  function handleCopy() {
    setOpen(false);
    const today = new Date().toLocaleDateString();
    const lines = [
      `${projectTitle} — Audience Summary`,
      `Generated: ${today}`,
      "",
    ];
    segs.forEach((s) => {
      const adopters = s.addressableMarket > 0 && (s.benchmarkConvMid || s.conversionRate) > 0
        ? Math.round(s.addressableMarket * ((s.benchmarkConvMid || s.conversionRate) / 100))
        : s.adopters;
      lines.push(`${s.tier.toUpperCase()}: ${s.name} | ${formatNumber(s.addressableMarket)} addressable | ${(s.benchmarkConvMid || s.conversionRate)}% conv | ${formatNumber(adopters)} predicted adopters`);
    });
    lines.push("");
    lines.push(`Total addressable: ${formatNumber(totalAddressableAudience)} | Overall conv: ${generalPopConversionRate}%`);
    lines.push("Powered by Naz Audience Intelligence");

    navigator.clipboard.writeText(lines.join("\n")).then(() => onToast("Copied!"));
  }

  return (
    <div ref={ref} className="relative print:hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-4 py-2 text-sm font-body font-medium text-nz-text bg-white border border-nz-border rounded-card hover:bg-nz-bg-subtle transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Export
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-10 bg-white border border-nz-border rounded-lg shadow-lg min-w-[200px] z-[9999] py-1">
          <button onClick={handlePDF} className="w-full text-left px-4 py-2 text-sm text-nz-text hover:bg-gray-50">Export as PDF</button>
          <button onClick={handleCSV} className="w-full text-left px-4 py-2 text-sm text-nz-text hover:bg-gray-50">Export segment data (CSV)</button>
          <button onClick={handleCopy} className="w-full text-left px-4 py-2 text-sm text-nz-text hover:bg-gray-50">Copy summary to clipboard</button>
        </div>
      )}
    </div>
  );
}

// ─── Campaign Brief Modal ───

function CampaignBriefModal({
  projectTitle,
  lifecycle,
  platforms,
  monetization,
  segs,
  totalAddressableAudience,
  generalPopConversionRate,
  onClose,
}: {
  projectTitle: string;
  lifecycle: string;
  platforms: string[];
  monetization: string;
  segs: SegmentView[];
  totalAddressableAudience: number;
  generalPopConversionRate: number;
  onClose: () => void;
}) {
  const [brief, setBrief] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const { version: appVersion } = useVersion();

  const stage = getLifecycleStage(lifecycle);
  const defaultPhase: BudgetPhase = stage === "launched" || stage === "live" ? "post-launch" : "launch-window";
  const allocations = computeBudgetAllocations(segs, defaultPhase);
  const allocMap = new Map(allocations.map((a) => [a.name, a.pct]));

  const generateBrief = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const segLines = segs.map((s) => {
        const adopters = Math.round(s.addressableMarket * ((s.benchmarkConvMid || s.conversionRate) / 100));
        return `- ${s.tier}: ${s.name}\n  Addressable: ${formatNumber(s.addressableMarket)}\n  Conv rate: ${s.benchmarkConvMid || s.conversionRate}% | Predicted adopters: ${formatNumber(adopters)}\n  Priority Score: ${s.priorityScore.toFixed(2)}\n  Budget Split: ${allocMap.get(s.name) ?? 0}%`;
      }).join("\n");

      const res = await fetch("/api/generate-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          _campaignBrief: true,
          segmentName: "campaign-brief",
          segmentIndex: 0,
          addressableMarket: totalAddressableAudience,
          conversionRate: generalPopConversionRate,
          rules: { playRules: [], demoRules: [], psychoRules: [], moneyRules: [] },
          projectTitle,
          lifecycle,
          platforms,
          version: appVersion,
          briefPrompt: `Generate a campaign brief for ${projectTitle}.
Lifecycle: ${lifecycle}. Platform: ${platforms.join(", ")}.
Business model: ${monetization}.

Segments:
${segLines}

Total addressable audience: ${formatNumber(totalAddressableAudience)}
Overall conversion rate: ${generalPopConversionRate}%

Include these sections:
1. Campaign Objective (2-3 sentences)
2. Target Audience Summary (one paragraph)
3. Segment Strategy (bullet per segment: role, activation approach, budget priority)
4. Key Metrics to Track (5-6 KPIs with targets)
5. Recommended Campaign Phases (Pre-launch / Launch / Post-launch with timing and focus per phase)
6. Risk Flags (2-3 things to watch)`,
        }),
      });

      if (!res.ok) throw new Error("Failed to generate brief");
      const data = await res.json();
      const text = data.profile?.brief || data.brief || data.profile;
      if (typeof text === "string") {
        setBrief(text);
      } else {
        // Fallback: format the profile data as a brief
        setBrief(formatFallbackBrief(projectTitle, lifecycle, platforms, monetization, segs, allocMap, totalAddressableAudience, generalPopConversionRate));
      }
    } catch {
      // Use local fallback brief generation
      setBrief(formatFallbackBrief(projectTitle, lifecycle, platforms, monetization, segs, allocMap, totalAddressableAudience, generalPopConversionRate));
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectTitle, lifecycle, platforms, monetization, segs, totalAddressableAudience, generalPopConversionRate]);

  useEffect(() => { generateBrief(); }, [generateBrief]);

  function handleCopy() {
    if (brief) navigator.clipboard.writeText(brief).then(() => setToastMsg("Copied!"));
  }

  function handleDownload() {
    if (!brief) return;
    const today = new Date().toISOString().slice(0, 10);
    const slug = projectTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const blob = new Blob([brief], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug}-campaign-brief-${today}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center print:hidden">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-card border border-nz-border-strong w-full max-w-3xl max-h-[90vh] flex flex-col z-10">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-nz-border shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-nz-text">Campaign Brief — {projectTitle}</h2>
            <p className="text-xs text-nz-text-muted mt-1">AI-generated brief based on your segment analysis. Review and edit before sharing.</p>
          </div>
          <button onClick={onClose} className="text-nz-text-muted hover:text-nz-text p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="space-y-4 animate-pulse">
              <div className="text-sm text-nz-text-muted text-center mb-4">Generating your campaign brief...</div>
              {[...Array(6)].map((_, i) => (
                <div key={i}>
                  <div className="h-4 bg-gray-200 rounded w-48 mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-full mb-1" />
                  <div className="h-3 bg-gray-100 rounded w-5/6 mb-1" />
                  <div className="h-3 bg-gray-100 rounded w-4/6" />
                </div>
              ))}
            </div>
          )}
          {error && !loading && (
            <div className="text-center py-8">
              <p className="text-sm text-red-500 mb-3">{error}</p>
              <button onClick={generateBrief} className="px-4 py-2 bg-nz-primary text-white text-sm font-medium rounded-lg hover:bg-nz-primary/90">Try Again</button>
            </div>
          )}
          {brief && !loading && (
            <div className="prose prose-sm max-w-none">
              {brief.split("\n").map((line, i) => {
                if (/^\d+\.\s/.test(line) || /^#{1,3}\s/.test(line)) {
                  const text = line.replace(/^#{1,3}\s/, "").trim();
                  return <h3 key={i} className="text-sm font-bold text-nz-text mt-5 mb-2">{text}</h3>;
                }
                if (line.startsWith("- ") || line.startsWith("* ")) {
                  return <p key={i} className="text-sm text-nz-text-secondary pl-4 mb-1">• {line.slice(2)}</p>;
                }
                if (line.trim() === "") return <div key={i} className="h-2" />;
                return <p key={i} className="text-sm text-nz-text-secondary mb-1">{line}</p>;
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-nz-border shrink-0">
          <button onClick={handleCopy} disabled={!brief} className="px-4 py-2 text-sm font-medium text-[#374151] border border-nz-border rounded-lg hover:bg-gray-50 disabled:opacity-40">Copy to Clipboard</button>
          <button onClick={handleDownload} disabled={!brief} className="px-4 py-2 text-sm font-medium text-[#374151] border border-nz-border rounded-lg hover:bg-gray-50 disabled:opacity-40">Download as .txt</button>
          <button onClick={generateBrief} disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-nz-primary rounded-lg hover:bg-nz-primary-hover disabled:opacity-60">
            {loading ? "Generating..." : "Regenerate"}
          </button>
        </div>
      </div>
      {toastMsg && <Toast message={toastMsg} onDone={() => setToastMsg(null)} />}
    </div>
  );
}

function formatFallbackBrief(
  projectTitle: string,
  lifecycle: string,
  platforms: string[],
  monetization: string,
  segs: SegmentView[],
  allocMap: Map<string, number>,
  totalAddressableAudience: number,
  generalPopConversionRate: number,
): string {
  const today = new Date().toLocaleDateString();
  const lines = [
    `CAMPAIGN BRIEF — ${projectTitle.toUpperCase()}`,
    `Generated: ${today}`,
    `Lifecycle: ${lifecycle} | Platforms: ${platforms.join(", ")} | Model: ${monetization}`,
    "",
    "1. Campaign Objective",
    `Drive awareness and conversion across ${formatNumber(totalAddressableAudience)} addressable players segmented into ${segs.length} audience cohorts. Maximize ROI by concentrating spend on highest-converting segments while maintaining awareness across broader audiences.`,
    "",
    "2. Target Audience Summary",
    `The total addressable audience of ${formatNumber(totalAddressableAudience)} players spans ${segs.length} segments with an overall conversion rate of ${generalPopConversionRate}%. ${segs[0]?.name || "The core segment"} represents the highest-intent cohort with a ${segs[0]?.benchmarkConvMid || segs[0]?.conversionRate || 0}% conversion rate.`,
    "",
    "3. Segment Strategy",
  ];
  segs.forEach((s) => {
    const budget = allocMap.get(s.name) ?? 0;
    const adopters = Math.round(s.addressableMarket * ((s.benchmarkConvMid || s.conversionRate) / 100));
    lines.push(`- ${s.tier}: ${s.name} — ${formatNumber(s.addressableMarket)} addressable, ${formatNumber(adopters)} predicted adopters, ${budget}% budget allocation`);
  });
  lines.push("", "4. Key Metrics to Track");
  lines.push("- Cost per acquisition (CPA) by segment");
  lines.push("- Conversion rate vs benchmark at D7, D30, D90");
  lines.push("- Return on ad spend (ROAS) by segment");
  lines.push("- Audience reach vs addressable market penetration");
  lines.push("- Cross-segment overlap efficiency");
  lines.push("", "5. Recommended Campaign Phases");
  lines.push("- Pre-Launch: Broad awareness across all segments, establish brand presence");
  lines.push("- Launch Window (D1-D30): Concentrate spend on Core and Secondary segments");
  lines.push("- Post-Launch (D30+): Double down on highest-ROI segments, reduce low-performers");
  lines.push("", "6. Risk Flags");
  lines.push("- Segment overlap may cause audience duplication in paid media");
  lines.push("- Benchmark conversion rates are modelled — actual results may vary");
  lines.push(`- ${segs.length > 2 ? "Lower-tier segments may not justify dedicated creative" : "Limited segment diversity may constrain targeting options"}`);
  lines.push("", `Generated by Naz Audience Intelligence | ${today}`);
  return lines.join("\n");
}

// ─── Print Styles ───

function PrintStyles() {
  return (
    <style media="print">{`
      @media print {
        .print\\:hidden, nav, aside, [data-sidebar], .fixed { display: none !important; }
        body { margin: 0; padding: 0; }
        @page { margin: 1cm; }
        .p-6 { padding: 0 !important; }
        .mb-6 { page-break-inside: avoid; }
        .bg-white { box-shadow: none !important; border: 1px solid #E5E7EB !important; }
      }
    `}</style>
  );
}

// ─── Main Component ───

export default function AudiencePage() {
  const params = useParams();
  const projectId = params.id as string;
  const project = useProjectStore((s) => s.projects.find((p) => p.id === projectId));
  const updateSegmentBenchmark = useProjectStore((s) => s.updateSegmentBenchmark);
  const projectTitle = project?.title ?? "Project";
  const isKcd2 = projectId === "kcd2";

  const totalAddressableAudience = project?.totalAddressableAudience ?? (isKcd2 ? kcd2Project.totalAddressableAudience : 0);
  const totalTrackedUsers = project?.totalTrackedUsers ?? (isKcd2 ? kcd2Project.totalTrackedUsers : 0);
  const generalPopConversionRate = project?.generalPopConversionRate ?? (isKcd2 ? kcd2Project.generalPopConversionRate : 0);
  const totalAdopters = project?.totalAdopters ?? (isKcd2 ? kcd2Project.totalAdopters : 0);

  const lifecycle = project?.lifecycle ?? (isKcd2 ? kcd2Project.lifecycle : "Pre-Launch");
  const stage = getLifecycleStage(lifecycle);
  const pillStyle = lifecyclePillStyle(stage);
  const { showBullseye, showConversionRate, showCampaignBrief, showExport, version } = useVersion();

  // Build segment views
  const rawSegs = project ? buildSegmentViews(project, isKcd2) : [];

  // Priority scores
  const priorityScores = computePriorityScores(rawSegs, stage);
  const segsWithScores = rawSegs.map((s, i) => ({ ...s, priorityScore: priorityScores[i] || 0 }));

  // Prioritization state
  const [prioState, setPrioState] = useState<PrioritizationState>(() => loadPrioritizationState(projectId));
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [titlesModalSeg, setTitlesModalSeg] = useState<SegmentView | null>(null);
  const [benchmarkLoading, setBenchmarkLoading] = useState<Set<number>>(new Set());
  const [showBriefModal, setShowBriefModal] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // ─── Dynamic sections for non-kcd2 projects ───
  interface OverlapRow { label: string; segmentsQualified: number; userCount: number; adopters: number; conversionRate: number }
  interface InsightCard { segmentName: string; tier: string; color: string; headline: string; body: string }
  interface AffinityRow { title: string; affinities: number[] }

  const [dynOverlap, setDynOverlap] = useState<OverlapRow[] | null>(null);
  const [dynInsights, setDynInsights] = useState<InsightCard[] | null>(null);
  const [dynAffinity, setDynAffinity] = useState<AffinityRow[] | null>(null);
  const [dynIsPreLaunch, setDynIsPreLaunch] = useState(false);
  const [sectionsLoading, setSectionsLoading] = useState(false);

  // ─── Benchmark backfill: auto-fetch for segments missing benchmark data ───
  useEffect(() => {
    if (isKcd2 || !project) return;

    const segmentsToBackfill = project.segments
      .map((s, i) => ({ seg: s, index: i }))
      .filter(({ seg }) => seg.addressableMarket > 0 && seg.conversionRate > 0 && !seg.benchmarkConvMid);

    if (segmentsToBackfill.length === 0) return;

    // Load segment builder columns for rule data
    let columns: Array<{ name: string; playRules: Array<{ entityType: string; entityValue: string; ruleType: string }>; demoRules: Array<{ attribute: string; value: string }>; psychoRules: Array<{ attribute: string; value: string }>; moneyRules: Array<{ ruleType: string; category?: string }> }> = [];
    try {
      const raw = localStorage.getItem(scopedKey(`project_${projectId}_segments`));
      if (raw) columns = JSON.parse(raw);
    } catch { /* ignore */ }

    for (const { seg, index } of segmentsToBackfill) {
      setBenchmarkLoading((prev) => new Set(prev).add(index));

      const col = columns[index];
      const rules = col ? {
        playRules: col.playRules || [],
        demoRules: col.demoRules || [],
        psychoRules: col.psychoRules || [],
        moneyRules: col.moneyRules || [],
      } : { playRules: [], demoRules: [], psychoRules: [], moneyRules: [] };

      fetch("/api/benchmark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          segmentName: seg.name,
          segmentIndex: index,
          addressableMarket: seg.addressableMarket,
          rules,
          projectTitle: project.title,
          lifecycle: project.lifecycle,
          platforms: project.platforms,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.benchmarkConvMid) {
            updateSegmentBenchmark(projectId, index, {
              benchmarkConvLow: data.benchmarkConvLow,
              benchmarkConvMid: data.benchmarkConvMid,
              benchmarkConvHigh: data.benchmarkConvHigh,
              comparableTitles: data.comparableTitles || [],
              confidence: data.confidence || "Medium",
            });

            // Also merge into localStorage results cache
            try {
              const cacheKey = scopedKey(`project_${projectId}_results`);
              const cache = JSON.parse(localStorage.getItem(cacheKey) || "{}");
              cache[index] = {
                ...cache[index],
                benchmarkConvLow: data.benchmarkConvLow,
                benchmarkConvMid: data.benchmarkConvMid,
                benchmarkConvHigh: data.benchmarkConvHigh,
                comparableTitles: data.comparableTitles || [],
                confidence: data.confidence || "Medium",
              };
              localStorage.setItem(cacheKey, JSON.stringify(cache));
            } catch { /* ignore */ }
          }
          setBenchmarkLoading((prev) => {
            const next = new Set(prev);
            next.delete(index);
            return next;
          });
        })
        .catch(() => {
          setBenchmarkLoading((prev) => {
            const next = new Set(prev);
            next.delete(index);
            return next;
          });
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, isKcd2]);

  // ─── Auto-generate audience sections for non-kcd2 projects ───
  useEffect(() => {
    if (isKcd2 || !project) return;

    const analyzedSegs = project.segments.filter((s) => s.addressableMarket > 0);
    if (analyzedSegs.length === 0) return;

    // Check localStorage cache first
    const cacheKey = scopedKey(`project_${projectId}_audience_sections`);
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.overlap && parsed.insights && parsed.affinity) {
          setDynOverlap(parsed.overlap);
          setDynInsights(parsed.insights);
          setDynAffinity(parsed.affinity);
          setDynIsPreLaunch(parsed.isPreLaunch ?? false);
          return;
        }
      }
    } catch { /* ignore */ }

    // Generate via API
    setSectionsLoading(true);
    fetch("/api/audience-sections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectTitle: project.title,
        lifecycle: project.lifecycle,
        platforms: project.platforms,
        totalTrackedUsers: project.totalTrackedUsers,
        generalPopConversionRate: project.generalPopConversionRate,
        totalAdopters: project.totalAdopters,
        segments: project.segments.map((s, i) => ({
          name: s.name,
          tier: s.tier,
          color: s.color || SEGMENT_COLORS[i] || SEGMENT_COLORS[0],
          addressableMarket: s.addressableMarket,
          conversionRate: s.conversionRate,
          benchmarkConvLow: s.benchmarkConvLow,
          benchmarkConvMid: s.benchmarkConvMid,
          benchmarkConvHigh: s.benchmarkConvHigh,
          priorityScore: s.priorityScore,
        })),
        sections: ["overlap", "insights", "affinity"],
        version,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.overlap) setDynOverlap(data.overlap);
        if (data.insights) setDynInsights(data.insights);
        if (data.affinity) setDynAffinity(data.affinity);
        setDynIsPreLaunch(data.isPreLaunch ?? false);
        // Cache
        try {
          localStorage.setItem(cacheKey, JSON.stringify(data));
        } catch { /* ignore */ }
      })
      .catch(() => { /* ignore */ })
      .finally(() => setSectionsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, isKcd2, project?.segments.length]);

  const updatePrioState = useCallback((patch: Partial<PrioritizationState>) => {
    setPrioState((prev) => {
      const next = { ...prev, ...patch };
      savePrioritizationState(projectId, next);
      return next;
    });
  }, [projectId]);

  // Order segments by priority
  let orderedSegs: SegmentView[];
  if (prioState.mode === "manual" && prioState.manualOrder.length > 0) {
    const orderMap = new Map(prioState.manualOrder.map((name, i) => [name, i]));
    orderedSegs = [...segsWithScores].sort((a, b) => {
      const ai = orderMap.get(a.name) ?? 999;
      const bi = orderMap.get(b.name) ?? 999;
      return ai - bi;
    });
  } else {
    orderedSegs = [...segsWithScores].sort((a, b) => b.priorityScore - a.priorityScore);
  }

  // Assign tiers by order
  const segs = orderedSegs.map((s, i) => ({
    ...s,
    tier: TIERS[Math.min(i, TIERS.length - 1)],
    color: SEGMENT_COLORS[Math.min(i, SEGMENT_COLORS.length - 1)],
  }));

  const coreConvRate = segs[0]?.conversionRate ?? 1;

  // Drag handlers for manual mode
  const handleDragStart = (idx: number) => {
    setDragIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    const newOrder = [...segs.map((s) => s.name)];
    const [removed] = newOrder.splice(dragIdx, 1);
    newOrder.splice(idx, 0, removed);
    updatePrioState({ manualOrder: newOrder });
    setDragIdx(idx);
  };

  const handleDragEnd = () => {
    setDragIdx(null);
  };

  const resetToAuto = () => {
    updatePrioState({ mode: "auto", manualOrder: [] });
  };

  // Pre-launch computed totals
  const totalPredictedLow = segs.reduce((sum, s) => sum + Math.round(s.addressableMarket * (s.benchmarkConvLow / 100)), 0);
  const totalPredictedHigh = segs.reduce((sum, s) => sum + Math.round(s.addressableMarket * (s.benchmarkConvHigh / 100)), 0);
  const totalComparableTitles = new Set(segs.flatMap((s) => (s.comparableTitles ?? []).map((t) => t.title))).size;

  // vs benchmark for launched
  const overallBenchmarkMid = segs.length > 0 ? segs.reduce((sum, s) => sum + (s.benchmarkConvMid || 0), 0) / segs.length : 0;
  const overallActualConv = totalAddressableAudience > 0 ? (totalAdopters / totalAddressableAudience) * 100 : 0;
  const vsBenchmark = overallActualConv - overallBenchmarkMid;

  return (
    <div>
      <PrintStyles />
      <TopNav
        breadcrumbs={[
          { label: "Workspace", href: "/dashboard" },
          { label: projectTitle },
          { label: "Audience" },
        ]}
        title="Audience Overview"
        actions={
          <>
            {showExport && (
              <ExportDropdown
                projectTitle={projectTitle}
                lifecycle={lifecycle}
                segs={segsWithScores}
                totalAddressableAudience={totalAddressableAudience}
                generalPopConversionRate={generalPopConversionRate}
                onToast={setToastMsg}
              />
            )}
            {showCampaignBrief && (
              <button
                onClick={() => setShowBriefModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-body font-medium text-white bg-nz-accent rounded-card hover:bg-nz-accent-hover transition-colors print:hidden"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Campaign Brief
              </button>
            )}
          </>
        }
      />

      <div className="p-6">
        {/* Header banner — lifecycle aware */}
        <div
          className="rounded-card p-6 mb-6 border border-nz-border shadow-card"
          style={{
            background: "linear-gradient(135deg, #F0FDF9 0%, #E6FBF5 100%)",
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-body font-medium uppercase tracking-wider text-nz-text-secondary mb-1 flex items-center gap-1">
                <MetricTooltip
                  label="Total Addressable Audience (De-duplicated)"
                  definition="De-duplicated count of unique players qualifying for at least one segment."
                  whyItMatters="Your true market ceiling — the maximum you can reach with behavioral targeting."
                />
              </div>
              <div className="text-4xl font-mono font-semibold tabular-nums text-nz-teal">
                {formatNumber(totalAddressableAudience)}
              </div>
              {/* Lifecycle-specific sub-line */}
              {isPreLaunchStage(stage) && segs.length > 0 && (
                <div className="text-sm font-body text-nz-text-body mt-2">
                  Predicted adopters across all segments: ~{formatNumber(totalPredictedLow)}&ndash;{formatNumber(totalPredictedHigh)}
                  <span className="text-nz-text-muted ml-2">Based on benchmark conv. rates &middot; {totalComparableTitles} comparable titles</span>
                </div>
              )}
              {!isPreLaunchStage(stage) && segs.length > 0 && (
                <div className="text-sm font-body text-nz-text-body mt-2 flex items-center gap-3">
                  <span>Actual adopters: {formatNumber(totalAdopters)}</span>
                  {showConversionRate && (
                    <>
                      <span className="text-nz-text-muted">&middot;</span>
                      <span>Overall conv: <span className="font-mono">{overallActualConv.toFixed(2)}%</span></span>
                      {overallBenchmarkMid > 0 && (
                        <>
                          <span className="text-nz-text-muted">&middot;</span>
                          <span className="font-mono" style={{ color: vsBenchmark > 0.5 ? "#10B981" : vsBenchmark < -0.5 ? "#EF4444" : "#6B7280" }}>
                            vs benchmark: {vsBenchmark > 0 ? "+" : ""}{vsBenchmark.toFixed(1)}pp {vsBenchmark > 0.5 ? "\u2191" : vsBenchmark < -0.5 ? "\u2193" : ""}
                          </span>
                        </>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="text-xs font-body font-medium uppercase tracking-wider text-nz-text-secondary mb-1 flex items-center justify-end gap-1">
                <MetricTooltip
                  label="Total Tracked Users"
                  definition="Total players in Naz's GPME panel for the selected markets."
                  whyItMatters="The pool your segments were drawn from. Context for understanding market share."
                />
              </div>
              <div className="text-2xl font-mono font-semibold tabular-nums text-nz-text">
                {formatNumber(totalTrackedUsers)}
              </div>
              {showConversionRate && (
                <div className="text-sm font-body text-nz-text-secondary mt-1 flex items-center justify-end gap-1">
                  <MetricTooltip
                    label={`General pop. conv: ${generalPopConversionRate}%`}
                    definition="Conversion rate of the full tracked population, regardless of segment."
                    whyItMatters="Your baseline. Every segment should outperform this — if not, redefine the segment."
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Prioritization toggle + mode banner */}
        {segs.length > 0 && (
          <div className="mb-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {/* Lifecycle pill */}
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
                  style={{ backgroundColor: pillStyle.bg, color: pillStyle.color }}
                >
                  {pillStyle.pulse && (
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: pillStyle.color }} />
                  )}
                  {lifecyclePillLabel(stage)}
                </span>
              </div>

              {/* Priority mode toggle */}
              <div className="flex items-center gap-1 bg-nz-bg-subtle rounded-full p-0.5">
                <button
                  type="button"
                  onClick={() => updatePrioState({ mode: "auto" })}
                  className={`px-3 py-1.5 text-[11px] font-medium rounded-full transition-colors ${
                    prioState.mode === "auto"
                      ? "bg-nz-primary text-white"
                      : "text-[#374151] hover:text-[#111827]"
                  }`}
                >
                  &#10022; Auto-prioritize
                </button>
                <button
                  type="button"
                  onClick={() => {
                    updatePrioState({
                      mode: "manual",
                      manualOrder: segs.map((s) => s.name),
                    });
                  }}
                  className={`px-3 py-1.5 text-[11px] font-medium rounded-full transition-colors ${
                    prioState.mode === "manual"
                      ? "bg-nz-primary text-white"
                      : "text-[#374151] hover:text-[#111827]"
                  }`}
                >
                  &#9998; Set manually
                </button>
              </div>
            </div>

            {/* Info banner */}
            {!prioState.dismissedBanner && (
              <div className="flex items-start gap-3 px-4 py-3 bg-nz-primary-light border border-nz-primary/20 rounded-card">
                <svg className="w-4 h-4 text-nz-primary mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <p className="text-xs text-[#374151] flex-1">
                  {prioState.mode === "auto"
                    ? "Segments are prioritized by conversion performance, audience size, and targeting specificity. Switch to manual to override."
                    : "Manual priority order active. Drag cards to reorder segments."
                  }
                </p>
                <button
                  type="button"
                  onClick={() => updatePrioState({ dismissedBanner: true })}
                  className="text-[#6B7280] hover:text-[#111827] shrink-0"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            {/* Reset to auto link (when in manual mode or was manual before) */}
            {prioState.mode === "manual" && (
              <div className="mt-2">
                <button
                  type="button"
                  onClick={resetToAuto}
                  className="text-xs text-nz-primary hover:underline"
                >
                  Reset to auto
                </button>
              </div>
            )}
          </div>
        )}

        {/* Bullseye / Segment List */}
        {segs.length > 0 ? (
          showBullseye ? (
            <div className="bg-white rounded-card border border-nz-border p-6 mb-6 shadow-card">
              <h3 className="text-sm font-heading font-semibold text-nz-text mb-2 text-center">
                Audience Segmentation &mdash; Bullseye View
              </h3>
              <BullseyeDiagram
                segs={segs}
                totalAdopters={
                  isPreLaunchStage(stage)
                    ? Math.round((totalPredictedLow + totalPredictedHigh) / 2)
                    : totalAdopters
                }
                stage={stage}
              />
            </div>
          ) : (
            /* V1: Simple ranked list instead of bullseye */
            <div className="bg-white rounded-card border border-nz-border p-6 mb-6 shadow-card">
              <h3 className="text-sm font-heading font-semibold text-nz-text mb-4">
                Segments by Addressable Market Size
              </h3>
              <div className="space-y-3">
                {[...segs]
                  .sort((a, b) => b.addressableMarket - a.addressableMarket)
                  .map((seg, i) => (
                    <div key={seg.id} className="flex items-center gap-3">
                      <span className="text-sm font-mono font-semibold text-nz-text-muted w-6">
                        #{i + 1}
                      </span>
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: seg.color }}
                      />
                      <span className="text-sm font-body font-medium text-nz-text flex-1">
                        {seg.name}
                      </span>
                      <span className="text-sm font-mono text-nz-text-secondary">
                        {formatNumber(seg.addressableMarket)} players
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )
        ) : (
          <div className="bg-white rounded-card border border-nz-border p-8 mb-6 text-center">
            <p className="text-sm text-nz-text-muted">
              Run Analysis in the Segment Builder to generate audience data.
            </p>
          </div>
        )}

        {/* Segment comparison cards — lifecycle aware */}
        <div
          className={`grid gap-5 mb-6`}
          style={{ gridTemplateColumns: `repeat(${Math.min(segs.length, 5)}, 1fr)` }}
        >
          {segs.map((seg, i) => {
            // Original index for backfill loading state
            const segOrigIndex = seg.id.startsWith("seg-") ? parseInt(seg.id.slice(4), 10) : -1;
            const isBenchmarkLoading = benchmarkLoading.has(segOrigIndex);
            // vs benchmark for launched stage
            const segVsBenchmark = seg.conversionRate - (seg.benchmarkConvMid || 0);
            const predictedAdoptersLow = Math.round(seg.addressableMarket * (seg.benchmarkConvLow / 100));
            const predictedAdoptersHigh = Math.round(seg.addressableMarket * (seg.benchmarkConvHigh / 100));
            const predictedAdoptersMid = Math.round(seg.addressableMarket * (seg.benchmarkConvMid / 100));
            const earlyEstLow = Math.round(predictedAdoptersLow * 0.7);
            const earlyEstHigh = Math.round(predictedAdoptersHigh * 1.3);

            return (
              <div
                key={seg.id}
                className={`bg-white rounded-card border border-nz-border shadow-card overflow-hidden ${
                  prioState.mode === "manual" ? "cursor-grab active:cursor-grabbing" : ""
                }`}
                draggable={prioState.mode === "manual"}
                onDragStart={() => handleDragStart(i)}
                onDragOver={(e) => handleDragOver(e, i)}
                onDragEnd={handleDragEnd}
              >
                <div className="h-1" style={{ backgroundColor: seg.color }} />
                <div className="p-5">
                  {/* Header: tier + name + lifecycle pill + score */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      {prioState.mode === "manual" && (
                        <span className="text-[#A0AEC0] text-sm shrink-0 cursor-grab" title="Drag to reorder">
                          &#10495;
                        </span>
                      )}
                      <span
                        className="text-[10px] font-bold font-body uppercase px-2 py-0.5 rounded-full shrink-0 text-white"
                        style={{
                          backgroundColor: seg.tier === "Core" ? "#3B82F6" : seg.tier === "Secondary" ? "#00C9A7" : seg.tier === "Tertiary" ? "#F59E0B" : seg.color,
                        }}
                      >
                        {seg.tier}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase"
                        style={{ backgroundColor: pillStyle.bg, color: pillStyle.color }}
                      >
                        {pillStyle.pulse && (
                          <span className="w-1 h-1 rounded-full animate-pulse" style={{ backgroundColor: pillStyle.color }} />
                        )}
                        {lifecyclePillLabel(stage)}
                      </span>
                    </div>
                  </div>

                  <h4 className="text-sm font-semibold text-nz-text mb-4">{seg.name}</h4>

                  <div className="space-y-3">
                    {/* Addressable Market — always shown */}
                    <div className="flex justify-between text-sm">
                      <span className="text-nz-text-secondary">
                        <MetricTooltip
                          label="Addressable Market"
                          definition="Players in Naz's tracked population who behaviorally match this segment's rules."
                          formula="Addressable = Total Tracked Users x segment match rate"
                          whyItMatters="Your maximum reachable audience. Use this to size your UA budget and assess whether the segment is large enough to build a campaign around."
                        />
                      </span>
                      <span className="font-semibold text-nz-text">
                        {formatNumber(seg.addressableMarket)}
                      </span>
                    </div>

                    {/* Lifecycle-specific metrics */}
                    {stage === "greenlight" && (
                      <>
                        {isBenchmarkLoading ? (
                          <div className="flex items-center gap-2 text-sm text-nz-text-muted py-2">
                            <svg className="animate-spin h-4 w-4 text-nz-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Calculating benchmarks&hellip;
                          </div>
                        ) : (
                          <>
                            {/* Early Estimate */}
                            <div className="flex justify-between text-sm">
                              <span className="text-nz-text-secondary">
                                <MetricTooltip
                                  label="Early Estimate"
                                  definition="At Greenlight stage, predictions carry higher uncertainty as the game concept may still evolve. Uses a wider confidence band than Pre-Launch."
                                  formula="Early Estimate = Addressable x Benchmark Conv. Rate +/- 30% expanded uncertainty band"
                                  whyItMatters="Use directionally to validate whether the concept has sufficient audience potential before committing to full production budget."
                                />
                              </span>
                              <div className="text-right">
                                <span className="font-semibold text-nz-text">
                                  ~{formatNumber(earlyEstLow)}&ndash;{formatNumber(earlyEstHigh)}
                                </span>
                                <span className="ml-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#FEF3E0] text-[#B96B00] uppercase">
                                  Early Est.
                                </span>
                              </div>
                            </div>
                            {/* Benchmark Conv Rate */}
                            <div className="flex justify-between text-sm">
                              <span className="text-nz-text-secondary">
                                <MetricTooltip
                                  label="Benchmark Conv. Rate"
                                  definition="The median conversion rate achieved by segments with a similar behavioral profile across comparable launched titles in Naz's GPME catalog."
                                  formula={"Benchmark = median(conv rates of this segment profile across N comparable titles)\nLow = 25th percentile of comparable titles\nHigh = 75th percentile"}
                                  whyItMatters="Your best external reference for expected performance. Higher benchmark = similar audiences have historically responded well to titles like yours. Use the range to build optimistic and conservative launch forecasts."
                                />
                              </span>
                              <span className="font-semibold text-nz-text">
                                {seg.benchmarkConvLow}%&ndash;{seg.benchmarkConvHigh}%
                              </span>
                            </div>
                            {/* Based on N titles */}
                            <div className="flex justify-between text-sm">
                              <span className="text-nz-text-secondary">
                                <MetricTooltip
                                  label="Based on"
                                  definition="Launched titles used to calculate the benchmark conversion rate for this segment profile."
                                  whyItMatters="More comparable titles = higher confidence. Click to see which titles were used and their individual conversion rates."
                                />
                              </span>
                              <button
                                type="button"
                                onClick={() => setTitlesModalSeg(seg)}
                                className="font-semibold text-nz-primary hover:underline"
                              >
                                {(seg.comparableTitles ?? []).length} comparable titles
                              </button>
                            </div>
                            {/* Confidence */}
                            <div className="flex justify-between text-sm">
                              <span className="text-nz-text-secondary">
                                <MetricTooltip
                                  label="Confidence"
                                  definition="Prediction confidence level based on available comparable data."
                                  whyItMatters={"High — 5+ comparable titles. Narrow range. Benchmark well-supported by data.\nMedium — 2-4 titles. Moderate range. Use directionally.\nLow — 0-1 titles. Wide range. Treat as rough order of magnitude only."}
                                />
                              </span>
                              <span className="font-semibold">
                                <span className={seg.confidence === "High" ? "text-green-600" : seg.confidence === "Medium" ? "text-yellow-600" : "text-red-500"}>
                                  {seg.confidence === "High" ? "\u{1F7E2}" : seg.confidence === "Medium" ? "\u{1F7E1}" : "\u{1F534}"}{" "}
                                  {seg.confidence}
                                </span>
                              </span>
                            </div>
                          </>
                        )}
                      </>
                    )}

                    {stage === "prelaunch" && (
                      <>
                        {isBenchmarkLoading ? (
                          <div className="flex items-center gap-2 text-sm text-nz-text-muted py-2">
                            <svg className="animate-spin h-4 w-4 text-nz-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Calculating benchmarks&hellip;
                          </div>
                        ) : (
                          <>
                            {/* Predicted Adopters */}
                            <div className="flex justify-between text-sm">
                              <span className="text-nz-text-secondary">
                                <MetricTooltip
                                  label="Predicted Adopters"
                                  definition="Estimated players likely to buy or download your title at launch, based on how similar segments performed for comparable titles in Naz's GPME catalog."
                                  formula={`Predicted Adopters = Addressable x Benchmark Conv. Rate (mid)\ne.g. ${formatNumber(seg.addressableMarket)} x ${seg.benchmarkConvMid}% = ~${formatNumber(predictedAdoptersMid)}\nRange = Addressable x conv low to conv high`}
                                  whyItMatters="Use to forecast Day 1 sales and set realistic launch targets. Compare segments to decide where to focus pre-launch marketing spend."
                                  caveat="Model-based estimate. Actual results depend on marketing execution, pricing, and timing."
                                />
                              </span>
                              <span className="font-semibold text-nz-text">
                                ~{formatNumber(predictedAdoptersLow)}&ndash;{formatNumber(predictedAdoptersHigh)}
                              </span>
                            </div>
                            {/* Benchmark Conv Rate */}
                            <div className="flex justify-between text-sm">
                              <span className="text-nz-text-secondary">
                                <MetricTooltip
                                  label="Benchmark Conv. Rate"
                                  definition="The median conversion rate achieved by segments with a similar behavioral profile across comparable launched titles in Naz's GPME catalog."
                                  formula={"Benchmark = median(conv rates of this segment profile across N comparable titles)\nLow = 25th percentile of comparable titles\nHigh = 75th percentile"}
                                  whyItMatters="Your best external reference for expected performance. Higher benchmark = similar audiences have historically responded well to titles like yours. Use the range to build optimistic and conservative launch forecasts."
                                />
                              </span>
                              <span className="font-semibold text-nz-text">
                                {seg.benchmarkConvLow}%&ndash;{seg.benchmarkConvHigh}%
                              </span>
                            </div>
                            {/* Based on N titles */}
                            <div className="flex justify-between text-sm">
                              <span className="text-nz-text-secondary">
                                <MetricTooltip
                                  label="Based on"
                                  definition="Launched titles used to calculate the benchmark conversion rate for this segment profile."
                                  whyItMatters="More comparable titles = higher confidence. Click to see which titles were used and their individual conversion rates."
                                />
                              </span>
                              <button
                                type="button"
                                onClick={() => setTitlesModalSeg(seg)}
                                className="font-semibold text-nz-primary hover:underline"
                              >
                                {(seg.comparableTitles ?? []).length} comparable titles
                              </button>
                            </div>
                            {/* Confidence */}
                            <div className="flex justify-between text-sm">
                              <span className="text-nz-text-secondary">
                                <MetricTooltip
                                  label="Confidence"
                                  definition="Prediction confidence level based on available comparable data."
                                  whyItMatters={"High — 5+ comparable titles. Narrow range. Benchmark well-supported by data.\nMedium — 2-4 titles. Moderate range. Use directionally.\nLow — 0-1 titles. Wide range. Treat as rough order of magnitude only."}
                                />
                              </span>
                              <span className="font-semibold">
                                <span className={seg.confidence === "High" ? "text-green-600" : seg.confidence === "Medium" ? "text-yellow-600" : "text-red-500"}>
                                  {seg.confidence === "High" ? "\u{1F7E2}" : seg.confidence === "Medium" ? "\u{1F7E1}" : "\u{1F534}"}{" "}
                                  {seg.confidence}
                                </span>
                              </span>
                            </div>
                          </>
                        )}
                      </>
                    )}

                    {(stage === "launched" || stage === "live") && (
                      <>
                        {/* Actual Adopters */}
                        <div className="flex justify-between text-sm">
                          <span className="text-nz-text-secondary">
                            <MetricTooltip
                              label="Actual Adopters"
                              definition="Real players from this segment who have played your title since launch, from Naz's GPME play-history data."
                              formula="Actual Adopters = players in segment present in your title's GPME play-history"
                              whyItMatters="Your ground truth. Compare to your pre-launch Predicted Adopters to evaluate forecast accuracy and refine your segment model for future titles."
                            />
                          </span>
                          <span className="font-semibold text-nz-text">
                            {formatNumber(seg.adopters)}
                          </span>
                        </div>
                        {/* Actual Conv Rate */}
                        {showConversionRate && (
                          <div className="flex justify-between text-sm">
                            <span className="text-nz-text-secondary">
                              <MetricTooltip
                                label="Actual Conv. Rate"
                                definition="Percentage of your addressable segment that has adopted your title."
                                formula={`Conv. Rate = Actual Adopters / Addressable Market x 100\ne.g. ${formatNumber(seg.adopters)} / ${formatNumber(seg.addressableMarket)} x 100 = ${seg.conversionRate}%`}
                                whyItMatters="Core efficiency metric. Higher rate means stronger product-market fit with this segment. Compare across segments to identify your best-performing audience and prioritize future campaigns accordingly."
                              />
                            </span>
                            <span className="font-semibold text-nz-text">
                              {seg.conversionRate}%
                            </span>
                          </div>
                        )}
                        {/* vs Benchmark */}
                        {showConversionRate && seg.benchmarkConvMid > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-nz-text-secondary">
                              <MetricTooltip
                                label="vs Benchmark"
                                definition="Difference between your actual conversion rate and the benchmark from comparable titles."
                                formula={`vs Benchmark = Actual Conv. Rate - Benchmark Conv. Rate (mid)\ne.g. ${seg.conversionRate}% - ${seg.benchmarkConvMid}% = ${segVsBenchmark > 0 ? "+" : ""}${segVsBenchmark.toFixed(1)} percentage points`}
                                whyItMatters="Compare your performance against historical data for similar segments."
                                interpretation={"Above benchmark: Over-performing vs comparable titles. Strong signal to increase UA investment here.\nBelow benchmark: Under-performing. Review creative, pricing, or positioning for this segment.\nAt benchmark: In line with expectations."}
                              />
                            </span>
                            <span
                              className="font-semibold flex items-center gap-1"
                              style={{
                                color: segVsBenchmark > 0.5 ? "#22C55E" : segVsBenchmark < -0.5 ? "#EF4444" : "#6B7280",
                              }}
                            >
                              {segVsBenchmark > 0 ? "+" : ""}{segVsBenchmark.toFixed(1)}pp
                              {segVsBenchmark > 0.5 && " \u2191"}
                              {segVsBenchmark < -0.5 && " \u2193"}
                              {Math.abs(segVsBenchmark) <= 0.5 && " \u2192"}
                            </span>
                          </div>
                        )}
                      </>
                    )}

                    {/* Priority Score — always shown */}
                    <div className="flex justify-between text-sm pt-2 border-t border-nz-bg-subtle">
                      <span className="text-nz-text-secondary">
                        <MetricTooltip
                          label="Priority Score"
                          definition="Composite score ranking segments by strategic importance for budget allocation."
                          formula={priorityScoreTooltipFormula(stage)}
                          whyItMatters="Use to decide where to allocate your launch marketing budget. Highest scoring segment = recommended primary target. Switch to manual mode to override with your own judgment."
                        />
                      </span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          prioState.mode === "manual"
                            ? "bg-nz-bg-subtle text-[#A0AEC0]"
                            : "bg-nz-bg-subtle text-[#374151]"
                        }`}
                        title={
                          prioState.mode === "manual"
                            ? "Score shown as reference — manual order active"
                            : `Priority Score: ${seg.priorityScore.toFixed(2)}`
                        }
                      >
                        Score: {seg.priorityScore.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* KCD2-specific sections */}
        {isKcd2 && (
          <>
            {/* Overlap matrix table */}
            <div className="bg-white rounded-card border border-nz-border p-5 mb-6">
              <h3 className="text-sm font-semibold text-nz-text mb-4">
                <MetricTooltip
                  label="Overlap Matrix"
                  definition="Shows how many players qualify for multiple segments simultaneously — and how their conversion rate increases with each additional segment they match."
                  whyItMatters="Players matching all your segments are your highest-intent cohort. The conversion rate multiplier between 'No Segment' and 'All Segments' tells you how well your segment definitions are capturing genuine product-market fit."
                  extraSections={[{
                    label: "How to read it",
                    body: "Conv. Rate rises with each segment overlap — this is expected and healthy. The bigger the jump between rows, the more differentiated your segments are from each other and from the general population.",
                  }]}
                />
              </h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-nz-border">
                    <th className="text-left py-2 px-3 text-xs font-semibold text-nz-text-muted uppercase">
                      Segment Qualification
                    </th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-nz-text-muted uppercase">
                      <MetricTooltip
                        label="Users"
                        definition="Total players qualifying for this overlap tier."
                        whyItMatters="Shows how the audience pyramids — most players qualify for 0 or 1 segment."
                      />
                    </th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-nz-text-muted uppercase">
                      <MetricTooltip
                        label="Adopters"
                        definition="Players in this tier who purchased the game."
                        whyItMatters="Compare adopters across tiers to see where buyers actually come from."
                      />
                    </th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-nz-text-muted uppercase">
                      <MetricTooltip
                        label="Conv. Rate"
                        definition="Adopters / Users for this overlap tier."
                        whyItMatters="The key insight: multi-segment players convert dramatically higher. Use this to prioritize retargeting spend."
                      />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {overlapMatrix.map((row, i) => (
                    <tr
                      key={i}
                      className={`border-b border-nz-border last:border-0 ${
                        i === overlapMatrix.length - 1 ? "bg-nz-primary/5" : ""
                      }`}
                    >
                      <td className="py-3 px-3 text-nz-text font-medium">
                        {row.label}
                        {i === overlapMatrix.length - 1 && (
                          <span className="ml-2 text-[10px] text-nz-primary font-normal">
                            Highest-intent cohort
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right text-nz-text">
                        {formatNumber(row.userCount)}
                      </td>
                      <td className="py-3 px-3 text-right text-nz-text">
                        {formatNumber(row.adopters)}
                      </td>
                      <td className="py-3 px-3 text-right font-semibold text-nz-text">
                        {row.conversionRate}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Strategy signals */}
            <div className="grid grid-cols-3 gap-5 mb-5">
              <div className="bg-white rounded-card border border-nz-border p-5 border-l-4 border-l-nz-primary">
                <div className="text-xs font-semibold uppercase text-nz-primary mb-2">
                  Core Segment
                </div>
                <h4 className="text-sm font-semibold text-nz-text mb-2">Allocate UA Budget Here First</h4>
                <p className="text-xs text-nz-text-secondary leading-relaxed">
                  7,082 players converting at 13.7% — your highest-efficiency cohort.
                  Every dollar spent here returns 7x more adopters than Secondary.
                  Cap spend only when this pool is saturated.
                </p>
              </div>
              <div className="bg-white rounded-card border border-nz-border p-5 border-l-4 border-l-nz-teal">
                <div className="text-xs font-semibold uppercase text-nz-teal mb-2">
                  Secondary Segment
                </div>
                <h4 className="text-sm font-semibold text-nz-text mb-2">Scale When Core Is Saturated</h4>
                <p className="text-xs text-nz-text-secondary leading-relaxed">
                  51K addressable at 3.2% — large enough to drive volume, efficient
                  enough to be profitable. Activate after Core campaigns show diminishing returns.
                </p>
              </div>
              <div className="bg-white rounded-card border border-nz-border p-5 border-l-4 border-l-nz-primary">
                <div className="text-xs font-semibold uppercase text-nz-primary mb-2">
                  Triple-Overlap
                </div>
                <h4 className="text-sm font-semibold text-nz-text mb-2">Retarget This List Before Launch</h4>
                <p className="text-xs text-nz-text-secondary leading-relaxed">
                  1,367 players qualifying all 3 segments convert at 26.55% —
                  110x the general population. Build a dedicated retargeting list from this
                  cohort and activate it in the final 2 weeks before launch.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-5 mb-6">
              <div className="bg-white rounded-card border border-nz-border p-5 border-l-4 border-l-nz-orange">
                <div className="text-xs font-semibold uppercase text-nz-orange mb-2">
                  Tertiary Segment
                </div>
                <h4 className="text-sm font-semibold text-nz-text mb-2">Tertiary: Awareness Only</h4>
                <p className="text-xs text-nz-text-secondary leading-relaxed">
                  124K addressable but only 1.9% conversion. Use for broad awareness
                  and top-of-funnel only — direct response spend here will underperform.
                  Monitor whether conversion improves post-launch before increasing budget.
                </p>
              </div>
            </div>

            {/* Shared Game Affinity */}
            <div className="bg-white rounded-card border border-nz-border p-5 mb-6">
              <h3 className="text-sm font-semibold text-nz-text mb-4">
                <MetricTooltip
                  label="Shared Game Affinity Across Segments"
                  definition="Each percentage shows what share of that segment's addressable market has played that title. A game with high % across all segments is a shared touchpoint for your entire audience."
                  whyItMatters={"Use this to:\n- Find partner titles for cross-promotion deals\n- Brief your media buying team on which games to target for in-game or around-game advertising\n- Identify shared creative references your audience already knows (trailers, art direction, tone)\n- Spot games where your audience is already active but your title hasn't reached them yet"}
                  extraSections={[{
                    label: "How to read it",
                    body: "Highlighted cells (darker background) = affinity above 50% — this game is a strong signal for that segment. Low % in one segment but high in others = a game that differentiates segments from each other.",
                  }]}
                />
              </h3>
              <p className="text-xs text-nz-text-muted mb-4">
                % of each segment&apos;s addressable market that has played the title
              </p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-nz-border">
                    <th className="text-left py-2 px-3 text-xs font-semibold text-nz-text-muted uppercase">
                      Title
                    </th>
                    {kcd2Segments.map((seg) => (
                      <th key={seg.id} className="text-center py-2 px-3 text-xs font-semibold uppercase" style={{ color: seg.color }}>
                        {seg.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(segmentOverlapGames.all || []).map((game, i) => (
                    <tr key={i} className="border-b border-nz-border last:border-0">
                      <td className="py-2.5 px-3 font-medium text-nz-text text-xs">{game.title}</td>
                      <td className="py-2.5 px-3 text-center">
                        <HeatCell value={game.seg1_pct} color="#4F46E5" />
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <HeatCell value={game.seg2_pct} color="#22C55E" />
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <HeatCell value={game.seg3_pct} color="#F6A623" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ─── Dynamic sections for non-kcd2 projects ─── */}
        {!isKcd2 && segs.length > 0 && (
          <>
            {/* Loading skeleton */}
            {sectionsLoading && !dynOverlap && (
              <div className="space-y-6 mb-6">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="bg-white rounded-card border border-nz-border p-5 animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-40 mb-4" />
                    <div className="space-y-3">
                      <div className="h-3 bg-gray-100 rounded w-full" />
                      <div className="h-3 bg-gray-100 rounded w-5/6" />
                      <div className="h-3 bg-gray-100 rounded w-4/6" />
                    </div>
                    <div className="flex items-center gap-2 mt-4 text-xs text-nz-text-muted">
                      <svg className="animate-spin h-3.5 w-3.5 text-nz-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Generating insights&hellip;
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Section 1: Overlap Matrix */}
            {dynOverlap && dynOverlap.length > 0 && (
              <div className="bg-white rounded-card border border-nz-border p-5 mb-6">
                <h3 className="text-sm font-semibold text-nz-text mb-4">
                  <MetricTooltip
                    label="Overlap Matrix"
                    definition="Shows how many players qualify for multiple segments simultaneously — and how their conversion rate increases with each additional segment they match."
                    whyItMatters="Players matching all your segments are your highest-intent cohort. The conversion rate multiplier between 'No Segment' and 'All Segments' tells you how well your segment definitions are capturing genuine product-market fit."
                    extraSections={[
                      {
                        label: "How to read it",
                        body: "Conv. Rate rises with each segment overlap — this is expected and healthy. The bigger the jump between rows, the more differentiated your segments are from each other and from the general population.",
                      },
                      ...(dynIsPreLaunch ? [{
                        label: "Note",
                        body: "Adopters shown here are predicted based on benchmark conversion rates from comparable titles.",
                        color: "#F6A623",
                      }] : []),
                    ]}
                  />
                  {dynIsPreLaunch && (
                    <span className="ml-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#FEF3E0] text-[#B96B00] uppercase">
                      Predicted
                    </span>
                  )}
                </h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-nz-border">
                      <th className="text-left py-2 px-3 text-xs font-semibold text-nz-text-muted uppercase">
                        Segment Qualification
                      </th>
                      <th className="text-right py-2 px-3 text-xs font-semibold text-nz-text-muted uppercase">
                        <MetricTooltip
                          label="Users"
                          definition="Total players qualifying for this overlap tier."
                          whyItMatters="Shows how the audience pyramids — most players qualify for 0 or 1 segment."
                        />
                      </th>
                      <th className="text-right py-2 px-3 text-xs font-semibold text-nz-text-muted uppercase">
                        <MetricTooltip
                          label={dynIsPreLaunch ? "Predicted Adopters" : "Adopters"}
                          definition={dynIsPreLaunch
                            ? "Estimated players in this tier predicted to adopt the game."
                            : "Players in this tier who purchased the game."}
                          whyItMatters="Compare adopters across tiers to see where buyers actually come from."
                        />
                      </th>
                      <th className="text-right py-2 px-3 text-xs font-semibold text-nz-text-muted uppercase">
                        <MetricTooltip
                          label="Conv. Rate"
                          definition="Adopters / Users for this overlap tier."
                          whyItMatters="The key insight: multi-segment players convert dramatically higher. Use this to prioritize retargeting spend."
                        />
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {dynOverlap.map((row, i) => (
                      <tr
                        key={i}
                        className={`border-b border-nz-border last:border-0 ${
                          i === dynOverlap.length - 1 ? "bg-nz-primary/5" : ""
                        }`}
                      >
                        <td className="py-3 px-3 text-nz-text font-medium">
                          {row.label}
                          {i === dynOverlap.length - 1 && (
                            <span className="ml-2 text-[10px] text-nz-primary font-normal">
                              Highest-intent cohort
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right text-nz-text">
                          {formatNumber(row.userCount)}
                        </td>
                        <td className="py-3 px-3 text-right text-nz-text">
                          {formatNumber(row.adopters)}
                        </td>
                        <td className="py-3 px-3 text-right font-semibold text-nz-text">
                          {row.conversionRate}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Section 2: Strategic Insight Cards */}
            {dynInsights && dynInsights.length > 0 && (() => {
              // Separate segment insights from overlap insight
              const segInsights = dynInsights.filter((c) => !c.tier.includes("OVERLAP"));
              const overlapInsight = dynInsights.find((c) => c.tier.includes("OVERLAP"));
              return (
                <>
                  <div
                    className="grid gap-5 mb-5"
                    style={{ gridTemplateColumns: `repeat(${Math.min(segInsights.length, 3)}, 1fr)` }}
                  >
                    {segInsights.map((card, i) => (
                      <div
                        key={i}
                        className="bg-white rounded-card border border-nz-border p-5"
                        style={{ borderLeftWidth: 4, borderLeftColor: card.color }}
                      >
                        <div className="text-xs font-semibold uppercase mb-2" style={{ color: card.color }}>
                          {card.tier}
                        </div>
                        <h4 className="text-sm font-semibold text-nz-text mb-2">{card.headline}</h4>
                        <p className="text-xs text-nz-text-secondary leading-relaxed">{card.body}</p>
                      </div>
                    ))}
                  </div>
                  {overlapInsight && (
                    <div className="grid grid-cols-1 gap-5 mb-6">
                      <div
                        className="bg-white rounded-card border border-nz-border p-5"
                        style={{ borderLeftWidth: 4, borderLeftColor: overlapInsight.color }}
                      >
                        <div className="text-xs font-semibold uppercase mb-2" style={{ color: overlapInsight.color }}>
                          {overlapInsight.tier}
                        </div>
                        <h4 className="text-sm font-semibold text-nz-text mb-2">{overlapInsight.headline}</h4>
                        <p className="text-xs text-nz-text-secondary leading-relaxed">{overlapInsight.body}</p>
                      </div>
                    </div>
                  )}
                </>
              );
            })()}

            {/* Section 2.5: Recommended Budget Split */}
            {segsWithScores.length > 0 && (
              <BudgetSplitSection segs={segsWithScores} stage={stage} />
            )}

            {/* Section 3: Shared Game Affinity */}
            {dynAffinity && dynAffinity.length > 0 && (
              <div className="bg-white rounded-card border border-nz-border p-5 mb-6">
                <h3 className="text-sm font-semibold text-nz-text mb-4">
                  <MetricTooltip
                    label="Shared Game Affinity Across Segments"
                    definition="Each percentage shows what share of that segment's addressable market has played that title. A game with high % across all segments is a shared touchpoint for your entire audience."
                    whyItMatters={"Use this to:\n- Find partner titles for cross-promotion deals\n- Brief your media buying team on which games to target for in-game or around-game advertising\n- Identify shared creative references your audience already knows (trailers, art direction, tone)\n- Spot games where your audience is already active but your title hasn't reached them yet"}
                    extraSections={[{
                      label: "How to read it",
                      body: "Highlighted cells (darker background) = affinity above 50% — this game is a strong signal for that segment. Low % in one segment but high in others = a game that differentiates segments from each other.",
                    }]}
                  />
                </h3>
                <p className="text-xs text-nz-text-muted mb-4">
                  % of each segment&apos;s addressable market that has played the title
                </p>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-nz-border">
                      <th className="text-left py-2 px-3 text-xs font-semibold text-nz-text-muted uppercase">
                        Title
                      </th>
                      {segs.map((seg) => (
                        <th key={seg.id} className="text-center py-2 px-3 text-xs font-semibold uppercase" style={{ color: seg.color }}>
                          {seg.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dynAffinity.map((game, gi) => (
                      <tr key={gi} className="border-b border-nz-border last:border-0">
                        <td className="py-2.5 px-3 font-medium text-nz-text text-xs">{game.title}</td>
                        {segs.map((seg, si) => (
                          <td key={seg.id} className="py-2.5 px-3 text-center">
                            <HeatCell value={game.affinities[si] ?? 0} color={seg.color} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* Comparable Titles Modal */}
      {titlesModalSeg && (
        <ComparableTitlesModal
          segmentName={titlesModalSeg.name}
          titles={titlesModalSeg.comparableTitles ?? []}
          onClose={() => setTitlesModalSeg(null)}
        />
      )}

      {/* Campaign Brief Modal */}
      {showBriefModal && (
        <CampaignBriefModal
          projectTitle={projectTitle}
          lifecycle={lifecycle}
          platforms={project?.platforms ?? []}
          monetization={project?.monetization ?? ""}
          segs={segsWithScores}
          totalAddressableAudience={totalAddressableAudience}
          generalPopConversionRate={generalPopConversionRate}
          onClose={() => setShowBriefModal(false)}
        />
      )}

      {/* Toast */}
      {toastMsg && <Toast message={toastMsg} onDone={() => setToastMsg(null)} />}
    </div>
  );
}
