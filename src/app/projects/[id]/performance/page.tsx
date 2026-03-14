"use client";

import { useState, useMemo, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { TopNav } from "@/components/TopNav";
import { MetricTooltip } from "@/components/MetricTooltip";
import {
  adoptionCurve,
  adoptionCurve180,
  benchmarkingCurve,
  benchmarkingCurve180,
  comparatorTitles,
  segments as kcd2Segments,
  formatNumber,
} from "@/lib/mockData";
import { useProjectStore } from "@/lib/store";
import type { ProjectData, SegmentData } from "@/lib/store";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  ComposedChart,
  BarChart,
  Bar,
  ReferenceLine,
  ReferenceArea,
} from "recharts";

const SEGMENT_COLORS = ["#4F46E5", "#00C2A8", "#F6A623", "#805AD5", "#A0AEC0"];
const NO_SEG_COLOR = "#A0AEC0";
const KCD2_SEGMENT_NAMES = ["Simulation RPG Purists", "Mastery Combat Fans", "Historical Explorers"];

// ─── Lifecycle helpers ───

type LifecycleStage = "launched" | "prelaunch";

function getStage(lifecycle: string): LifecycleStage {
  const lc = lifecycle.toLowerCase();
  if (lc.includes("launched") || lc.includes("live")) return "launched";
  return "prelaunch";
}

// ─── S-curve generation for projections ───

/** Standard S-curve milestones: fraction of total predicted adopters reached by each day */
const S_CURVE_MILESTONES: [number, number][] = [
  [1, 0.08], [3, 0.18], [7, 0.32], [14, 0.48], [30, 0.65], [60, 0.82], [90, 1.0],
];

function sCurveFraction(day: number): number {
  if (day <= 0) return 0;
  if (day >= 90) return 1;
  // Interpolate between milestones
  for (let i = 1; i < S_CURVE_MILESTONES.length; i++) {
    const [d0, f0] = S_CURVE_MILESTONES[i - 1];
    const [d1, f1] = S_CURVE_MILESTONES[i];
    if (day <= d1) {
      const t = (day - d0) / (d1 - d0);
      return f0 + (f1 - f0) * t;
    }
  }
  return 1;
}

interface SegmentInfo {
  name: string;
  color: string;
  addressableMarket: number;
  convRate: number;
  benchmarkConvLow: number;
  benchmarkConvMid: number;
  benchmarkConvHigh: number;
  confidence: "High" | "Medium" | "Low";
}

function loadProjectSegments(projectId: string, project: ProjectData | undefined): SegmentInfo[] {
  if (!project) return [];

  // Load results cache for benchmark data (set by SegmentBuilder & Audience page)
  let resultsCache: Record<string, {
    benchmarkConvLow?: number; benchmarkConvMid?: number; benchmarkConvHigh?: number;
    confidence?: string;
  }> = {};
  try {
    const raw = localStorage.getItem(`project_${projectId}_results`);
    if (raw) resultsCache = JSON.parse(raw);
  } catch { /* ignore */ }

  // Try localStorage first for full segment builder data with benchmark fields
  try {
    const raw = localStorage.getItem(`project_${projectId}_segments`);
    if (raw) {
      const cols = JSON.parse(raw) as Array<{
        name?: string; analyzed?: boolean; size?: number; convRate?: number;
        benchmarkConvLow?: number; benchmarkConvMid?: number; benchmarkConvHigh?: number;
        confidence?: string;
      }>;
      // Guard: discard KCD2 segment names in non-KCD2 projects
      if (projectId !== "kcd2" && cols.some((c) => KCD2_SEGMENT_NAMES.includes(c.name ?? ""))) {
        localStorage.removeItem(`project_${projectId}_segments`);
        // Also invalidate stale perf caches
        localStorage.removeItem(`project_${projectId}_perf_curves`);
        localStorage.removeItem(`project_${projectId}_perf_milestones`);
        // fall through to store
      } else {
        const analyzed = cols.filter((c) => c.analyzed && (c.size ?? 0) > 0);
        if (analyzed.length > 0) {
          return analyzed.map((c, i) => {
            const cached = resultsCache[String(i)] || {};
            return {
              name: c.name || `Segment ${i + 1}`,
              color: SEGMENT_COLORS[i] || SEGMENT_COLORS[0],
              addressableMarket: c.size || 0,
              convRate: c.convRate || 0,
              benchmarkConvLow: c.benchmarkConvLow || cached.benchmarkConvLow || 0,
              benchmarkConvMid: c.benchmarkConvMid || cached.benchmarkConvMid || 0,
              benchmarkConvHigh: c.benchmarkConvHigh || cached.benchmarkConvHigh || 0,
              confidence: (c.confidence as "High" | "Medium" | "Low") || (cached.confidence as "High" | "Medium" | "Low") || "Medium",
            };
          });
        }
      }
    }
  } catch { /* ignore */ }

  // Fall back to store data
  const storeSegs = project.segments.filter((s) => s.addressableMarket > 0);
  // Guard: reject store segments with KCD2 names for non-KCD2 projects
  if (projectId !== "kcd2" && storeSegs.some((s) => KCD2_SEGMENT_NAMES.includes(s.name))) {
    return [];
  }
  if (storeSegs.length > 0) {
    return storeSegs.map((s, i) => {
      const cached = resultsCache[String(i)] || {};
      return {
        name: s.name,
        color: s.color || SEGMENT_COLORS[i] || SEGMENT_COLORS[0],
        addressableMarket: s.addressableMarket,
        convRate: s.conversionRate,
        benchmarkConvLow: s.benchmarkConvLow ?? cached.benchmarkConvLow ?? 0,
        benchmarkConvMid: s.benchmarkConvMid ?? cached.benchmarkConvMid ?? 0,
        benchmarkConvHigh: s.benchmarkConvHigh ?? cached.benchmarkConvHigh ?? 0,
        confidence: s.confidence ?? (cached.confidence as "High" | "Medium" | "Low") ?? "Medium",
      };
    });
  }

  return [];
}

