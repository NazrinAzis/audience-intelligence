"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { TopNav } from "@/components/TopNav";
import {
  segments,
  project,
  topGamesPerSegment,
  overlapIndex30DayPerSegment,
  overlapIndexLifetimePerSegment,
  behavioralProfilePerSegment,
  demographicProfilePerSegment,
  psychographicProfilePerSegment,
  regionBreakdownPerSegment,
  personaOverlapPerSegment,
  formatNumber,
} from "@/lib/mockData";
import { useProjectStore } from "@/lib/store";
import type { GeneratedProfile } from "@/app/api/generate-profile/route";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";

const SEGMENT_COLORS = ["#4F46E5", "#22C55E", "#F6A623", "#805AD5", "#A0AEC0"];
const MONTHS = ["Jan 2025", "Feb 2025", "Mar 2025", "Apr 2025", "May 2025"];

type SubTab = "overview" | "region" | "prior";

// ─── Tooltip icon ───

function InfoTooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-flex ml-1">
      <svg
        className="w-3.5 h-3.5 text-nz-text-muted cursor-help"
        fill="currentColor"
        viewBox="0 0 20 20"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
      >
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
          clipRule="evenodd"
        />
      </svg>
      {show && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-[11px] rounded-lg w-64 z-50 shadow-lg pointer-events-none leading-relaxed">
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-800 rotate-45 -mt-1" />
        </div>
      )}
    </span>
  );
}

// ─── Data badge ───

function DataBadge({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
      style={{ backgroundColor: color + "18", color }}
    >
      {label}
    </span>
  );
}

// ─── Section divider ───

function SectionHeader({
  title,
  subtitle,
  badge,
  badgeColor,
  tooltip,
}: {
  title: string;
  subtitle?: string;
  badge?: string;
  badgeColor?: string;
  tooltip?: string;
}) {
  return (
    <div className="mb-5 mt-8 first:mt-0">
      <div className="flex items-center gap-3">
        <h3 className="text-sm font-semibold text-nz-text">{title}</h3>
        {badge && badgeColor && <DataBadge label={badge} color={badgeColor} />}
        {tooltip && <InfoTooltip text={tooltip} />}
        <div className="flex-1 border-b border-nz-border" />
      </div>
      {subtitle && (
        <p className="text-xs text-nz-text-muted mt-1">{subtitle}</p>
      )}
    </div>
  );
}

// ─── Horizontal bar for taxonomy items ───

function TaxonomyBar({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="w-28 text-[11px] text-nz-text-secondary truncate">{label}</div>
      <div className="flex-1 h-3.5 bg-gray-50 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <div className="w-12 text-[11px] font-semibold text-nz-text text-right">
        {formatNumber(value)}
      </div>
    </div>
  );
}

// ─── Donut component for demographics ───