// ─── Curve data generation ───

interface CumulativePoint {
  day: number;
  [key: string]: number; // seg_0, seg_1, ..., seg_0_low, seg_0_high, noSeg
}

interface DailyPoint {
  day: number;
  [key: string]: number;
}

interface MilestoneRow {
  name: string;
  color: string;
  d1: number;
  d7: number;
  d30: number;
  d90: number;
  d1High?: number;
  d7High?: number;
  d30High?: number;
  d90High?: number;
  vsBenchmark: string;
  vsBenchmarkColor: string;
  pacing?: string;
  pacingColor?: string;
}

function generateProjectedCurves(
  segs: SegmentInfo[],
  totalTracked: number,
  maxDay: number,
): { cumulative: CumulativePoint[]; daily: DailyPoint[]; milestones: MilestoneRow[] } {
  const cumulative: CumulativePoint[] = [];
  const daily: DailyPoint[] = [];

  const totalAddressable = segs.reduce((s, seg) => s + seg.addressableMarket, 0);
  const noSegUsers = Math.max(0, totalTracked - totalAddressable);
  const noSegConvRate = 0.001; // 0.1%
  const noSegTotal = Math.round(noSegUsers * noSegConvRate);

  let prevDay: Record<string, number> = {};

  for (let d = 1; d <= maxDay; d++) {
    const frac = sCurveFraction(d);
    const fracPrev = d > 1 ? sCurveFraction(d - 1) : 0;
    const point: CumulativePoint = { day: d };
    const dailyPoint: DailyPoint = { day: d };

    segs.forEach((seg, i) => {
      const totalMid = Math.round(seg.addressableMarket * (seg.benchmarkConvMid / 100));
      const totalLow = Math.round(seg.addressableMarket * (seg.benchmarkConvLow / 100));
      const totalHigh = Math.round(seg.addressableMarket * (seg.benchmarkConvHigh / 100));

      point[`seg_${i}`] = Math.round(frac * totalMid);
      point[`seg_${i}_low`] = Math.round(frac * totalLow);
      point[`seg_${i}_high`] = Math.round(frac * totalHigh);

      // As percentage of addressable
      point[`seg_${i}_pct`] = seg.addressableMarket > 0
        ? Math.round((frac * totalMid / seg.addressableMarket) * 10000) / 100
        : 0;
      point[`seg_${i}_pct_low`] = seg.addressableMarket > 0
        ? Math.round((frac * totalLow / seg.addressableMarket) * 10000) / 100
        : 0;
      point[`seg_${i}_pct_high`] = seg.addressableMarket > 0
        ? Math.round((frac * totalHigh / seg.addressableMarket) * 10000) / 100
        : 0;

      const deltaFrac = frac - fracPrev;
      dailyPoint[`seg_${i}`] = Math.round(deltaFrac * totalMid);
      dailyPoint[`seg_${i}_low`] = Math.round(deltaFrac * totalLow);
      dailyPoint[`seg_${i}_high`] = Math.round(deltaFrac * totalHigh);
    });

    // No target segment
    point.noSeg = Math.round(frac * noSegTotal);
    dailyPoint.noSeg = Math.round((frac - fracPrev) * noSegTotal);

    cumulative.push(point);
    daily.push(dailyPoint);
    prevDay = point;
  }

  // Milestones
  const milestones: MilestoneRow[] = segs.map((seg, i) => {
    const totalMid = Math.round(seg.addressableMarket * (seg.benchmarkConvMid / 100));
    const totalHigh = Math.round(seg.addressableMarket * (seg.benchmarkConvHigh / 100));
    return {
      name: seg.name,
      color: seg.color,
      d1: Math.round(sCurveFraction(1) * totalMid),
      d7: Math.round(sCurveFraction(7) * totalMid),
      d30: Math.round(sCurveFraction(30) * totalMid),
      d90: Math.round(sCurveFraction(90) * totalMid),
      d1High: Math.round(sCurveFraction(1) * totalHigh),
      d7High: Math.round(sCurveFraction(7) * totalHigh),
      d30High: Math.round(sCurveFraction(30) * totalHigh),
      d90High: Math.round(sCurveFraction(90) * totalHigh),
      vsBenchmark: "On Track (projected)",
      vsBenchmarkColor: "#6B7280",
    };
  });

  // No-segment row
  milestones.push({
    name: "No Target Segment",
    color: NO_SEG_COLOR,
    d1: Math.round(sCurveFraction(1) * noSegTotal),
    d7: Math.round(sCurveFraction(7) * noSegTotal),
    d30: Math.round(sCurveFraction(30) * noSegTotal),
    d90: Math.round(sCurveFraction(90) * noSegTotal),
    vsBenchmark: "\u2014",
    vsBenchmarkColor: "#6B7280",
  });

  return { cumulative, daily, milestones };
}

function generateLaunchedMilestones(segs: SegmentInfo[], convRates: number[]): MilestoneRow[] {
  return segs.map((seg, i) => {
    const total = Math.round(seg.addressableMarket * (convRates[i] / 100));
    const vsBench = seg.benchmarkConvMid > 0 ? convRates[i] - seg.benchmarkConvMid : 0;
    const vsBenchStr = seg.benchmarkConvMid > 0
      ? (Math.abs(vsBench) <= 0.5 ? "On track \u2192" : `${vsBench > 0 ? "+" : ""}${vsBench.toFixed(1)}pp ${vsBench > 0 ? "\u2191" : "\u2193"}`)
      : "\u2014";
    const vsBenchColor = Math.abs(vsBench) <= 0.5 ? "#6B7280" : vsBench > 0 ? "#22C55E" : "#EF4444";

    // Pacing
    let pacing: string | undefined;
    let pacingColor: string | undefined;
    if (seg.benchmarkConvMid > 0) {
      const ratio = convRates[i] / seg.benchmarkConvMid;
      if (ratio > 1.05) { pacing = "\u2191 Ahead of benchmark"; pacingColor = "#22C55E"; }
      else if (ratio < 0.95) { pacing = "\u2193 Behind benchmark"; pacingColor = "#EF4444"; }
      else { pacing = "\u2192 On pace"; pacingColor = "#6B7280"; }
    }

    return {
      name: seg.name,
      color: seg.color,
      d1: Math.round(sCurveFraction(1) * total),
      d7: Math.round(sCurveFraction(7) * total),
      d30: Math.round(sCurveFraction(30) * total),
      d90: total,
      vsBenchmark: vsBenchStr,
      vsBenchmarkColor: vsBenchColor,
      pacing,
      pacingColor,
    };
  });
}

// ─── Badge component ───

function StatusBadge({ type }: { type: "projected" | "actual" }) {
  const isProjected = type === "projected";
  return (
    <span
      className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase"
      style={{
        backgroundColor: isProjected ? "#FEF3E0" : "#E6FFFA",
        color: isProjected ? "#B96B00" : "#00796B",
      }}
    >
      {isProjected ? "Projected" : "Actual"}
    </span>
  );
}

// ─── Skeleton loader ───

function ChartSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-nz-border shadow-sm p-5 mb-6 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-48 mb-4" />
      <div className="h-[300px] bg-gray-100 rounded" />
    </div>
  );
}

// ─── Time range ───

type TimeRange = "D1\u2013D30" | "D1\u2013D90" | "D1\u2013D180";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function milestoneLines(maxDay: number): any[] {
  const milestones = [
    { day: 1, label: "D1" },
    { day: 7, label: "D7" },
    { day: 30, label: "D30" },
  ];
  return milestones.filter((m) => m.day <= maxDay);
}

// ─── Main Component ───