function DonutChart({
  data,
  colors,
  size = 120,
}: {
  data: { label: string; pct: number }[];
  colors: string[];
  size?: number;
}) {
  const r = size / 2 - 8;
  const cx = size / 2;
  const cy = size / 2;
  let cumAngle = -90;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {data.map((d, i) => {
        const angle = (d.pct / 100) * 360;
        const startAngle = cumAngle;
        cumAngle += angle;
        const endAngle = cumAngle;

        const startRad = (startAngle * Math.PI) / 180;
        const endRad = (endAngle * Math.PI) / 180;

        const x1 = cx + r * Math.cos(startRad);
        const y1 = cy + r * Math.sin(startRad);
        const x2 = cx + r * Math.cos(endRad);
        const y2 = cy + r * Math.sin(endRad);
        const largeArc = angle > 180 ? 1 : 0;

        return (
          <path
            key={i}
            d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`}
            fill={colors[i % colors.length]}
            stroke="white"
            strokeWidth={2}
          />
        );
      })}
      <circle cx={cx} cy={cy} r={r * 0.55} fill="white" />
    </svg>
  );
}

// ─── Behavioral Section (MONTHLY) ───

function BehavioralSection({
  segId,
  segColor,
  selectedMonth,
  onMonthChange,
}: {
  segId: string;
  segColor: string;
  selectedMonth: string;
  onMonthChange: (m: string) => void;
}) {
  const data = behavioralProfilePerSegment[segId];
  if (!data) return null;

  const taxCategories = [
    { label: "Genres", items: data.taxonomies.genres },
    { label: "Sub-Genres", items: data.taxonomies.subGenres },
    { label: "Game Mechanics", items: data.taxonomies.mechanics },
    { label: "Art Styles", items: data.taxonomies.artStyles },
    { label: "Themes", items: data.taxonomies.themes },
  ];

  const totalMarkets = data.includedGames.length > 0
    ? Math.max(...data.includedGames.map((g) => g.markets))
    : 42;

  return (
    <>
      <SectionHeader
        title="Behavioral Profile"
        badge="MONTHLY"
        badgeColor="#4F46E5"
      />

      {/* Month selector */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-nz-text-secondary">
            Behavioral data &mdash;
          </span>
          <select
            value={selectedMonth}
            onChange={(e) => onMonthChange(e.target.value)}
            className="text-xs border border-nz-border rounded-full px-3 py-1.5 bg-white text-nz-text font-medium"
          >
            {MONTHS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <InfoTooltip text="Behavioral metrics update monthly. Select a month to see how this segment's gaming activity changed." />
        </div>
      </div>

      {/* Row 1: Three stat cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* MAU Card */}
        <div className="bg-white rounded-lg border border-nz-border p-4 shadow-sm">
          <div className="text-xs text-nz-text-muted mb-1 flex items-center">Monthly Active Users<InfoTooltip text="Total de-duplicated MAU for games matching this segment's behavioral rules. Powered by GPME individual user data." /></div>
          <div className="text-2xl font-bold text-nz-text">{formatNumber(data.mau)}</div>
          <div className="text-[10px] text-nz-text-muted mt-0.5 mb-2">
            Total deduplicated MAU for games matching this segment
          </div>
          {/* Gender split bar */}
          <div className="flex items-center gap-0 h-2 rounded-full overflow-hidden">
            <div
              className="h-full"
              style={{ width: `${data.malePercent}%`, backgroundColor: "#4F46E5" }}
            />
            <div
              className="h-full"
              style={{ width: `${data.femalePercent}%`, backgroundColor: "#F6A623" }}
            />
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[10px] font-medium" style={{ color: "#4F46E5" }}>
              {data.malePercent}% Male
            </span>
            <span className="text-[10px] font-medium" style={{ color: "#F6A623" }}>
              {data.femalePercent}% Female
            </span>
          </div>
        </div>

        {/* Avg Monthly Playtime Card */}
        <div className="bg-white rounded-lg border border-nz-border p-4 shadow-sm">
          <div className="text-xs text-nz-text-muted mb-1 flex items-center">Avg. Monthly Playtime (Hours)<InfoTooltip text="Average hours per month spent playing games that fit this segment's profile. Segment figure vs. platform average shown for context." /></div>
          <div className="text-2xl font-bold text-nz-text">{data.avgMonthlyPlaytime}</div>
          <div className="text-[10px] text-nz-text-muted mt-0.5 mb-2">
            Hours spent on games fitting this segment, on average
          </div>
          {/* Split bar: segment vs platform avg */}
          <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{
                width: `${Math.min((data.avgMonthlyPlaytime / 40) * 100, 100)}%`,
                backgroundColor: segColor,
              }}
            />
            <div
              className="absolute inset-y-0 w-0.5 bg-gray-500 z-10"
              style={{ left: `${Math.min((data.platformAvgPlaytime / 40) * 100, 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[10px] font-medium" style={{ color: segColor }}>
              Segment: {data.avgMonthlyPlaytime}h
            </span>
            <span className="text-[10px] text-nz-text-muted">
              Avg: {data.platformAvgPlaytime}h
              {data.avgMonthlyPlaytime > data.platformAvgPlaytime && (
                <span className="text-green-600 font-semibold ml-1">
                  +{Math.round(((data.avgMonthlyPlaytime - data.platformAvgPlaytime) / data.platformAvgPlaytime) * 100)}%
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Playtime Distribution Card */}
        <div className="bg-white rounded-lg border border-nz-border p-4 shadow-sm">
          <div className="text-xs text-nz-text-muted mb-3 flex items-center">Playtime Distribution<InfoTooltip text="Share of this segment's players who play more than 1hr / 5hrs / 10hrs / 25hrs / 50hrs per month. Grey = share of total panel. Green = share of this segment." /></div>
          <div className="space-y-1.5">
            {data.playtimeDistribution.map((row) => (
              <div key={row.bucket} className="flex items-center gap-2">
                <span className="text-[10px] text-nz-text-muted w-10">{row.bucket}</span>
                <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden relative">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full opacity-30"
                    style={{ width: `${row.totalShare}%`, backgroundColor: "#A0AEC0" }}
                  />
                  <div
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{ width: `${row.segmentShare}%`, backgroundColor: segColor }}
                  />
                </div>
                <span className="text-[10px] font-semibold w-8 text-right" style={{ color: segColor }}>
                  {row.segmentShare}%
                </span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-2 pt-1 border-t border-nz-border">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full opacity-30" style={{ backgroundColor: "#A0AEC0" }} />
              <span className="text-[9px] text-nz-text-muted">Share of total</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: segColor }} />
              <span className="text-[9px] text-nz-text-muted">Share of segment</span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Taxonomies that resonate - 5 column grid */}
      <div className="bg-white rounded-lg border border-nz-border shadow-sm p-5 mb-6">
        <div className="flex items-center justify-between mb-1">
          <h4 className="text-sm font-semibold text-nz-text flex items-center">
            Taxonomies that resonate with your Segment
            <InfoTooltip text="Top Genres, Sub-Genres, Game Mechanics, Art Styles, and Themes ranked by MAU among players in this segment. Use this to understand what this audience gravitates toward beyond your title." />
          </h4>
        </div>
        <p className="text-xs text-nz-text-muted mb-4">
          Ranked on MAU | {selectedMonth} | {totalMarkets} Markets
        </p>
        <div className="grid grid-cols-5 gap-4">
          {taxCategories.map((cat) => {
            const top3 = cat.items.slice(0, 3);
            const maxVal = Math.max(...top3.map((item) => item.mau));
            return (
              <div key={cat.label}>
                <div className="text-[10px] font-semibold text-nz-text-muted uppercase tracking-wider mb-3">
                  {cat.label}
                </div>
                <div className="space-y-2.5">
                  {top3.map((item) => (
                    <TaxonomyBar
                      key={item.name}
                      label={item.name}
                      value={item.mau}
                      max={maxVal}
                      color={segColor}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Row 3: Included Games table */}
      <div className="bg-white rounded-lg border border-nz-border shadow-sm p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold text-nz-text">Included Games</h4>
          <div className="flex items-center gap-2">
            <button className="text-[10px] font-medium text-nz-text-secondary border border-nz-border rounded px-2 py-1 hover:bg-gray-50">
              Edit Columns
            </button>
            <button className="text-[10px] font-medium text-nz-text-secondary border border-nz-border rounded px-2 py-1 hover:bg-gray-50">
              Calculate Rows ▾
            </button>
            <button className="text-[10px] text-nz-text-muted border border-nz-border rounded px-1.5 py-1 hover:bg-gray-50">
              ⚙
            </button>
            <button className="text-[10px] text-nz-text-muted border border-nz-border rounded px-1.5 py-1 hover:bg-gray-50">
              ↓
            </button>
          </div>
        </div>
        {/* Filters row */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[11px] font-medium text-nz-primary cursor-pointer">+ Table Filters</span>
          <span className="text-[11px] text-nz-text-muted border border-nz-border rounded-full px-2.5 py-0.5 cursor-pointer hover:bg-gray-50">Games set</span>
          <span className="text-[11px] text-nz-text-muted border border-nz-border rounded-full px-2.5 py-0.5 cursor-pointer hover:bg-gray-50">Genre</span>
          <span className="text-[11px] text-nz-text-muted border border-nz-border rounded-full px-2.5 py-0.5 cursor-pointer hover:bg-gray-50">Subgenre</span>
          <span className="text-[11px] text-nz-text-muted cursor-pointer hover:text-red-500 ml-1">Clear All &times;</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-nz-border">
                <th className="text-left py-2 px-3 text-[10px] font-semibold text-nz-text-muted uppercase">Game</th>
                <th className="text-left py-2 px-3 text-[10px] font-semibold text-nz-text-muted uppercase">Publisher</th>
                <th className="text-left py-2 px-3 text-[10px] font-semibold text-nz-text-muted uppercase">Genre</th>
                <th className="text-left py-2 px-3 text-[10px] font-semibold text-nz-text-muted uppercase">Release Date</th>
                <th className="text-center py-2 px-3 text-[10px] font-semibold text-nz-text-muted uppercase">Platforms</th>
                <th className="text-right py-2 px-3 text-[10px] font-semibold text-nz-text-muted uppercase">Markets</th>
                <th className="text-right py-2 px-3 text-[10px] font-semibold text-nz-text-muted uppercase">MAU</th>
                <th className="text-right py-2 px-3 text-[10px] font-semibold text-nz-text-muted uppercase">Player Share</th>
                <th className="text-right py-2 px-3 text-[10px] font-semibold text-nz-text-muted uppercase">Avg Playtime (h)</th>
                <th className="text-right py-2 px-3 text-[10px] font-semibold text-nz-text-muted uppercase">Playtime Idx</th>
              </tr>
            </thead>
            <tbody>
              {data.includedGames.map((game, i) => {
                const maxMau = Math.max(...data.includedGames.map((g) => g.mau));
                const mauBarPct = maxMau > 0 ? (game.mau / maxMau) * 100 : 0;
                return (
                  <tr key={i} className="border-b border-nz-border last:border-0 hover:bg-nz-bg/50">
                    <td className="py-2.5 px-3 font-medium text-nz-text text-xs">{game.title}</td>
                    <td className="py-2.5 px-3 text-xs">
                      <span className="text-nz-primary cursor-pointer hover:underline">{game.publisher}</span>
                    </td>
                    <td className="py-2.5 px-3 text-xs">
                      <span className="text-nz-primary cursor-pointer hover:underline">{game.genre}</span>
                    </td>
                    <td className="py-2.5 px-3 text-nz-text-secondary text-xs">{game.releaseDate}</td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {game.platforms.map((p) => (
                          <span
                            key={p}
                            className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-gray-100 text-nz-text-secondary"
                            title={p}
                          >
                            {p === "PC" ? "🖥" : p === "PS5" ? "🎮" : p === "Xbox" ? "🎮" : p}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right text-nz-text-secondary text-xs">{game.markets}</td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-green-500" style={{ width: `${mauBarPct}%` }} />
                        </div>
                        <span className="text-xs text-nz-text font-medium">{formatNumber(game.mau)}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right text-nz-text text-xs">{game.playerShare}%</td>
                    <td className="py-2.5 px-3 text-right text-nz-text text-xs">{game.avgPlaytime}h</td>
                    <td className="py-2.5 px-3 text-right">
                      <span
                        className={`text-xs font-semibold ${
                          game.playtimeIndex >= 1.5
                            ? "text-green-600"
                            : game.playtimeIndex >= 1.0
                            ? "text-nz-text"
                            : "text-orange-500"
                        }`}
                      >
                        {game.playtimeIndex.toFixed(2)}x
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// ─── Demographic Section (LIFETIME) ───

function DemographicSection({ segId, segColor }: { segId: string; segColor: string }) {
  const data = demographicProfilePerSegment[segId];
  if (!data) return null;

  const AGE_COLORS = ["#E5E7EB", "#E5E7EB", "#4F46E5", "#3644DB", "#2D38B8", "#A0AEC0"];
  const GENDER_COLORS = ["#4F46E5", "#F687B3", "#805AD5", "#A0AEC0"];
  const DEVICE_COLORS = ["#4F46E5", "#22C55E", "#F6A623", "#A0AEC0"];

  // Find dominant age group
  const maxAgePct = Math.max(...data.age.map((a) => a.pct));

  return (
    <>
      <SectionHeader
        title="Demographic Profile"
        subtitle="Lifetime data — does not change by month"
        badge="LIFETIME"
        badgeColor="#6B7280"
      />

      <div className="grid grid-cols-2 gap-5 mb-6">
        {/* Age distribution */}
        <div className="bg-white rounded-lg border border-nz-border p-5 shadow-sm">
          <div className="text-xs font-semibold text-nz-text-muted uppercase tracking-wider mb-4">
            Age Distribution
          </div>
          <div className="flex items-end gap-2 h-32">
            {data.age.map((a, i) => {
              const isDominant = a.pct === maxAgePct;
              return (
                <div key={a.bucket} className="flex-1 flex flex-col items-center gap-1">
                  <span
                    className="text-[10px] font-semibold"
                    style={{ color: isDominant ? segColor : "#6B7280" }}
                  >
                    {a.pct}%
                  </span>
                  <div
                    className="w-full rounded-t-md transition-all"
                    style={{
                      height: `${(a.pct / maxAgePct) * 100}%`,
                      minHeight: 4,
                      backgroundColor: isDominant ? segColor : AGE_COLORS[i],
                      border: isDominant ? `2px solid ${segColor}` : undefined,
                    }}
                  />
                  <span className="text-[10px] text-nz-text-muted">{a.bucket}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Gender distribution */}
        <div className="bg-white rounded-lg border border-nz-border p-5 shadow-sm">
          <div className="text-xs font-semibold text-nz-text-muted uppercase tracking-wider mb-4">
            Gender Distribution
          </div>
          <div className="flex items-center gap-5">
            <DonutChart data={data.gender} colors={GENDER_COLORS} />
            <div className="space-y-2">
              {data.gender.map((g, i) => (
                <div key={g.label} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: GENDER_COLORS[i] }} />
                  <span className="text-xs text-nz-text-secondary">{g.label}</span>
                  <span className="text-xs font-semibold text-nz-text">{g.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Device ownership */}
        <div className="bg-white rounded-lg border border-nz-border p-5 shadow-sm">
          <div className="text-xs font-semibold text-nz-text-muted uppercase tracking-wider mb-4">
            Device Ownership
          </div>
          <div className="space-y-3">
            {data.devices.map((d, i) => (
              <div key={d.device}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-nz-text-secondary">{d.device}</span>
                  <span className="text-xs font-semibold text-nz-text">{d.pct}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${d.pct}%`, backgroundColor: DEVICE_COLORS[i] }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Region distribution */}
        <div className="bg-white rounded-lg border border-nz-border p-5 shadow-sm">
          <div className="text-xs font-semibold text-nz-text-muted uppercase tracking-wider mb-4">
            Region Distribution
          </div>
          <div className="space-y-3">
            {data.regions.map((r) => (
              <div key={r.region}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-nz-text-secondary">{r.region}</span>
                  <span className="text-xs font-semibold text-nz-text">{r.pct}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${r.pct}%`, backgroundColor: segColor }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Psychographic Section (LIFETIME) ───

function PsychographicSection({ segId, segColor }: { segId: string; segColor: string }) {
  const data = psychographicProfilePerSegment[segId];
  const personas = personaOverlapPerSegment[segId];
  if (!data) return null;

  return (
    <>
      <SectionHeader
        title="Psychographic Profile"
        subtitle="Lifetime data — does not change by month"
        badge="LIFETIME"
        badgeColor="#6B7280"
      />

      <div className="grid grid-cols-2 gap-5 mb-6">
        {/* Personas */}
        {personas && personas.length > 0 && (
          <div className="bg-white rounded-lg border border-nz-border p-5 shadow-sm">
            <div className="text-xs font-semibold text-nz-text-muted uppercase tracking-wider mb-4">
              Gamer Persona Distribution
            </div>
            <div className="space-y-3">
              {personas.map((p) => (
                <div key={p.persona}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-nz-text-secondary">{p.persona}</span>
                    <span className="text-xs font-semibold text-nz-text">{p.pct}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${p.pct}%`, backgroundColor: segColor }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Gaming Motivations — segment vs platform avg */}
        <div className="bg-white rounded-lg border border-nz-border p-5 shadow-sm">
          <div className="text-xs font-semibold text-nz-text-muted uppercase tracking-wider mb-4">
            Gaming Motivations
          </div>
          <div className="space-y-3">
            {data.motivations.map((m) => (
              <div key={m.motivation}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-nz-text-secondary">{m.motivation}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-nz-text-muted">
                      Avg {m.platformAvg}
                    </span>
                    <span className="text-xs font-semibold" style={{ color: segColor }}>
                      {m.segmentScore}
                    </span>
                  </div>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden relative">
                  {/* Platform avg marker */}
                  <div
                    className="absolute inset-y-0 w-0.5 bg-gray-400 z-10"
                    style={{ left: `${m.platformAvg}%` }}
                  />
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${m.segmentScore}%`, backgroundColor: segColor }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Player Values */}
        <div className="bg-white rounded-lg border border-nz-border p-5 shadow-sm">
          <div className="text-xs font-semibold text-nz-text-muted uppercase tracking-wider mb-4">
            Player Values
          </div>
          <div className="space-y-3">
            {data.playerValues.map((v) => (
              <div key={v.value}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-nz-text-secondary">{v.value}</span>
                  <span className="text-xs font-semibold text-nz-text">{v.pct}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${v.pct}%`, backgroundColor: segColor }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Social Platform Affinity */}
        <div className="bg-white rounded-lg border border-nz-border p-5 shadow-sm">
          <div className="flex items-center gap-1 mb-4">
            <div className="text-xs font-semibold text-nz-text-muted uppercase tracking-wider">
              Social Media Platforms
            </div>
            <InfoTooltip text="Use this to inform your content and influencer marketing channel strategy" />
          </div>
          <div className="space-y-2.5">
            {data.socialPlatforms.map((sp) => (
              <div key={sp.platform} className="flex items-center gap-3">
                <span className="text-xs text-nz-text-secondary w-20">{sp.platform}</span>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${sp.pct}%`, backgroundColor: segColor }}
                  />
                </div>
                <span className="text-xs font-semibold text-nz-text w-8 text-right">{sp.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Conversion Funnel ───

function ConversionFunnel({ segId, segColor }: { segId: string; segColor: string }) {
  const seg = segments.find((s) => s.id === segId);
  if (!seg) return null;

  const stages = [
    { label: "Total Tracked", value: project.totalTrackedUsers, pct: 100 },
    { label: "Addressable", value: seg.addressableMarket, pct: (seg.addressableMarket / project.totalTrackedUsers) * 100 },
    { label: "Adopters", value: seg.adopters, pct: (seg.adopters / project.totalTrackedUsers) * 100 },
  ];

  return (
    <>
      <SectionHeader
        title="Conversion Funnel"
        tooltip="Shows how many players in this segment converted to adopters. Use this to understand your segment&#39;s addressable opportunity and current penetration."
      />

      <div className="bg-white rounded-lg border border-nz-border p-6 mb-6 shadow-sm">
        <div className="space-y-3">
          {stages.map((stage, i) => {
            const maxW = 100;
            const widthPct = i === 0
              ? maxW
              : Math.max((stage.value / stages[0].value) * maxW, 6);

            // Drop-off from previous stage
            const dropOff = i > 0
              ? Math.round((1 - stage.value / stages[i - 1].value) * 100)
              : 0;

            return (
              <div key={stage.label}>
                <div className="flex items-center gap-4">
                  <div className="w-28 text-xs text-nz-text-secondary text-right">
                    {stage.label}
                  </div>
                  <div className="flex-1 relative">
                    <div
                      className="h-10 rounded-lg flex items-center px-3 transition-all"
                      style={{
                        width: `${widthPct}%`,
                        backgroundColor: segColor,
                        opacity: 1 - i * 0.2,
                        clipPath: i < stages.length - 1
                          ? "polygon(0 0, 98% 0, 100% 50%, 98% 100%, 0 100%)"
                          : undefined,
                      }}
                    >
                      <span className="text-xs font-bold text-white">
                        {formatNumber(stage.value)}
                      </span>
                    </div>
                  </div>
                  <div className="w-16 text-xs font-semibold text-nz-text text-right">
                    {stage.pct < 1 && stage.pct > 0
                      ? stage.pct.toFixed(2)
                      : Math.round(stage.pct)}%
                  </div>
                </div>
                {i > 0 && (
                  <div className="flex items-center gap-4 my-0.5">
                    <div className="w-28" />
                    <div className="text-[10px] text-nz-text-muted pl-2">
                      ↓ {dropOff}% drop-off
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-4 pt-4 border-t border-nz-border flex items-center justify-between">
          <span className="text-xs text-nz-text-muted">
            Conversion Rate (Addressable → Adopters)
          </span>
          <span className="text-lg font-bold" style={{ color: segColor }}>
            {seg.conversionRate}%
          </span>
        </div>
      </div>
    </>
  );
}

// ─── Overview Sub-Tab ───

function OverviewSubTab({
  segId,
  segColor,
}: {
  segId: string;
  segColor: string;
}) {
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[MONTHS.length - 1]);

  return (
    <>
      <BehavioralSection
        segId={segId}
        segColor={segColor}
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
      />
      <DemographicSection segId={segId} segColor={segColor} />
      <PsychographicSection segId={segId} segColor={segColor} />
      <ConversionFunnel segId={segId} segColor={segColor} />
    </>
  );
}

// ─── Region / Market Sub-Tab ───

function RegionSubTab({ segId, segColor }: { segId: string; segColor: string }) {
  const regionData = regionBreakdownPerSegment[segId];
  if (!regionData) return null;

  const avgConv = regionData.reduce((s, r) => s + r.convRate, 0) / regionData.length;

  return (
    <>
      <p className="text-sm text-nz-text-secondary mb-5">
        Geographic distribution of this segment&apos;s addressable market and conversion performance.
      </p>

      {/* Region breakdown table */}
      <div className="bg-white rounded-lg border border-nz-border shadow-sm p-5 mb-5">
        <h3 className="text-sm font-semibold text-nz-text mb-4 flex items-center">
          Top Markets by Monthly Active Users
          <InfoTooltip text="Regions ranked by the number of monthly active users within this segment's addressable market. Powered by GPME regional data. Use this to prioritise which markets to activate first in your media plan." />
        </h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-nz-border">
              <th className="text-left py-2 px-3 text-xs font-semibold text-nz-text-muted uppercase">
                <span className="flex items-center">Region<InfoTooltip text="Geographic region as defined by Newzoo's standard market taxonomy." /></span>
              </th>
              <th className="text-right py-2 px-3 text-xs font-semibold text-nz-text-muted uppercase">
                <span className="flex items-center justify-end">MAU<InfoTooltip text="Monthly Active Users — the estimated number of players in this segment who are active in this region each month." /></span>
              </th>
              <th className="text-right py-2 px-3 text-xs font-semibold text-nz-text-muted uppercase">
                <span className="flex items-center justify-end">% of Segment<InfoTooltip text="This region's MAU as a share of the segment's total addressable market across all regions." /></span>
              </th>
              <th className="text-right py-2 px-3 text-xs font-semibold text-nz-text-muted uppercase">
                Conv. Rate
                <InfoTooltip text="Conversion rate = adopters ÷ addressable in this region. Higher means your game resonates more with this segment in this market." />
              </th>
              <th className="text-right py-2 px-3 text-xs font-semibold text-nz-text-muted uppercase">
                Penetration Idx
                <InfoTooltip text="Index of 1.0 means average performance. Above 1.0 = over-indexing (opportunity to invest more). Below 1.0 = under-indexing (investigate why)." />
              </th>
              <th className="text-left py-2 px-3 text-xs font-semibold text-nz-text-muted uppercase">Top Markets</th>
            </tr>
          </thead>
          <tbody>
            {regionData.map((row, i) => {
              const penIdx = avgConv > 0 ? row.convRate / avgConv : 0;
              const isAboveAvg = row.convRate > avgConv;
              const isBelowAvg = row.convRate < avgConv * 0.95;
              return (
                <tr key={i} className="border-b border-nz-border last:border-0">
                  <td className="py-3 px-3 font-medium text-nz-text">{row.region}</td>
                  <td className="py-3 px-3 text-right text-nz-text">{formatNumber(row.addressable)}</td>
                  <td className="py-3 px-3 text-right text-nz-text">{formatNumber(row.adopters)}</td>
                  <td className="py-3 px-3 text-right font-semibold">
                    <span
                      className={
                        isAboveAvg
                          ? "text-green-600"
                          : isBelowAvg
                          ? "text-red-500"
                          : "text-nz-text-muted"
                      }
                    >
                      {row.convRate}%
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span
                      className={`text-xs font-bold ${
                        penIdx >= 1.05 ? "text-green-600" : penIdx <= 0.95 ? "text-orange-500" : "text-nz-text"
                      }`}
                    >
                      {penIdx.toFixed(2)}x
                    </span>
                  </td>
                  <td className="py-3 px-3 text-nz-text-secondary text-xs">
                    {row.topMarkets.join(", ")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Two separate charts */}
      <div className="grid grid-cols-2 gap-5 mb-5">
        {/* Chart 1: Addressable Market by Region */}
        <div className="bg-white rounded-lg border border-nz-border shadow-sm p-5">
          <div className="flex items-center gap-1 mb-4">
            <h3 className="text-sm font-semibold text-nz-text">Addressable Market by Region</h3>
            <InfoTooltip text="Absolute addressable market size per region in this segment. Use alongside % of Segment to compare both relative and absolute opportunity across markets." />
          </div>
          <div style={{ height: 250 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={regionData} margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="region" tick={{ fontSize: 10, fill: "#6B7280" }} />
                <YAxis tick={{ fontSize: 10, fill: "#6B7280" }} />
                <Tooltip
                  contentStyle={{ fontSize: 12, border: "1px solid #E5E7EB" }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(value: any) => [formatNumber(value), "Players"]}
                />
                <Bar dataKey="addressable" radius={[3, 3, 0, 0]} barSize={32} fill={segColor} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Conversion Rate by Region */}
        <div className="bg-white rounded-lg border border-nz-border shadow-sm p-5">
          <div className="flex items-center gap-1 mb-4">
            <h3 className="text-sm font-semibold text-nz-text">Conversion Rate by Region</h3>
            <InfoTooltip text="Regions above the line are over-performing. Consider increasing UA spend in these markets." />
          </div>
          <div style={{ height: 250 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={regionData} margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="region" tick={{ fontSize: 10, fill: "#6B7280" }} />
                <YAxis tick={{ fontSize: 10, fill: "#6B7280" }} unit="%" />
                <Tooltip
                  contentStyle={{ fontSize: 12, border: "1px solid #E5E7EB" }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(value: any) => [`${value}%`, "Conv. Rate"]}
                />
                <ReferenceLine
                  y={avgConv}
                  stroke="#6B7280"
                  strokeDasharray="4 4"
                  label={{
                    value: `Avg ${avgConv.toFixed(1)}%`,
                    position: "right",
                    fill: "#6B7280",
                    fontSize: 10,
                  }}
                />
                <Bar dataKey="convRate" radius={[3, 3, 0, 0]} barSize={32}>
                  {regionData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.convRate >= avgConv ? "#38A169" : "#EF4444"}
                      opacity={0.85}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Prior Behavior Sub-Tab ───

function PriorBehaviorSubTab({
  segId,
  segColor,
  projectTitle,
}: {
  segId: string;
  segColor: string;
  projectTitle: string;
}) {
  const topGames = topGamesPerSegment[segId]?.slice(0, 20) || [];
  const overlap30 = overlapIndex30DayPerSegment[segId]?.slice(0, 30) || [];
  const overlapLife = overlapIndexLifetimePerSegment[segId]?.slice(0, 25) || [];

  return (
    <>
      <p className="text-sm text-nz-text-secondary mb-5">
        Reveals which games players in this segment were playing before they discovered {projectTitle}.
        Use this to find partner titles for cross-promotion, identify UA targeting opportunities,
        and brief your media buying team.
      </p>

      <div className="grid grid-cols-2 gap-5 mb-5">
        {/* Chart 1: Top Games Played — uses segment color */}
        <div className="bg-white rounded-lg border border-nz-border shadow-sm p-5">
          <h3 className="text-sm font-semibold text-nz-text mb-4 flex items-center">
            Top Games Played in 30 Days Before Adoption
            <InfoTooltip text="Games most commonly played by this segment in the 30 days before they adopted titles in this category. Use this to identify cross-promotion partners and media targeting opportunities." />
          </h3>
          <div style={{ height: 500 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={topGames}
                layout="vertical"
                margin={{ top: 0, right: 20, left: 10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#6B7280" }} />
                <YAxis
                  type="category"
                  dataKey="title"
                  width={140}
                  tick={{ fontSize: 10, fill: "#6B7280" }}
                />
                <Tooltip
                  contentStyle={{ fontSize: 12, border: "1px solid #E5E7EB" }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(value: any, _name: any, props: any) => [
                    `${formatNumber(value)} adopters played this in the 30 days before adopting your title`,
                    props.payload.title,
                  ]}
                />
                <Bar dataKey="adopter_count" fill={segColor} radius={[0, 3, 3, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Overlap Index 30-Day — purple */}
        <div className="bg-white rounded-lg border border-nz-border shadow-sm p-5">
          <h3 className="text-sm font-semibold text-nz-text mb-4 flex items-center">
            Overlap Index &mdash; 30 Day Prior Window (Top 30)
            <InfoTooltip text="Measures how much more likely players in this segment are to have played each title in the 30 days before adoption, compared to the general panel. A score of 40 means 40x more likely." />
          </h3>
          <div style={{ height: 500 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={overlap30}
                layout="vertical"
                margin={{ top: 0, right: 20, left: 10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#6B7280" }} />
                <YAxis
                  type="category"
                  dataKey="title"
                  width={140}
                  tick={{ fontSize: 10, fill: "#6B7280" }}
                />
                <Tooltip
                  contentStyle={{ fontSize: 12, border: "1px solid #E5E7EB" }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(value: any) => [
                    `Overlap Index ${value} — ${Number(value) > 1 ? "players of this game are more likely than average to adopt your title" : "below average overlap"}`,
                    "Overlap Index",
                  ]}
                />
                <ReferenceLine x={1} stroke="#6B7280" strokeDasharray="4 4" />
                <Bar dataKey="overlap_index" fill="#805AD5" radius={[0, 3, 3, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Chart 3: Overlap Index Lifetime — different shade */}
      <div className="bg-white rounded-lg border border-nz-border shadow-sm p-5 mb-5">
        <h3 className="text-sm font-semibold text-nz-text mb-4 flex items-center">
          Overlap Index &mdash; Lifetime
          <InfoTooltip text="Same as the 30-day overlap index but across the player's full lifetime history. Useful for identifying deeper genre and franchise affinities beyond the pre-adoption window." />
        </h3>
        <div style={{ height: 600 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={overlapLife}
              layout="vertical"
              margin={{ top: 0, right: 20, left: 10, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: "#6B7280" }} />
              <YAxis
                type="category"
                dataKey="title"
                width={160}
                tick={{ fontSize: 11, fill: "#6B7280" }}
              />
              <Tooltip
                contentStyle={{ fontSize: 12, border: "1px solid #E5E7EB" }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any) => [
                  `Overlap Index ${value} — ${Number(value) > 1 ? "above average lifetime overlap" : "below average"}`,
                  "Lifetime Overlap Index",
                ]}
              />
              <ReferenceLine x={1} stroke="#6B7280" strokeDasharray="4 4" />
              <Bar dataKey="overlap_index" fill="#6B46C1" radius={[0, 3, 3, 0]} barSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
}

// ─── Generated Profile Sections (for non-kcd2 projects) ───

function GeneratedBehavioralSection({
  profile,
  segColor,
}: {
  profile: GeneratedProfile;
  segColor: string;
}) {
  const taxCategories = [
    { label: "Genres", items: profile.taxonomies.genres },
    { label: "Sub-Genres", items: profile.taxonomies.subGenres },
    { label: "Game Mechanics", items: profile.taxonomies.mechanics },
    { label: "Art Styles", items: profile.taxonomies.artStyles },
    { label: "Themes", items: profile.taxonomies.themes },
  ];

  return (
    <>
      <SectionHeader
        title="Behavioral Profile"
        badge="MONTHLY"
        badgeColor="#4F46E5"
      />

      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* MAU Card */}
        <div className="bg-white rounded-lg border border-nz-border p-4 shadow-sm">
          <div className="text-xs text-nz-text-muted mb-1 flex items-center">Monthly Active Users<InfoTooltip text="Total de-duplicated MAU for games matching this segment's behavioral rules. Powered by GPME individual user data." /></div>
          <div className="text-2xl font-bold text-nz-text">{formatNumber(profile.mau)}</div>
          <div className="text-[10px] text-nz-text-muted mt-0.5 mb-2">
            Total deduplicated MAU for games matching this segment
          </div>
          <div className="flex items-center gap-0 h-2 rounded-full overflow-hidden">
            <div className="h-full" style={{ width: `${profile.malePercent}%`, backgroundColor: "#4F46E5" }} />
            <div className="h-full" style={{ width: `${profile.femalePercent}%`, backgroundColor: "#F6A623" }} />
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[10px] font-medium" style={{ color: "#4F46E5" }}>{profile.malePercent}% Male</span>
            <span className="text-[10px] font-medium" style={{ color: "#F6A623" }}>{profile.femalePercent}% Female</span>
          </div>
        </div>

        {/* Avg Monthly Playtime Card */}
        <div className="bg-white rounded-lg border border-nz-border p-4 shadow-sm">
          <div className="text-xs text-nz-text-muted mb-1 flex items-center">Avg. Monthly Playtime (Hours)<InfoTooltip text="Average hours per month spent playing games that fit this segment's profile. Segment figure vs. platform average shown for context." /></div>
          <div className="text-2xl font-bold text-nz-text">{profile.avgMonthlyPlaytime}</div>
          <div className="text-[10px] text-nz-text-muted mt-0.5 mb-2">
            Hours spent on games fitting this segment, on average
          </div>
          <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{ width: `${Math.min((profile.avgMonthlyPlaytime / 40) * 100, 100)}%`, backgroundColor: segColor }}
            />
            <div
              className="absolute inset-y-0 w-0.5 bg-gray-500 z-10"
              style={{ left: `${Math.min((profile.platformAvgPlaytime / 40) * 100, 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[10px] font-medium" style={{ color: segColor }}>Segment: {profile.avgMonthlyPlaytime}h</span>
            <span className="text-[10px] text-nz-text-muted">
              Avg: {profile.platformAvgPlaytime}h
              {profile.avgMonthlyPlaytime > profile.platformAvgPlaytime && (
                <span className="text-green-600 font-semibold ml-1">
                  +{Math.round(((profile.avgMonthlyPlaytime - profile.platformAvgPlaytime) / profile.platformAvgPlaytime) * 100)}%
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Playtime Distribution Card */}
        <div className="bg-white rounded-lg border border-nz-border p-4 shadow-sm">
          <div className="text-xs text-nz-text-muted mb-3 flex items-center">Playtime Distribution<InfoTooltip text="Share of this segment's players who play more than 1hr / 5hrs / 10hrs / 25hrs / 50hrs per month. Grey = share of total panel. Green = share of this segment." /></div>
          <div className="space-y-1.5">
            {profile.playtimeDistribution.map((row) => (
              <div key={row.bucket} className="flex items-center gap-2">
                <span className="text-[10px] text-nz-text-muted w-10">{row.bucket}</span>
                <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden relative">
                  <div className="absolute inset-y-0 left-0 rounded-full opacity-30" style={{ width: `${row.totalShare}%`, backgroundColor: "#A0AEC0" }} />
                  <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${row.segmentShare}%`, backgroundColor: segColor }} />
                </div>
                <span className="text-[10px] font-semibold w-8 text-right" style={{ color: segColor }}>{row.segmentShare}%</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-2 pt-1 border-t border-nz-border">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full opacity-30" style={{ backgroundColor: "#A0AEC0" }} />
              <span className="text-[9px] text-nz-text-muted">Share of total</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: segColor }} />
              <span className="text-[9px] text-nz-text-muted">Share of segment</span>
            </div>
          </div>
        </div>
      </div>

      {/* Taxonomies */}
      <div className="bg-white rounded-lg border border-nz-border shadow-sm p-5 mb-6">
        <h4 className="text-sm font-semibold text-nz-text mb-1 flex items-center">
          Taxonomies that resonate with your Segment
          <InfoTooltip text="Top Genres, Sub-Genres, Game Mechanics, Art Styles, and Themes ranked by MAU among players in this segment. Use this to understand what this audience gravitates toward beyond your title." />
        </h4>
        <p className="text-xs text-nz-text-muted mb-4">Ranked on MAU</p>
        <div className="grid grid-cols-5 gap-4">
          {taxCategories.map((cat) => {
            const top3 = cat.items.slice(0, 3);
            const maxVal = Math.max(...top3.map((item) => item.mau));
            return (
              <div key={cat.label}>
                <div className="text-[10px] font-semibold text-nz-text-muted uppercase tracking-wider mb-3">{cat.label}</div>
                <div className="space-y-2.5">
                  {top3.map((item) => (
                    <TaxonomyBar key={item.name} label={item.name} value={item.mau} max={maxVal} color={segColor} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

function GeneratedDemographicSection({
  profile,
  segColor,
}: {
  profile: GeneratedProfile;
  segColor: string;
}) {
  const AGE_COLORS = ["#E5E7EB", "#E5E7EB", "#4F46E5", "#3644DB", "#2D38B8", "#A0AEC0"];
  const GENDER_COLORS = ["#4F46E5", "#F687B3", "#805AD5", "#A0AEC0"];
  const DEVICE_COLORS = ["#4F46E5", "#22C55E", "#F6A623", "#A0AEC0"];
  const maxAgePct = Math.max(...profile.age.map((a) => a.pct));

  return (
    <>
      <SectionHeader title="Demographic Profile" subtitle="Lifetime data — does not change by month" badge="LIFETIME" badgeColor="#6B7280" />
      <div className="grid grid-cols-2 gap-5 mb-6">
        {/* Age */}
        <div className="bg-white rounded-lg border border-nz-border p-5 shadow-sm">
          <div className="text-xs font-semibold text-nz-text-muted uppercase tracking-wider mb-4 flex items-center">Age Distribution<InfoTooltip text="Lifetime age breakdown of players in this segment based on GHT survey data. Does not change by month." /></div>
          <div className="flex items-end gap-2 h-32">
            {profile.age.map((a, i) => {
              const isDominant = a.pct === maxAgePct;
              return (
                <div key={a.bucket} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] font-semibold" style={{ color: isDominant ? segColor : "#6B7280" }}>{a.pct}%</span>
                  <div className="w-full rounded-t-md transition-all" style={{ height: `${(a.pct / maxAgePct) * 100}%`, minHeight: 4, backgroundColor: isDominant ? segColor : AGE_COLORS[i], border: isDominant ? `2px solid ${segColor}` : undefined }} />
                  <span className="text-[10px] text-nz-text-muted">{a.bucket}</span>
                </div>
              );
            })}
          </div>
        </div>
        {/* Gender */}
        <div className="bg-white rounded-lg border border-nz-border p-5 shadow-sm">
          <div className="text-xs font-semibold text-nz-text-muted uppercase tracking-wider mb-4 flex items-center">Gender Distribution<InfoTooltip text="Lifetime gender breakdown of players in this segment based on GHT survey data. Does not change by month." /></div>
          <div className="flex items-center gap-5">
            <DonutChart data={profile.gender} colors={GENDER_COLORS} />
            <div className="space-y-2">
              {profile.gender.map((g, i) => (
                <div key={g.label} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: GENDER_COLORS[i] }} />
                  <span className="text-xs text-nz-text-secondary">{g.label}</span>
                  <span className="text-xs font-semibold text-nz-text">{g.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* Devices */}
        <div className="bg-white rounded-lg border border-nz-border p-5 shadow-sm">
          <div className="text-xs font-semibold text-nz-text-muted uppercase tracking-wider mb-4">Device Ownership</div>
          <div className="space-y-3">
            {profile.devices.map((d, i) => (
              <div key={d.device}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-nz-text-secondary">{d.device}</span>
                  <span className="text-xs font-semibold text-nz-text">{d.pct}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${d.pct}%`, backgroundColor: DEVICE_COLORS[i] }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Regions */}
        <div className="bg-white rounded-lg border border-nz-border p-5 shadow-sm">
          <div className="text-xs font-semibold text-nz-text-muted uppercase tracking-wider mb-4">Region Distribution</div>
          <div className="space-y-3">
            {profile.regions.map((r) => (
              <div key={r.region}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-nz-text-secondary">{r.region}</span>
                  <span className="text-xs font-semibold text-nz-text">{r.pct}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${r.pct}%`, backgroundColor: segColor }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function GeneratedPsychographicSection({
  profile,
  segColor,
}: {
  profile: GeneratedProfile;
  segColor: string;
}) {
  return (
    <>
      <SectionHeader title="Psychographic Profile" subtitle="Lifetime data — does not change by month" badge="LIFETIME" badgeColor="#6B7280" />
      <div className="grid grid-cols-2 gap-5 mb-6">
        {/* Personas */}
        {profile.personas?.length > 0 && (
          <div className="bg-white rounded-lg border border-nz-border p-5 shadow-sm">
            <div className="text-xs font-semibold text-nz-text-muted uppercase tracking-wider mb-4">Gamer Persona Distribution</div>
            <div className="space-y-3">
              {profile.personas.map((p) => (
                <div key={p.persona}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-nz-text-secondary">{p.persona}</span>
                    <span className="text-xs font-semibold text-nz-text">{p.pct}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${p.pct}%`, backgroundColor: segColor }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* Motivations */}
        <div className="bg-white rounded-lg border border-nz-border p-5 shadow-sm">
          <div className="text-xs font-semibold text-nz-text-muted uppercase tracking-wider mb-4">Gaming Motivations</div>
          <div className="space-y-3">
            {profile.motivations.map((m) => (
              <div key={m.motivation}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-nz-text-secondary">{m.motivation}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-nz-text-muted">Avg {m.platformAvg}</span>
                    <span className="text-xs font-semibold" style={{ color: segColor }}>{m.segmentScore}</span>
                  </div>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden relative">
                  <div className="absolute inset-y-0 w-0.5 bg-gray-400 z-10" style={{ left: `${m.platformAvg}%` }} />
                  <div className="h-full rounded-full" style={{ width: `${m.segmentScore}%`, backgroundColor: segColor }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Player Values */}
        <div className="bg-white rounded-lg border border-nz-border p-5 shadow-sm">
          <div className="text-xs font-semibold text-nz-text-muted uppercase tracking-wider mb-4">Player Values</div>
          <div className="space-y-3">
            {profile.playerValues.map((v) => (
              <div key={v.value}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-nz-text-secondary">{v.value}</span>
                  <span className="text-xs font-semibold text-nz-text">{v.pct}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${v.pct}%`, backgroundColor: segColor }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Social Platforms */}
        <div className="bg-white rounded-lg border border-nz-border p-5 shadow-sm">
          <div className="flex items-center gap-1 mb-4">
            <div className="text-xs font-semibold text-nz-text-muted uppercase tracking-wider">Social Media Platforms</div>
            <InfoTooltip text="Use this to inform your content and influencer marketing channel strategy" />
          </div>
          <div className="space-y-2.5">
            {profile.socialPlatforms.map((sp) => (
              <div key={sp.platform} className="flex items-center gap-3">
                <span className="text-xs text-nz-text-secondary w-20">{sp.platform}</span>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${sp.pct}%`, backgroundColor: segColor }} />
                </div>
                <span className="text-xs font-semibold text-nz-text w-8 text-right">{sp.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function GeneratedPriorBehaviorSection({
  priorBehavior,
  segColor,
  projectTitle,
}: {
  priorBehavior: NonNullable<import("@/app/api/generate-profile/route").GeneratedProfile["priorBehavior"]>;
  segColor: string;
  projectTitle: string;
}) {
  const topGames = priorBehavior.topGames30dPrior.slice(0, 20);
  const overlap30 = priorBehavior.overlapIndex30d.slice(0, 30);
  const overlapLife = priorBehavior.overlapIndexLifetime.slice(0, 25);

  return (
    <>
      <p className="text-sm text-nz-text-secondary mb-5">
        Reveals which games players in this segment were playing before they discovered {projectTitle}.
        Use this to find partner titles for cross-promotion, identify UA targeting opportunities,
        and brief your media buying team.
      </p>

      <div className="grid grid-cols-2 gap-5 mb-5">
        <div className="bg-white rounded-lg border border-nz-border shadow-sm p-5">
          <h3 className="text-sm font-semibold text-nz-text mb-4 flex items-center">
            Top Games Played in 30 Days Before Adoption
            <InfoTooltip text="Games most commonly played by this segment in the 30 days before they adopted titles in this category. Use this to identify cross-promotion partners and media targeting opportunities." />
          </h3>
          <div style={{ height: 500 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topGames} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#6B7280" }} />
                <YAxis type="category" dataKey="title" width={140} tick={{ fontSize: 10, fill: "#6B7280" }} />
                <Tooltip
                  contentStyle={{ fontSize: 12, border: "1px solid #E5E7EB" }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(value: any, _name: any, props: any) => [
                    `${formatNumber(value)} adopters played this in the 30 days before adopting your title`,
                    props.payload.title,
                  ]}
                />
                <Bar dataKey="adopterCount" fill={segColor} radius={[0, 3, 3, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-nz-border shadow-sm p-5">
          <h3 className="text-sm font-semibold text-nz-text mb-4 flex items-center">
            Overlap Index &mdash; 30 Day Prior Window (Top 30)
            <InfoTooltip text="Measures how much more likely players in this segment are to have played each title in the 30 days before adoption, compared to the general panel. A score of 40 means 40x more likely." />
          </h3>
          <div style={{ height: 500 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={overlap30} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#6B7280" }} />
                <YAxis type="category" dataKey="title" width={140} tick={{ fontSize: 10, fill: "#6B7280" }} />
                <Tooltip
                  contentStyle={{ fontSize: 12, border: "1px solid #E5E7EB" }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(value: any) => [
                    `Overlap Index ${value} — ${Number(value) > 1 ? "players of this game are more likely than average to adopt your title" : "below average overlap"}`,
                    "Overlap Index",
                  ]}
                />
                <ReferenceLine x={1} stroke="#6B7280" strokeDasharray="4 4" />
                <Bar dataKey="overlapIndex" fill="#805AD5" radius={[0, 3, 3, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-nz-border shadow-sm p-5 mb-5">
        <h3 className="text-sm font-semibold text-nz-text mb-4 flex items-center">
          Overlap Index &mdash; Lifetime
          <InfoTooltip text="Same as the 30-day overlap index but across the player's full lifetime history. Useful for identifying deeper genre and franchise affinities beyond the pre-adoption window." />
        </h3>
        <div style={{ height: 600 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={overlapLife} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: "#6B7280" }} />
              <YAxis type="category" dataKey="title" width={160} tick={{ fontSize: 11, fill: "#6B7280" }} />
              <Tooltip
                contentStyle={{ fontSize: 12, border: "1px solid #E5E7EB" }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any) => [
                  `Overlap Index ${value} — ${Number(value) > 1 ? "above average lifetime overlap" : "below average"}`,
                  "Lifetime Overlap Index",
                ]}
              />
              <ReferenceLine x={1} stroke="#6B7280" strokeDasharray="4 4" />
              <Bar dataKey="overlapIndex" fill="#6B46C1" radius={[0, 3, 3, 0]} barSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
}

const PRE_LAUNCH_LIFECYCLES = ["Concept/Pre-Greenlight", "In Development", "Pre-Launch"];

function isPreLaunchLifecycle(lifecycle: string): boolean {
  const lc = lifecycle.toLowerCase();
  return lc.includes("greenlight") || lc.includes("concept") || lc.includes("development") || lc.includes("pre-launch") || lc.includes("prelaunch");
}

function PredictedBadge() {
  return (
    <span className="ml-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#FEF3E0] text-[#B96B00] uppercase">
      PREDICTED
    </span>
  );
}

function GeneratedConversionFunnel({
  segName,
  addressableMarket,
  conversionRate,
  totalTrackedUsers,
  segColor,
  lifecycle,
}: {
  segName: string;
  addressableMarket: number;
  conversionRate: number;
  totalTrackedUsers: number;
  segColor: string;
  lifecycle: string;
}) {
  const isPreLaunch = isPreLaunchLifecycle(lifecycle);
  const adopters = Math.round(addressableMarket * (conversionRate / 100));
  const stages = [
    { label: "Total Tracked", value: totalTrackedUsers, pct: 100 },
    { label: "Addressable", value: addressableMarket, pct: totalTrackedUsers > 0 ? (addressableMarket / totalTrackedUsers) * 100 : 0 },
    { label: "Adopters", value: adopters, pct: totalTrackedUsers > 0 ? (adopters / totalTrackedUsers) * 100 : 0 },
  ];

  const funnelTooltip = isPreLaunch
    ? "All figures are modelled projections based on benchmark conversion rates from comparable launched titles. Actual results will vary."
    : "Shows how many players in this segment converted to adopters. Use this to understand your segment's addressable opportunity and current penetration.";

  return (
    <>
      <SectionHeader title="Conversion Funnel" tooltip={funnelTooltip} />
      <div className="bg-white rounded-lg border border-nz-border p-6 mb-6 shadow-sm">
        <div className="space-y-3">
          {stages.map((stage, i) => {
            const widthPct = i === 0 ? 100 : Math.max((stage.value / stages[0].value) * 100, 6);
            const dropOff = i > 0 ? Math.round((1 - stage.value / stages[i - 1].value) * 100) : 0;
            return (
              <div key={stage.label}>
                <div className="flex items-center gap-4">
                  <div className="w-28 text-xs text-nz-text-secondary text-right flex items-center justify-end">
                    {stage.label}
                    {isPreLaunch && stage.label === "Adopters" && <PredictedBadge />}
                  </div>
                  <div className="flex-1 relative">
                    <div
                      className="h-10 rounded-lg flex items-center px-3 transition-all"
                      style={{ width: `${widthPct}%`, backgroundColor: segColor, opacity: 1 - i * 0.2, clipPath: i < stages.length - 1 ? "polygon(0 0, 98% 0, 100% 50%, 98% 100%, 0 100%)" : undefined }}
                    >
                      <span className="text-xs font-bold text-white">{formatNumber(stage.value)}</span>
                    </div>
                  </div>
                  <div className="w-16 text-xs font-semibold text-nz-text text-right">
                    {stage.pct < 1 && stage.pct > 0 ? stage.pct.toFixed(2) : Math.round(stage.pct)}%
                  </div>
                </div>
                {i > 0 && (
                  <div className="flex items-center gap-4 my-0.5">
                    <div className="w-28" />
                    <div className="text-[10px] text-nz-text-muted pl-2">&darr; {dropOff}% drop-off</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-4 pt-4 border-t border-nz-border flex items-center justify-between">
          <span className="text-xs text-nz-text-muted">Conversion Rate (Addressable &rarr; Adopters)</span>
          <span className="flex items-center">
            <span className="text-lg font-bold" style={{ color: segColor }}>{conversionRate}%</span>
            {isPreLaunch && <PredictedBadge />}
          </span>
        </div>
      </div>
    </>
  );
}

// ─── Generated Profile Content Wrapper ───

function GeneratedRegionSection({
  profile,
  segColor,
  addressableMarket,
}: {
  profile: GeneratedProfile;
  segColor: string;
  addressableMarket: number;
}) {
  const regionData = profile.regions.map((r) => ({
    region: r.region,
    pct: r.pct,
    mau: Math.round(addressableMarket * (r.pct / 100)),
  }));
  const maxMau = Math.max(...regionData.map((r) => r.mau), 1);

  return (
    <>
      <p className="text-sm text-nz-text-secondary mb-5">
        Geographic distribution of this segment&apos;s addressable market by region.
      </p>
      <div className="bg-white rounded-lg border border-nz-border shadow-sm p-5 mb-5">
        <h3 className="text-sm font-semibold text-nz-text mb-1">Top Markets by Monthly Active Users</h3>
        <p className="text-xs text-nz-text-muted mb-4">Share of segment&apos;s addressable market by region</p>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-nz-border">
              <th className="text-left py-2 px-3 text-xs font-semibold text-nz-text-muted uppercase">Region</th>
              <th className="text-right py-2 px-3 text-xs font-semibold text-nz-text-muted uppercase">MAU</th>
              <th className="text-right py-2 px-3 text-xs font-semibold text-nz-text-muted uppercase">% of Segment</th>
              <th className="py-2 px-3 text-xs font-semibold text-nz-text-muted uppercase w-48"></th>
            </tr>
          </thead>
          <tbody>
            {regionData.map((row) => (
              <tr key={row.region} className="border-b border-nz-border last:border-0">
                <td className="py-3 px-3 font-medium text-nz-text">{row.region}</td>
                <td className="py-3 px-3 text-right text-nz-text">{formatNumber(row.mau)}</td>
                <td className="py-3 px-3 text-right text-nz-text">{row.pct}%</td>
                <td className="py-3 px-3">
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${(row.mau / maxMau) * 100}%`, backgroundColor: segColor }}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Bar chart */}
      <div className="bg-white rounded-lg border border-nz-border shadow-sm p-5 mb-5">
        <h3 className="text-sm font-semibold text-nz-text mb-4">Addressable Market by Region</h3>
        <div style={{ height: 250 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={regionData} margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="region" tick={{ fontSize: 10, fill: "#6B7280" }} />
              <YAxis tick={{ fontSize: 10, fill: "#6B7280" }} />
              <Tooltip
                contentStyle={{ fontSize: 12, border: "1px solid #E5E7EB" }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any) => [formatNumber(value), "Players"]}
              />
              <Bar dataKey="mau" radius={[3, 3, 0, 0]} barSize={32} fill={segColor} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
}

function GeneratedProfileContent({
  projectId,
  segIdx,
  segColor,
  segName,
  addressableMarket,
  conversionRate,
  totalTrackedUsers,
  projectTitle,
  lifecycle,
  platforms,
  activeSubTab,
}: {
  projectId: string;
  segIdx: number;
  segColor: string;
  segName: string;
  addressableMarket: number;
  conversionRate: number;
  totalTrackedUsers: number;
  projectTitle: string;
  lifecycle: string;
  platforms: string[];
  activeSubTab: SubTab;
}) {
  const [profile, setProfile] = useState<GeneratedProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cacheKey = `project_${projectId}_profile_${segIdx}`;

  const generateProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Read segment rules from localStorage
      let rules = { playRules: [] as Array<{ entityType: string; entityValue: string; ruleType: string; minHours: number }>, demoRules: [] as Array<{ attribute: string; value: string }>, psychoRules: [] as Array<{ attribute: string; value: string }>, moneyRules: [] as Array<{ ruleType: string }> };
      try {
        const builderData = localStorage.getItem(`project_${projectId}_segments`);
        if (builderData) {
          const cols = JSON.parse(builderData);
          if (cols[segIdx]) {
            rules = {
              playRules: (cols[segIdx].playRules || []).filter((r: { entityValue?: string }) => r.entityValue),
              demoRules: (cols[segIdx].demoRules || []).filter((r: { value?: string }) => r.value),
              psychoRules: (cols[segIdx].psychoRules || []).filter((r: { value?: string }) => r.value),
              moneyRules: cols[segIdx].moneyRules || [],
            };
          }
        }
      } catch { /* ignore */ }

      const res = await fetch("/api/generate-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          segmentName: segName,
          segmentIndex: segIdx,
          addressableMarket,
          conversionRate,
          rules,
          projectTitle,
          lifecycle,
          platforms,
        }),
      });

      if (!res.ok) throw new Error("Failed to generate profile");
      const data = await res.json();
      const generated = data.profile as GeneratedProfile;
      setProfile(generated);
      // Cache
      try { localStorage.setItem(cacheKey, JSON.stringify(generated)); } catch { /* ignore */ }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [projectId, segIdx, segName, addressableMarket, conversionRate, projectTitle, lifecycle, platforms, cacheKey]);

  useEffect(() => {
    // Try loading from cache first
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached) as GeneratedProfile;
        if (parsed.mau) {
          setProfile(parsed);
          return;
        }
      }
    } catch { /* ignore */ }

    // Auto-generate
    generateProfile();
  }, [cacheKey, generateProfile]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-nz-border shadow-sm p-12 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-50 mb-4">
          <svg className="w-6 h-6 text-nz-primary animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
        <h3 className="text-sm font-semibold text-nz-text mb-1">Generating Segment Profile</h3>
        <p className="text-sm text-nz-text-muted">Analyzing {segName}...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="bg-white rounded-lg border border-nz-border shadow-sm p-8 text-center">
        <p className="text-sm text-red-500 mb-3">{error || "Failed to generate profile"}</p>
        <button
          onClick={generateProfile}
          className="px-4 py-2 bg-nz-primary text-white text-sm font-medium rounded-lg hover:bg-nz-primary/90"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <>
      {activeSubTab === "overview" && (
        <>
          <GeneratedBehavioralSection profile={profile} segColor={segColor} />
          <GeneratedDemographicSection profile={profile} segColor={segColor} />
          <GeneratedConversionFunnel
            segName={segName}
            addressableMarket={addressableMarket}
            conversionRate={conversionRate}
            totalTrackedUsers={totalTrackedUsers}
            segColor={segColor}
            lifecycle={lifecycle}
          />
        </>
      )}
      {activeSubTab === "region" && (
        <GeneratedRegionSection
          profile={profile}
          segColor={segColor}
          addressableMarket={addressableMarket}
        />
      )}
      {activeSubTab === "prior" && (
        profile.priorBehavior ? (
          <GeneratedPriorBehaviorSection priorBehavior={profile.priorBehavior} segColor={segColor} projectTitle={projectTitle} />
        ) : (
          <GeneratedPsychographicSection profile={profile} segColor={segColor} />
        )
      )}
    </>
  );
}

// ─── Main Page ───

export default function ProfilePage() {
  const params = useParams();
  const projectId = params.id as string;
  const project = useProjectStore((s) => s.projects.find((p) => p.id === projectId));
  const projectTitle = project?.title ?? "Project";

  const isKcd2 = projectId === "kcd2";

  // For kcd2: use full mockData segments (with ids that map to mock detail data)
  // For others: build segment objects from the store
  const projectSegments = isKcd2
    ? segments
    : (project?.segments || []).map((s, i) => ({
        id: `seg-${i}`,
        name: s.name,
        tier: s.tier,
        color: s.color || SEGMENT_COLORS[i] || SEGMENT_COLORS[0],
        addressableMarket: s.addressableMarket,
        conversionRate: s.conversionRate,
        adopters: s.addressableMarket > 0 && s.conversionRate > 0
          ? Math.round(s.addressableMarket * (s.conversionRate / 100))
          : 0,
        avgPlaytimeHours: 0,
      }));

  const [activeSegIdx, setActiveSegIdx] = useState(0);
  const [activeSubTab, setActiveSubTab] = useState<SubTab>("overview");

  const activeSeg = projectSegments[activeSegIdx] || projectSegments[0];
  const activeColor = SEGMENT_COLORS[activeSegIdx] || SEGMENT_COLORS[0];


  const subTabs: { id: SubTab; label: string; tooltip: string }[] = [
    {
      id: "overview",
      label: "Overview",
      tooltip:
        "A full behavioral, demographic and psychographic profile of this segment. Behavioral data is monthly; demographic and psychographic data reflects lifetime patterns.",
    },
    {
      id: "region",
      label: "Region / Market",
      tooltip:
        "Geographic breakdown of this segment's addressable market and conversion performance. Use this to prioritize regional UA spend and identify under-indexed markets.",
    },
    {
      id: "prior",
      label: "Prior Behavior",
      tooltip:
        "Games this segment played before adopting your title. Use this to identify where to find more of these players — which games, platforms and publishers to target.",
    },
  ];

  return (
    <div>
      <TopNav
        breadcrumbs={[
          { label: "Workspace", href: "/dashboard" },
          { label: projectTitle },
          { label: "Profile" },
        ]}
        title="Segment Profile"
      />

      <div className="p-6">
        {/* Primary nav: Segment tabs — prominent pill buttons */}
        <div className="flex items-center gap-2 mb-5">
          {projectSegments.map((seg, i) => {
            const isActive = i === activeSegIdx;
            return (
              <button
                key={seg.id}
                onClick={() => {
                  setActiveSegIdx(i);
                  setActiveSubTab("overview");
                }}
                className="px-5 py-2 rounded-full text-sm font-semibold transition-all border-2"
                style={
                  isActive
                    ? {
                        backgroundColor: SEGMENT_COLORS[i],
                        borderColor: SEGMENT_COLORS[i],
                        color: "#fff",
                      }
                    : {
                        backgroundColor: "#fff",
                        borderColor: SEGMENT_COLORS[i],
                        color: SEGMENT_COLORS[i],
                      }
                }
              >
                {seg.name}
              </button>
            );
          })}
        </div>

        {/* Sub-tabs with ⓘ tooltips */}
        <div className="flex items-center gap-6 border-b border-nz-border mb-6">
          {subTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`pb-3 text-sm font-medium transition-colors border-b-2 -mb-px flex items-center ${
                activeSubTab === tab.id
                  ? "text-nz-text"
                  : "border-transparent text-nz-text-secondary hover:text-nz-text"
              }`}
              style={
                activeSubTab === tab.id
                  ? { borderColor: activeColor, color: activeColor }
                  : undefined
              }
            >
              {tab.label}
              <InfoTooltip text={tab.tooltip} />
            </button>
          ))}
        </div>

        {/* Content */}
        {isKcd2 ? (
          <>
            {activeSubTab === "overview" && (
              <OverviewSubTab segId={activeSeg.id} segColor={activeColor} />
            )}
            {activeSubTab === "region" && (
              <RegionSubTab segId={activeSeg.id} segColor={activeColor} />
            )}
            {activeSubTab === "prior" && (
              <PriorBehaviorSubTab
                segId={activeSeg.id}
                segColor={activeColor}
                projectTitle={projectTitle}
              />
            )}
          </>
        ) : !activeSeg || projectSegments.length === 0 ? (
          <div className="bg-white rounded-lg border border-nz-border shadow-sm p-8 text-center">
            <h3 className="text-sm font-semibold text-nz-text mb-2">No segments defined</h3>
            <p className="text-sm text-nz-text-muted">
              Go to the Segment Builder to create and analyze segments for this project.
            </p>
          </div>
        ) : activeSeg.addressableMarket > 0 ? (
          <GeneratedProfileContent
            key={`${projectId}-${activeSegIdx}`}
            projectId={projectId}
            segIdx={activeSegIdx}
            segColor={activeColor}
            segName={activeSeg.name}
            addressableMarket={activeSeg.addressableMarket}
            conversionRate={activeSeg.conversionRate}
            totalTrackedUsers={project?.totalTrackedUsers ?? 0}
            projectTitle={projectTitle}
            lifecycle={project?.lifecycle ?? ""}
            platforms={project?.platforms ?? []}
            activeSubTab={activeSubTab}
          />
        ) : (
          <div className="bg-white rounded-lg border border-nz-border shadow-sm p-8 text-center">
            <div className="mb-3">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100">
                <svg className="w-6 h-6 text-nz-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <h3 className="text-sm font-semibold text-nz-text mb-1">{activeSeg.name}</h3>
            <p className="text-sm text-nz-text-muted max-w-md mx-auto">
              Run Analysis in the Segment Builder to generate a full profile for this segment.
              Once analyzed, behavioral, demographic, and psychographic insights will appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