export default function PerformancePage() {
  const params = useParams();
  const projectId = params.id as string;
  const project = useProjectStore((s) => s.projects.find((p) => p.id === projectId));
  const projectTitle = project?.title ?? "Project";
  const isKcd2 = projectId === "kcd2";

  const lifecycle = project?.lifecycle ?? (isKcd2 ? "Launched" : "Pre-Launch");
  const stage = getStage(lifecycle);
  const isLaunched = stage === "launched";

  const [timeRange, setTimeRange] = useState<TimeRange>("D1\u2013D90");
  const [showBenchmarkBand, setShowBenchmarkBand] = useState(false);
  const [segs, setSegs] = useState<SegmentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [fullCurves, setFullCurves] = useState<{
    cumulative: CumulativePoint[]; daily: DailyPoint[]; milestones: MilestoneRow[];
  } | null>(null);

  const maxDay = timeRange === "D1\u2013D30" ? 30 : timeRange === "D1\u2013D90" ? 90 : 180;

  // Load segment data on mount, with perf data caching for non-KCD2 projects
  useEffect(() => {
    if (isKcd2) {
      setSegs(kcd2Segments.map((s, i) => ({
        name: s.name,
        color: s.color,
        addressableMarket: s.addressableMarket,
        convRate: s.conversionRate,
        benchmarkConvLow: [10.2, 2.0, 1.1][i],
        benchmarkConvMid: [12.5, 2.8, 1.7][i],
        benchmarkConvHigh: [15.1, 4.0, 2.5][i],
        confidence: "High" as const,
      })));
      setLoading(false);
      return;
    }
    if (typeof window === "undefined" || !project) return;

    const loaded = loadProjectSegments(projectId, project);
    setSegs(loaded);

    if (loaded.length > 0) {
      // Check perf curves cache first
      const curvesCacheKey = `project_${projectId}_perf_curves`;
      try {
        const cached = localStorage.getItem(curvesCacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.cumulative && parsed.daily && parsed.milestones) {
            setFullCurves(parsed);
            setLoading(false);
            return;
          }
        }
      } catch { /* ignore */ }

      // Generate full D1–D180 curves and cache
      const curves = generateProjectedCurves(loaded, project.totalTrackedUsers ?? 500_000, 180);
      setFullCurves(curves);
      try {
        localStorage.setItem(curvesCacheKey, JSON.stringify(curves));
        localStorage.setItem(`project_${projectId}_perf_milestones`, JSON.stringify(curves.milestones));
      } catch { /* ignore */ }
    }

    setLoading(false);
  }, [projectId, isKcd2, project]);

  // ─── KCD2 chart data (existing) ───
  const kcd2AdoptionData = useMemo(() => {
    const source = maxDay <= 90 ? adoptionCurve : adoptionCurve180;
    return source.filter((d) => d.day <= maxDay);
  }, [maxDay]);

  const kcd2BenchmarkData = useMemo(() => {
    const source = maxDay <= 90 ? benchmarkingCurve : benchmarkingCurve180;
    return source.filter((d) => d.day <= maxDay);
  }, [maxDay]);

  // ─── Dynamic projected/actual data for non-kcd2 (from cached fullCurves) ───
  const projectedData = useMemo(() => {
    if (isKcd2 || !fullCurves) return null;
    return {
      cumulative: fullCurves.cumulative.filter((p) => p.day <= maxDay),
      daily: fullCurves.daily.filter((p) => p.day <= maxDay),
      milestones: fullCurves.milestones,
    };
  }, [isKcd2, fullCurves, maxDay]);

  const milestoneData = useMemo(() => {
    if (isKcd2) {
      // KCD2 launched milestones from actual conv rates
      return generateLaunchedMilestones(
        kcd2Segments.map((s, i) => ({
          name: s.name, color: s.color, addressableMarket: s.addressableMarket,
          convRate: s.conversionRate,
          benchmarkConvLow: [10.2, 2.0, 1.1][i], benchmarkConvMid: [12.5, 2.8, 1.7][i],
          benchmarkConvHigh: [15.1, 4.0, 2.5][i], confidence: "High" as const,
        })),
        kcd2Segments.map((s) => s.conversionRate),
      );
    }
    // Launched non-KCD2: use actual conv rates with pacing indicators
    if (isLaunched && segs.length > 0) {
      return generateLaunchedMilestones(segs, segs.map((s) => s.convRate));
    }
    if (projectedData) return projectedData.milestones;
    return [];
  }, [isKcd2, isLaunched, segs, projectedData]);

  // ─── Chart max Y ───
  const yMax = useMemo(() => {
    if (isKcd2) return 16;
    if (!projectedData) return 10;
    let max = 0;
    for (const pt of projectedData.cumulative) {
      for (let i = 0; i < segs.length; i++) {
        const v = (pt[`seg_${i}_pct_high`] as number) || (pt[`seg_${i}_pct`] as number) || 0;
        if (v > max) max = v;
      }
    }
    return Math.ceil(max * 1.2);
  }, [isKcd2, projectedData, segs]);

  const dailyMax = useMemo(() => {
    if (!projectedData) return 100;
    let max = 0;
    for (const pt of projectedData.daily) {
      for (let i = 0; i < segs.length; i++) {
        const v = (pt[`seg_${i}_high`] as number) || (pt[`seg_${i}`] as number) || 0;
        if (v > max) max = v;
      }
      if ((pt.noSeg as number) > max) max = pt.noSeg as number;
    }
    return Math.ceil(max * 1.2);
  }, [projectedData, segs]);

  // ─── KCD2 legend labels ───
  const segmentLegendLabels: Record<string, string> = isKcd2
    ? { seg1_pct: kcd2Segments[0].name, seg2_pct: kcd2Segments[1].name, seg3_pct: kcd2Segments[2].name }
    : {};

  const benchmarkLegendLabels: Record<string, string> = {
    kcd2: "KCD II / Core",
    category_avg: "Category Average",
    comparator1: comparatorTitles.comparator1,
    comparator2: comparatorTitles.comparator2,
  };

  // ─── Dynamic benchmark data for non-KCD2 projects ───
  const dynamicBenchmarkInfo = useMemo(() => {
    if (isKcd2 || segs.length === 0) return null;
    const coreSeg = segs[0];
    if (!coreSeg.convRate && !coreSeg.benchmarkConvMid) return null;

    // Load comparableTitles from localStorage
    let comparables: { title: string; convRate: number }[] = [];
    try {
      const raw = localStorage.getItem(`project_${projectId}_segments`);
      if (raw) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cols = JSON.parse(raw) as any[];
        const core = cols.find((c) => c.analyzed && c.comparableTitles?.length > 0);
        if (core) comparables = core.comparableTitles.slice(0, 2);
      }
    } catch { /* ignore */ }

    const coreConv = coreSeg.convRate;
    const catAvgConv = coreSeg.benchmarkConvMid || coreConv * 0.8;
    const comp1Conv = comparables[0]?.convRate ?? catAvgConv * 1.15;
    const comp2Conv = comparables[1]?.convRate ?? catAvgConv * 0.85;

    const data: { day: number; kcd2: number; category_avg: number; comparator1: number; comparator2: number }[] = [];
    for (let d = 1; d <= maxDay; d++) {
      const frac = sCurveFraction(d);
      data.push({
        day: d,
        kcd2: Math.round(frac * coreConv * 100) / 100,
        category_avg: Math.round(frac * catAvgConv * 100) / 100,
        comparator1: Math.round(frac * comp1Conv * 100) / 100,
        comparator2: Math.round(frac * comp2Conv * 100) / 100,
      });
    }

    const labels: Record<string, string> = {
      kcd2: `${coreSeg.name} / Core`,
      category_avg: "Category Average",
      comparator1: comparables[0]?.title ?? "Top Comparator",
      comparator2: comparables[1]?.title ?? "Avg Comparator",
    };

    return { data, labels };
  }, [isKcd2, segs, projectId, maxDay]);

  const benchmarkChartData = isKcd2 ? kcd2BenchmarkData : (dynamicBenchmarkInfo?.data ?? []);
  const benchmarkChartLabels = isKcd2 ? benchmarkLegendLabels : (dynamicBenchmarkInfo?.labels ?? benchmarkLegendLabels);
  const benchmarkChartYMax = useMemo(() => {
    if (isKcd2) return yMax;
    if (!dynamicBenchmarkInfo) return 10;
    let max = 0;
    for (const pt of dynamicBenchmarkInfo.data) {
      max = Math.max(max, pt.kcd2, pt.category_avg, pt.comparator1, pt.comparator2);
    }
    return Math.ceil(max * 1.2);
  }, [isKcd2, yMax, dynamicBenchmarkInfo]);

  // ─── Empty state ───
  if (!loading && !isKcd2 && segs.length === 0) {
    return (
      <div>
        <TopNav
          breadcrumbs={[
            { label: "Workspace", href: "/dashboard" },
            { label: projectTitle },
            { label: "Performance" },
          ]}
          title="Performance & Benchmarking"
        />
        <div className="p-6">
          <div className="bg-white rounded-lg border border-nz-border shadow-sm p-12 text-center">
            <svg className="w-12 h-12 text-nz-text-muted mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h3 className="text-sm font-semibold text-nz-text mb-2">No performance data yet</h3>
            <p className="text-sm text-nz-text-muted mb-4">
              Run analysis first to see performance data.
            </p>
            <Link
              href={`/projects/${projectId}/segments`}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-[#4F46E5] rounded-lg hover:bg-[#3A48E0] transition-colors"
            >
              Go to Segment Builder
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <TopNav
        breadcrumbs={[
          { label: "Workspace", href: "/dashboard" },
          { label: projectTitle },
          { label: "Performance" },
        ]}
        title="Performance & Benchmarking"
        actions={
          <div className="flex gap-1.5">
            {(["D1\u2013D30", "D1\u2013D90", "D1\u2013D180"] as TimeRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 text-[11px] font-medium rounded-full border transition-colors ${
                  timeRange === range
                    ? "bg-[#EEF2FF] text-[#4F46E5] border-[#4F46E5]"
                    : "bg-white text-[#4A5568] border-[#E5E7EB] hover:border-[#4F46E5]/40"
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        }
      />

      <div className="p-6">
        {loading ? (
          <>
            <ChartSkeleton />
            <ChartSkeleton />
          </>
        ) : (
          <>
            {/* Info banner */}
            <div className={`flex items-start gap-3 px-4 py-3 rounded-lg mb-6 ${
              isLaunched
                ? "bg-amber-50 border border-amber-200"
                : "bg-amber-50 border border-amber-200"
            }`}>
              <svg
                className="w-5 h-5 mt-0.5 shrink-0 text-amber-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-amber-800">
                {isLaunched ? (
                  <>
                    <span className="font-semibold">Trajectory Validation Mode (Premium / P2P):</span>{" "}
                    GPME measures market-level engagement &mdash; trajectory shape is the signal, not absolute numbers.
                  </>
                ) : (
                  <>
                    <span className="font-semibold">Projected Performance:</span>{" "}
                    All adoption figures are modelled from benchmark trajectories of comparable launched titles. No actual data exists yet for this title. Actual results will vary.
                  </>
                )}
              </p>
            </div>

            {/* ═══════════════════════════════════════════════════
                CHART 1: Cumulative Adoption Share by Segment
            ═══════════════════════════════════════════════════ */}
            <div className="bg-white rounded-lg border border-nz-border shadow-sm p-5 mb-6">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-semibold text-nz-text">
                  <MetricTooltip
                    label={`Cumulative Adoption Share by Segment${!isLaunched ? " (Predicted)" : ""} \u2014 ${timeRange}`}
                    definition={isLaunched
                      ? "% of each segment's addressable market that has adopted the game by this day since launch."
                      : "For pre-launch projects, curves are modelled using an S-curve trajectory seeded from the benchmark conversion rates of comparable launched titles. The shaded band represents the 25th\u201375th percentile confidence range."}
                    whyItMatters="Shows how quickly each segment converts over time. Steep early curves = strong product-market fit."
                  />
                </h3>
                <div className="flex items-center gap-2">
                  {isLaunched && (
                    <button
                      onClick={() => setShowBenchmarkBand(!showBenchmarkBand)}
                      className={`px-2.5 py-1 text-[10px] font-medium rounded-full border transition-colors ${
                        showBenchmarkBand
                          ? "bg-[#EEF2FF] text-[#4F46E5] border-[#4F46E5]"
                          : "bg-white text-[#4A5568] border-[#E5E7EB] hover:border-[#4F46E5]/40"
                      }`}
                    >
                      {showBenchmarkBand ? "Hide" : "Show"} Benchmark Band
                    </button>
                  )}
                  <StatusBadge type={isLaunched ? "actual" : "projected"} />
                </div>
              </div>
              {!isLaunched && (
                <p className="text-xs text-nz-text-muted mb-4">
                  Modelled from benchmark trajectories of comparable launched titles. Actual results will vary.
                </p>
              )}
              {isLaunched && !isKcd2 && (
                <p className="text-xs text-nz-text-muted mb-4">
                  Percentage of each segment&apos;s addressable market that has adopted
                </p>
              )}

              <div style={{ height: 400 }}>
                <ResponsiveContainer width="100%" height="100%">
                  {isKcd2 ? (
                    /* KCD2: existing actual chart */
                    <ComposedChart data={kcd2AdoptionData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <defs>
                        {kcd2Segments.map((seg, i) => (
                          <linearGradient key={i} id={`gradSeg${i}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={seg.color} stopOpacity={0.15} />
                            <stop offset="100%" stopColor={seg.color} stopOpacity={0.02} />
                          </linearGradient>
                        ))}
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#6B7280" }} label={{ value: "Day", position: "insideBottom", offset: -5, fontSize: 11, fill: "#6B7280" }} />
                      <YAxis tick={{ fontSize: 11, fill: "#6B7280" }} tickFormatter={(v) => `${v}%`} label={{ value: "% Adoption", angle: -90, position: "insideLeft", fontSize: 11, fill: "#6B7280" }} domain={[0, yMax]} />
                      <Tooltip contentStyle={{ fontSize: 12, border: "1px solid #E5E7EB", borderRadius: 6 }}
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        formatter={(value: any, name: any) => [`${value}%`, segmentLegendLabels[name] || name]}
                        labelFormatter={(v) => `Day ${v}`}
                      />
                      <Legend align="right" verticalAlign="top"
                        formatter={(value: string) => segmentLegendLabels[value] || value}
                        wrapperStyle={{ fontSize: 12 }}
                      />
                      {showBenchmarkBand && (
                        <ReferenceArea y1={0} y2={yMax} fill="#A0AEC0" fillOpacity={0.06} />
                      )}
                      {milestoneLines(maxDay).map((m: { day: number; label: string }) => (
                        <ReferenceLine key={m.day} x={m.day} stroke="#CBD5E0" strokeDasharray="4 4" label={{ value: m.label, position: "top", fontSize: 10, fill: "#6B7280" }} />
                      ))}
                      <Area dataKey="seg1_pct" fill="url(#gradSeg0)" stroke="none" legendType="none" />
                      <Area dataKey="seg2_pct" fill="url(#gradSeg1)" stroke="none" legendType="none" />
                      <Area dataKey="seg3_pct" fill="url(#gradSeg2)" stroke="none" legendType="none" />
                      <Line dataKey="seg1_pct" stroke={SEGMENT_COLORS[0]} strokeWidth={2} dot={false} />
                      <Line dataKey="seg2_pct" stroke={SEGMENT_COLORS[1]} strokeWidth={2} dot={false} />
                      <Line dataKey="seg3_pct" stroke={SEGMENT_COLORS[2]} strokeWidth={2} dot={false} />
                    </ComposedChart>
                  ) : (
                    /* Non-kcd2: projected/actual adoption curves */
                    <ComposedChart data={projectedData?.cumulative ?? []} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <defs>
                        {segs.map((seg, i) => (
                          <linearGradient key={i} id={`gradDyn${i}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={seg.color} stopOpacity={0.15} />
                            <stop offset="100%" stopColor={seg.color} stopOpacity={0.02} />
                          </linearGradient>
                        ))}
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#6B7280" }} label={{ value: "Day", position: "insideBottom", offset: -5, fontSize: 11, fill: "#6B7280" }} />
                      <YAxis tick={{ fontSize: 11, fill: "#6B7280" }} tickFormatter={(v) => `${v}%`} label={{ value: isLaunched ? "% Adoption" : "% Adoption (Predicted)", angle: -90, position: "insideLeft", fontSize: 11, fill: "#6B7280" }} domain={[0, yMax]} />
                      <Tooltip contentStyle={{ fontSize: 12, border: "1px solid #E5E7EB", borderRadius: 6 }}
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        formatter={(value: any, name: any) => {
                          const idx = String(name).match(/seg_(\d+)_pct$/)?.[1];
                          const segLabel = idx !== undefined ? segs[Number(idx)]?.name : name === "noSeg" ? "No Target Segment" : name;
                          const label = !isLaunched && segLabel ? `Projected \u2014 ${segLabel}` : segLabel || name;
                          return [`${value}%`, label];
                        }}
                        labelFormatter={(v) => `Day ${v}`}
                      />
                      <Legend align="right" verticalAlign="top"
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        formatter={(value: any) => {
                          const idx = String(value).match(/seg_(\d+)_pct$/)?.[1];
                          return idx !== undefined ? segs[Number(idx)]?.name || value : value;
                        }}
                        wrapperStyle={{ fontSize: 12 }}
                      />
                      {milestoneLines(maxDay).map((m: { day: number; label: string }) => (
                        <ReferenceLine key={m.day} x={m.day} stroke="#CBD5E0" strokeDasharray="4 4" label={{ value: m.label, position: "top", fontSize: 10, fill: "#6B7280" }} />
                      ))}
                      {/* Confidence bands */}
                      {!isLaunched && segs.map((seg, i) => (
                        <Area
                          key={`band_${i}`}
                          dataKey={`seg_${i}_pct_high`}
                          stroke="none"
                          fill={seg.color}
                          fillOpacity={0.1}
                          legendType="none"
                          isAnimationActive={false}
                        />
                      ))}
                      {/* Fill areas */}
                      {segs.map((seg, i) => (
                        <Area key={`area_${i}`} dataKey={`seg_${i}_pct`} fill={`url(#gradDyn${i})`} stroke="none" legendType="none" />
                      ))}
                      {/* Lines */}
                      {segs.map((seg, i) => (
                        <Line key={`line_${i}`} dataKey={`seg_${i}_pct`} stroke={seg.color} strokeWidth={2} dot={false} />
                      ))}
                    </ComposedChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════
                CHART 2: KCD2 Benchmarking (only for kcd2)
            ═══════════════════════════════════════════════════ */}
            {(isKcd2 || dynamicBenchmarkInfo) && (
              <div className="bg-white rounded-lg border border-nz-border shadow-sm p-5 mb-6">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-semibold text-nz-text">
                    Core Segment vs. Category &amp; Comparators{!isLaunched ? " (Predicted)" : ""}
                  </h3>
                  <div className="flex items-center gap-2">
                    <button className="text-xs text-nz-primary hover:underline font-medium">
                      + Add Comparator
                    </button>
                    <StatusBadge type={isLaunched ? "actual" : "projected"} />
                  </div>
                </div>
                <p className="text-xs text-nz-text-muted mb-1">{isKcd2 ? "Auto-filtered: P2P Premium titles only" : "Benchmark comparators based on segment analysis"}</p>
                <p className="text-xs text-nz-text-muted mb-4">
                  <MetricTooltip
                    label="Category Average"
                    definition="Average adoption curve of comparable titles in the same genre."
                    whyItMatters="Your benchmark baseline. Outperforming this validates your go-to-market targeting."
                  />
                </p>
                <div style={{ height: 400 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={benchmarkChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#6B7280" }} label={{ value: "Day", position: "insideBottom", offset: -5, fontSize: 11, fill: "#6B7280" }} />
                      <YAxis tick={{ fontSize: 11, fill: "#6B7280" }} tickFormatter={(v) => `${v}%`} label={{ value: isLaunched ? "% Adoption" : "% Adoption (Predicted)", angle: -90, position: "insideLeft", fontSize: 11, fill: "#6B7280" }} domain={[0, benchmarkChartYMax]} />
                      <Tooltip contentStyle={{ fontSize: 12, border: "1px solid #E5E7EB", borderRadius: 6 }}
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        formatter={(value: any, name: any) => {
                          const prefix = !isLaunched ? "Projected \u2014 " : "";
                          return [`${value}%`, `${prefix}${benchmarkChartLabels[name] || name}`];
                        }}
                        labelFormatter={(v) => `Day ${v}`}
                      />
                      <Legend align="right" verticalAlign="top"
                        formatter={(value: string) => benchmarkChartLabels[value] || value}
                        wrapperStyle={{ fontSize: 12 }}
                      />
                      {milestoneLines(maxDay).map((m: { day: number; label: string }) => (
                        <ReferenceLine key={m.day} x={m.day} stroke="#CBD5E0" strokeDasharray="4 4" label={{ value: m.label, position: "top", fontSize: 10, fill: "#6B7280" }} />
                      ))}
                      <Line dataKey="kcd2" stroke="#4F46E5" strokeWidth={3} dot={false} />
                      <Line dataKey="category_avg" stroke="#A0AEC0" strokeWidth={2} strokeDasharray="6 3" dot={false} />
                      <Line dataKey="comparator1" stroke="#805AD5" strokeWidth={2} dot={false} />
                      <Line dataKey="comparator2" stroke="#38B2AC" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════
                CHART 3: Daily New Adopters by Segment
            ═══════════════════════════════════════════════════ */}
            {(projectedData || isKcd2) && (
              <div className="bg-white rounded-lg border border-nz-border shadow-sm p-5 mb-6">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-semibold text-nz-text">
                    <MetricTooltip
                      label={`Daily New Adopters by Segment${!isLaunched ? " (Predicted)" : ""}`}
                      definition={isLaunched
                        ? "New players adopting per day, broken down by segment."
                        : "Projected daily new players per segment based on benchmark adoption patterns. Launch spike at D1 reflects typical category behaviour. Actual day-1 spikes vary significantly by title."}
                      whyItMatters="Shows the launch spike shape and how quickly adoption decays. A sharp D1 spike followed by a long tail is the typical pattern for premium titles."
                    />
                  </h3>
                  <StatusBadge type={isLaunched ? "actual" : "projected"} />
                </div>
                <p className="text-xs text-nz-text-muted mb-4">
                  New players adopting per day, by segment
                </p>

                <div style={{ height: 350 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={isKcd2 ? kcd2AdoptionData.map((pt, i, arr) => {
                        // For KCD2, derive daily from cumulative difference
                        const prev = i > 0 ? arr[i - 1] : { seg1_pct: 0, seg2_pct: 0, seg3_pct: 0 };
                        return {
                          day: pt.day,
                          seg_0: Math.max(0, Math.round((pt.seg1_pct - prev.seg1_pct) * 51700 / 100)),
                          seg_1: Math.max(0, Math.round((pt.seg2_pct - prev.seg2_pct) * 51700 / 100)),
                          seg_2: Math.max(0, Math.round((pt.seg3_pct - prev.seg3_pct) * 123800 / 100)),
                          noSeg: Math.max(0, Math.round((pt.seg1_pct - prev.seg1_pct) * 6390 / 100)),
                        };
                      }) : (projectedData?.daily ?? [])}
                      margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#6B7280" }} label={{ value: "Day", position: "insideBottom", offset: -5, fontSize: 11, fill: "#6B7280" }} />
                      <YAxis tick={{ fontSize: 11, fill: "#6B7280" }} tickFormatter={(v) => formatNumber(v)} />
                      <Tooltip
                        contentStyle={{ fontSize: 12, border: "1px solid #E5E7EB", borderRadius: 6 }}
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        formatter={(value: any, name: any) => {
                          const idx = String(name).match(/seg_(\d+)$/)?.[1];
                          const segLabel = idx !== undefined
                            ? (isKcd2 ? kcd2Segments[Number(idx)]?.name : segs[Number(idx)]?.name) || name
                            : name === "noSeg" ? "No Target Segment" : name;
                          const label = !isLaunched && segLabel ? `Projected \u2014 ${segLabel}` : segLabel;
                          return [`~${formatNumber(value)}`, label];
                        }}
                        labelFormatter={(v) => `Day ${v}`}
                      />
                      <Legend align="right" verticalAlign="top"
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        formatter={(value: any) => {
                          const idx = value.match(/seg_(\d+)$/)?.[1];
                          if (idx !== undefined) return isKcd2 ? kcd2Segments[Number(idx)]?.name || value : segs[Number(idx)]?.name || value;
                          if (value === "noSeg") return "No Target Segment";
                          return value;
                        }}
                        wrapperStyle={{ fontSize: 12 }}
                      />
                      {milestoneLines(maxDay).map((m: { day: number; label: string }) => (
                        <ReferenceLine key={m.day} x={m.day} stroke="#CBD5E0" strokeDasharray="4 4" label={{ value: m.label, position: "top", fontSize: 10, fill: "#6B7280" }} />
                      ))}
                      {(isKcd2 ? kcd2Segments : segs).map((seg, i) => (
                        <Bar key={i} dataKey={`seg_${i}`} stackId="a" fill={seg.color} />
                      ))}
                      <Bar dataKey="noSeg" stackId="a" fill={NO_SEG_COLOR} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════
                MILESTONE TABLE
            ═══════════════════════════════════════════════════ */}
            {milestoneData.length > 0 && (
              <div className="bg-white rounded-lg border border-nz-border shadow-sm p-5 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-nz-text">
                    <MetricTooltip
                      label={`Adoption Milestones by Segment${!isLaunched ? " (Predicted)" : ""}`}
                      definition={isLaunched
                        ? "Cumulative adopters at key time milestones (Day 1, 7, 30, 90) for each segment."
                        : "Projected cumulative adopters at D1, D7, D30, D90. Ranges reflect the low\u2013high benchmark confidence band. Use this to set expectations for launch-window KPIs."}
                      whyItMatters="Track whether your launch trajectory is front-loaded (strong product-market fit) or slow-burn (needs sustained marketing). Compare segments to see which audiences activate fastest."
                    />
                  </h3>
                  {!isLaunched && <StatusBadge type="projected" />}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-nz-border">
                        <th className="text-left py-2 px-3 text-xs font-semibold text-nz-text-muted uppercase">Segment</th>
                        <th className="text-right py-2 px-3 text-xs font-semibold text-nz-text-muted uppercase">D1</th>
                        <th className="text-right py-2 px-3 text-xs font-semibold text-nz-text-muted uppercase">D7</th>
                        <th className="text-right py-2 px-3 text-xs font-semibold text-nz-text-muted uppercase">D30</th>
                        <th className="text-right py-2 px-3 text-xs font-semibold text-nz-text-muted uppercase">D90</th>
                        <th className="text-right py-2 px-3 text-xs font-semibold text-nz-text-muted uppercase">{isLaunched ? "vs Benchmark" : "vs Benchmark (Projected)"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {milestoneData.map((row, i) => (
                        <tr key={i} className="border-b border-nz-border last:border-0">
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: row.color }} />
                              <span className="font-medium text-nz-text">{row.name}</span>
                            </div>
                            {row.pacing && (
                              <div className="text-[10px] font-medium mt-0.5 ml-[18px]" style={{ color: row.pacingColor }}>
                                {row.pacing}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right text-nz-text">
                            {!isLaunched && row.d1High ? (
                              <span className="text-xs">{formatNumber(row.d1)}&ndash;{formatNumber(row.d1High)} <span className="text-[8px] font-bold px-1 py-0.5 rounded-full bg-[#FEF3E0] text-[#B96B00] uppercase ml-0.5">PREDICTED</span></span>
                            ) : (
                              formatNumber(row.d1)
                            )}
                          </td>
                          <td className="py-3 px-3 text-right text-nz-text">
                            {!isLaunched && row.d7High ? (
                              <span className="text-xs">{formatNumber(row.d7)}&ndash;{formatNumber(row.d7High)} <span className="text-[8px] font-bold px-1 py-0.5 rounded-full bg-[#FEF3E0] text-[#B96B00] uppercase ml-0.5">PREDICTED</span></span>
                            ) : (
                              formatNumber(row.d7)
                            )}
                          </td>
                          <td className="py-3 px-3 text-right text-nz-text">
                            {!isLaunched && row.d30High ? (
                              <span className="text-xs">{formatNumber(row.d30)}&ndash;{formatNumber(row.d30High)} <span className="text-[8px] font-bold px-1 py-0.5 rounded-full bg-[#FEF3E0] text-[#B96B00] uppercase ml-0.5">PREDICTED</span></span>
                            ) : (
                              formatNumber(row.d30)
                            )}
                          </td>
                          <td className="py-3 px-3 text-right text-nz-text">
                            {!isLaunched && row.d90High ? (
                              <span className="text-xs">{formatNumber(row.d90)}&ndash;{formatNumber(row.d90High)} <span className="text-[8px] font-bold px-1 py-0.5 rounded-full bg-[#FEF3E0] text-[#B96B00] uppercase ml-0.5">PREDICTED</span></span>
                            ) : (
                              formatNumber(row.d90)
                            )}
                          </td>
                          <td className="py-3 px-3 text-right font-medium" style={{ color: row.vsBenchmarkColor }}>
                            {row.vsBenchmark}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
