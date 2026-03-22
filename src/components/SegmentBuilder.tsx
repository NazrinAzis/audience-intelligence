"use client";

import { useState, useRef, useEffect } from "react";
import { useVersion } from "@/contexts/VersionContext";
import { scopedKey } from "@/lib/versionedStorage";
import {
  RULE_ENTITIES,
  ENTITY_TYPE_OPTIONS,
  SAMPLE_TITLES,
  DEMOGRAPHIC_ATTRIBUTES,
  PSYCHOGRAPHIC_ATTRIBUTES,
  SPEND_CATEGORIES,
  PURCHASE_TYPES,
  PURCHASE_TIMEFRAMES,
  ATTRIBUTE_PLURALS,
  ENTITY_TYPE_PLURALS,
  type RuleEntityType,
} from "@/lib/taxonomy";

// ─── Multi-value helpers ───

const MULTI_VALUE_DELIMITER = "||";

export function parseMultiValue(s: string): string[] {
  if (!s) return [];
  return s.split(MULTI_VALUE_DELIMITER).filter(Boolean);
}

export function joinMultiValue(arr: string[]): string {
  return arr.filter(Boolean).join(MULTI_VALUE_DELIMITER);
}

// ─── Types ───

export interface QueryRule {
  id: number;
  ruleType: "played" | "not_played" | "played_n_games";
  entityType: RuleEntityType;
  entityValue: string;
  minHours: number;
  gameCount: number;
}

export interface DemographicRule {
  id: number;
  attribute: string;
  value: string;
}

export interface PsychographicRule {
  id: number;
  attribute: string;
  value: string;
}

export interface MonetizationRule {
  id: number;
  ruleType: "spend_comparison" | "purchase_history";
  comparison?: "more" | "less" | "between";
  amount?: number;
  amountHigh?: number;
  category?: string;
  purchased?: boolean;
  purchaseType?: string;
  timeframeDays?: number;
}

export interface SegmentColumn {
  name: string;
  // Quadrant 1: WHAT THEY PLAY
  playRules: QueryRule[];
  playConnector: "AND" | "OR";
  // Quadrant 2: WHO THEY ARE
  demoRules: DemographicRule[];
  demoConnector: "AND" | "OR";
  // Quadrant 3: WHY THEY PLAY
  psychoRules: PsychographicRule[];
  psychoConnector: "AND" | "OR";
  // Quadrant 4: WHAT THEY PAY
  moneyRules: MonetizationRule[];
  moneyConnector: "AND" | "OR";
  // Cross-section connector
  sectionConnector: "AND" | "OR";
  // Exclude (play section only)
  excludeRules: QueryRule[];
  excludeConnector: "AND" | "OR";
  // Collapsed state
  collapsedSections: { play: boolean; demo: boolean; psycho: boolean; money: boolean };
  // Results
  analyzed: boolean;
  loading: boolean;
  size: number;
  convRate: number;
  gamesCount: number;
  // Benchmark data
  benchmarkConvLow: number;
  benchmarkConvMid: number;
  benchmarkConvHigh: number;
  comparableTitles: { title: string; genre: string; year: number; convRate: number; similarity: number }[];
  confidence: "High" | "Medium" | "Low";
  // Intelligence
  notes: string;
  suggestedName: string;
}

// ─── Constants ───

const SEGMENT_COLORS = ["#4F46E5", "#22C55E", "#F6A623", "#805AD5", "#A0AEC0"];
const TIERS = ["Core", "Secondary", "Tertiary", "Quaternary", "Additional"] as const;

const QUADRANT_STYLES = {
  play: { pillBg: "#F0FDF9", pillColor: "#00C9A7", pillBorder: "rgba(0,201,167,0.25)", label: "WHAT THEY PLAY" },
  demo: { pillBg: "#EFF6FF", pillColor: "#3B82F6", pillBorder: "rgba(59,130,246,0.2)", label: "WHO THEY ARE" },
  psycho: { pillBg: "#FAF5FF", pillColor: "#805AD5", pillBorder: "rgba(128,90,213,0.2)", label: "WHY THEY PLAY" },
  money: { pillBg: "#FFFBEB", pillColor: "#F59E0B", pillBorder: "rgba(245,158,11,0.2)", label: "WHAT THEY PAY" },
} as const;

let _ruleIdCounter = 0;
export const emptyRule = (): QueryRule => ({
  id: ++_ruleIdCounter,
  ruleType: "played",
  entityType: "genre",
  entityValue: "",
  minHours: 0,
  gameCount: 3,
});

export const emptyColumn = (index: number): SegmentColumn => ({
  name: `Segment ${index + 1}`,
  playRules: [emptyRule()],
  playConnector: "AND",
  demoRules: [],
  demoConnector: "AND",
  psychoRules: [],
  psychoConnector: "AND",
  moneyRules: [],
  moneyConnector: "AND",
  sectionConnector: "AND",
  excludeRules: [],
  excludeConnector: "AND",
  collapsedSections: { play: false, demo: true, psycho: true, money: true },
  analyzed: false,
  loading: false,
  size: 0,
  convRate: 0,
  gamesCount: 0,
  benchmarkConvLow: 0,
  benchmarkConvMid: 0,
  benchmarkConvHigh: 0,
  comparableTitles: [],
  confidence: "Medium",
  notes: "",
  suggestedName: "",
});

// Migration from old format
export function migrateColumn(old: Record<string, unknown>): SegmentColumn {
  const defaults = emptyColumn(0);
  if ("playRules" in old) {
    // Ensure benchmark fields exist (old localStorage data may lack them)
    return {
      ...defaults,
      ...(old as unknown as SegmentColumn),
      comparableTitles: (old.comparableTitles as SegmentColumn["comparableTitles"]) ?? [],
      benchmarkConvLow: (old.benchmarkConvLow as number) ?? 0,
      benchmarkConvMid: (old.benchmarkConvMid as number) ?? 0,
      benchmarkConvHigh: (old.benchmarkConvHigh as number) ?? 0,
      confidence: (old.confidence as SegmentColumn["confidence"]) ?? "Medium",
    };
  }
  return {
    ...defaults,
    name: (old.name as string) || "Segment",
    playRules: (old.includeRules as QueryRule[]) || [emptyRule()],
    playConnector: (old.includeConnector as "AND" | "OR") || "AND",
    excludeRules: (old.excludeRules as QueryRule[]) || [],
    excludeConnector: (old.excludeConnector as "AND" | "OR") || "AND",
    analyzed: (old.analyzed as boolean) || false,
    size: (old.size as number) || 0,
    convRate: (old.convRate as number) || 0,
    gamesCount: (old.gamesCount as number) || 0,
  };
}

// ─── Heuristic estimates ───

/** Deterministic hash → [0, 1) so render is stable across SSR/client. */
function stableHash(str: string): number {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  }
  return ((h >>> 0) % 10000) / 10000;
}

function multiValueExpansion(baseFactor: number, valueCount: number): number {
  // First value: normal factor. Each additional value widens via diminishing returns.
  if (valueCount <= 1) return baseFactor;
  return baseFactor * (1 + 0.15 * (valueCount - 1));
}

function estimateSegmentSize(col: SegmentColumn): number {
  const playFilled = col.playRules.filter((r) => r.entityValue);
  const demoFilled = col.demoRules.filter((r) => r.value);
  const psychoFilled = col.psychoRules.filter((r) => r.value);
  const moneyFilled = col.moneyRules;
  const totalFilled = playFilled.length + demoFilled.length + psychoFilled.length + moneyFilled.length;
  if (totalFilled === 0) return 0;

  let base = 820_000;

  for (let ri = 0; ri < playFilled.length; ri++) {
    const rule = playFilled[ri];
    const nValues = parseMultiValue(rule.entityValue).length;
    const h = stableHash(`play-${ri}-${rule.entityType}-${rule.entityValue}`);
    const factor = multiValueExpansion(0.50 + h * 0.15, nValues);
    base *= Math.min(factor, 1);
    if (rule.minHours > 0) base *= Math.max(0.1, 1 - rule.minHours * 0.01);
  }

  for (let ri = 0; ri < demoFilled.length; ri++) {
    const rule = demoFilled[ri];
    const nValues = parseMultiValue(rule.value).length;
    const h = stableHash(`demo-${ri}-${rule.attribute}-${rule.value}`);
    const factor = multiValueExpansion(0.75 + h * 0.10, nValues);
    base *= Math.min(factor, 1);
  }

  for (let ri = 0; ri < psychoFilled.length; ri++) {
    const rule = psychoFilled[ri];
    const nValues = parseMultiValue(rule.value).length;
    const h = stableHash(`psycho-${ri}-${rule.attribute}-${rule.value}`);
    const factor = multiValueExpansion(0.80 + h * 0.10, nValues);
    base *= Math.min(factor, 1);
  }

  for (let ri = 0; ri < moneyFilled.length; ri++) {
    const rule = moneyFilled[ri];
    const nValues = parseMultiValue(rule.category || "").length || 1;
    const h = stableHash(`money-${ri}-${rule.ruleType}-${rule.category || ""}`);
    const factor = multiValueExpansion(0.70 + h * 0.10, nValues);
    base *= Math.min(factor, 1);
  }

  // Cross-section OR widens
  if (col.sectionConnector === "OR") {
    const activeSections = [playFilled.length, demoFilled.length, psychoFilled.length, moneyFilled.length].filter((n) => n > 0).length;
    const h = stableHash(`or-${col.name}-${totalFilled}`);
    if (activeSections > 1) base *= 1.15 + h * 0.10;
  }

  return Math.max(500, Math.min(820_000, Math.round(base)));
}

export function estimateGameCount(rules: QueryRule[]): number {
  const filled = rules.filter((r) => r.entityValue);
  if (filled.length === 0) return 0;
  const h = stableHash(`gc-${filled.map((r) => r.entityValue).join(",")}`);
  return Math.max(5, Math.round(30 + filled.length * 25 + h * 60));
}

function getMatchedTitles(rules: QueryRule[]): string[] {
  if (rules.length === 0) return [];
  // Simple matching: return titles that loosely relate to rule entity values
  const filled = rules.filter((r) => r.entityValue);
  if (filled.length === 0) return [];
  // Return a deterministic subset based on rule count
  const count = Math.min(SAMPLE_TITLES.length, 5 + filled.length * 8);
  return [...SAMPLE_TITLES].slice(0, count);
}

// ─── Health computation ───

type HealthStatus = "strong" | "weak" | "overlapping" | "not_run";

function computeHealth(col: SegmentColumn, allCols: SegmentColumn[]): HealthStatus {
  if (!col.analyzed) return "not_run";
  if (col.size < 2000 || col.convRate < 1) return "weak";

  // Check overlap with other analyzed segments (split multi-values)
  const myPlayValues = new Set(
    col.playRules.filter((r) => r.entityValue).flatMap((r) => parseMultiValue(r.entityValue))
  );
  if (myPlayValues.size > 0) {
    for (const other of allCols) {
      if (other === col || !other.analyzed) continue;
      const otherPlayValues = new Set(
        other.playRules.filter((r) => r.entityValue).flatMap((r) => parseMultiValue(r.entityValue))
      );
      if (otherPlayValues.size === 0) continue;
      const intersection = Array.from(myPlayValues).filter((v) => otherPlayValues.has(v));
      if (intersection.length / myPlayValues.size > 0.4) return "overlapping";
    }
  }

  if (col.size > 10000 && col.convRate > 5) return "strong";
  return "strong"; // default if analyzed and not weak/overlapping
}

const HEALTH_BADGES: Record<HealthStatus, { emoji: string; color: string; label: string }> = {
  strong: { emoji: "\u{1F7E2}", color: "#276749", label: "Strong: size > 10K and conv > 5%" },
  weak: { emoji: "\u{1F7E1}", color: "#B7791F", label: "Weak: size < 2K or conv < 1%" },
  overlapping: { emoji: "\u{1F534}", color: "#C53030", label: "Overlapping: >40% play-rule overlap with another segment" },
  not_run: { emoji: "\u26AA", color: "#6B7280", label: "Not analyzed yet" },
};

// ─── Tier auto-assignment ───

function assignTiers(columns: SegmentColumn[]): { tier: string; color: string }[] {
  const analyzed = columns
    .map((col, i) => ({ col, i }))
    .filter(({ col }) => col.analyzed);

  analyzed.sort((a, b) => b.col.convRate - a.col.convRate);

  const assignments: { tier: string; color: string }[] = columns.map(() => ({
    tier: "",
    color: "#A0AEC0",
  }));

  analyzed.forEach(({ i }, rank) => {
    assignments[i] = {
      tier: TIERS[Math.min(rank, TIERS.length - 1)],
      color: SEGMENT_COLORS[Math.min(rank, SEGMENT_COLORS.length - 1)],
    };
  });

  return assignments;
}

// ─── Searchable Dropdown ───

function PillDropdown({
  value,
  options,
  onChange,
  placeholder,
  pillBg,
  pillColor,
  pillBorder,
  searchable = false,
}: {
  value: string;
  options: readonly string[] | string[];
  onChange: (v: string) => void;
  placeholder?: string;
  pillBg?: string;
  pillColor?: string;
  pillBorder?: string;
  searchable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = search
    ? options.filter((o) => o.toLowerCase().includes(search.toLowerCase()))
    : options;

  const bg = pillBg || "#EEF2FF";
  const color = pillColor || "#4F46E5";
  const border = pillBorder || "rgba(79,70,229,0.25)";

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1 px-3 py-1 text-[11px] font-medium rounded-full border transition-colors"
        style={
          open
            ? { backgroundColor: bg, borderColor: border, color }
            : { backgroundColor: "white", borderColor: "#E5E7EB", color: "#4A5568" }
        }
      >
        {value || placeholder || "Select..."}
        <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-56 bg-white border border-[#E5E7EB] rounded-lg shadow-lg overflow-hidden" style={{ left: 0 }}>
          {searchable && (
            <div className="p-2 border-b border-[#E5E7EB]">
              <input
                type="text"
                autoFocus
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-2 py-1.5 text-xs border border-[#E5E7EB] rounded focus:outline-none focus:border-[#4F46E5]"
              />
            </div>
          )}
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 && (
              <div className="px-3 py-2 text-xs text-[#6B7280]">No results</div>
            )}
            {filtered.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                  setSearch("");
                }}
                className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                  opt === value
                    ? "font-medium"
                    : "text-[#4A5568] hover:bg-[#F5F6F8]"
                }`}
                style={opt === value ? { backgroundColor: bg, color } : undefined}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Multi-Select Dropdown ───

function MultiPillDropdown({
  values,
  options,
  onChange,
  placeholder,
  pillBg,
  pillColor,
  pillBorder,
  searchable = false,
  attributeLabel,
}: {
  values: string[];
  options: readonly string[] | string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  pillBg?: string;
  pillColor?: string;
  pillBorder?: string;
  searchable?: boolean;
  attributeLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = search
    ? options.filter((o) => o.toLowerCase().includes(search.toLowerCase()))
    : options;

  const bg = pillBg || "#EEF2FF";
  const color = pillColor || "#4F46E5";
  const border = pillBorder || "rgba(79,70,229,0.25)";

  const valSet = new Set(values);

  // Pill display text
  let displayText = placeholder || "Select...";
  if (values.length === 1) displayText = values[0];
  else if (values.length === 2) displayText = values.join(", ");
  else if (values.length >= 3) displayText = `${values.length} ${attributeLabel || "selected"}`;

  const tooltipText = values.length > 0 ? values.join(" OR ") : "";

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1 px-3 py-1 text-[11px] font-medium rounded-full border transition-colors"
        style={
          open || values.length > 0
            ? { backgroundColor: bg, borderColor: border, color }
            : { backgroundColor: "white", borderColor: "#E5E7EB", color: "#4A5568" }
        }
        title={tooltipText}
      >
        {displayText}
        <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-56 bg-white border border-[#E5E7EB] rounded-lg shadow-lg overflow-hidden" style={{ left: 0 }}>
          {searchable && (
            <div className="p-2 border-b border-[#E5E7EB]">
              <input
                type="text"
                autoFocus
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-2 py-1.5 text-xs border border-[#E5E7EB] rounded focus:outline-none focus:border-[#4F46E5]"
              />
            </div>
          )}
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 && (
              <div className="px-3 py-2 text-xs text-[#6B7280]">No results</div>
            )}
            {filtered.map((opt) => {
              const checked = valSet.has(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    if (checked) {
                      onChange(values.filter((v) => v !== opt));
                    } else {
                      onChange([...values, opt]);
                    }
                  }}
                  className={`w-full text-left px-3 py-1.5 text-xs transition-colors flex items-center gap-2 ${
                    checked ? "font-medium" : "text-[#4A5568] hover:bg-[#F5F6F8]"
                  }`}
                  style={checked ? { backgroundColor: bg, color } : undefined}
                >
                  <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                    checked ? "border-current" : "border-[#E5E7EB]"
                  }`}>
                    {checked && (
                      <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </span>
                  {opt}
                </button>
              );
            })}
          </div>
          <div className="flex items-center justify-between px-3 py-2 border-t border-[#E5E7EB]">
            {values.length > 0 ? (
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-[10px] text-red-400 hover:text-red-600 font-medium"
              >
                Clear
              </button>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={() => { setOpen(false); setSearch(""); }}
              className="px-3 py-1 text-[10px] font-semibold rounded-full text-white"
              style={{ backgroundColor: color }}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Connector pill (AND / OR) ───

function ConnectorPill({
  value,
  onChange,
}: {
  value: "AND" | "OR";
  onChange: (v: "AND" | "OR") => void;
}) {
  return (
    <div className="flex items-center justify-center my-1">
      <button
        type="button"
        onClick={() => onChange(value === "AND" ? "OR" : "AND")}
        className={`px-3 py-0.5 text-[10px] font-bold rounded-full border transition-colors ${
          value === "AND"
            ? "bg-[#EEF2FF] border-[#4F46E5] text-[#4F46E5]"
            : "bg-orange-50 border-orange-400 text-orange-500"
        }`}
      >
        {value}
      </button>
    </div>
  );
}

// ─── Cross-Section Connector ───

function CrossSectionConnector({
  value,
  onChange,
}: {
  value: "AND" | "OR";
  onChange: (v: "AND" | "OR") => void;
}) {
  return (
    <div className="flex items-center gap-2 my-2">
      <div className="flex-1 h-px bg-[#E5E7EB]" />
      <button
        type="button"
        onClick={() => onChange(value === "AND" ? "OR" : "AND")}
        className={`px-3 py-0.5 text-[10px] font-bold rounded-full border transition-colors ${
          value === "AND"
            ? "bg-[#EEF2FF] border-[#4F46E5] text-[#4F46E5]"
            : "bg-orange-50 border-orange-400 text-orange-500"
        }`}
      >
        {value}
      </button>
      <div className="flex-1 h-px bg-[#E5E7EB]" />
    </div>
  );
}

// ─── Section Header ───

function SectionHeader({
  quadrant,
  ruleCount,
  collapsed,
  onToggle,
}: {
  quadrant: keyof typeof QUADRANT_STYLES;
  ruleCount: number;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const style = QUADRANT_STYLES[quadrant];
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center gap-2 py-2 group"
      style={{ borderLeft: `4px solid ${style.pillColor}`, paddingLeft: "10px" }}
    >
      <span
        className="text-xs font-heading font-semibold uppercase tracking-wider"
        style={{ color: style.pillColor }}
      >
        {style.label}
      </span>
      {ruleCount > 0 && (
        <span
          className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
          style={{ backgroundColor: style.pillBg, color: style.pillColor }}
        >
          {ruleCount}
        </span>
      )}
      <span className="ml-auto text-xs text-nz-text-muted">{collapsed ? "\u25B8" : "\u25BE"}</span>
    </button>
  );
}

// ─── Play Rule Row (existing logic, with quadrant-colored pills) ───

function PlayRuleRow({
  rule,
  onChange,
  onDelete,
  isExclude,
}: {
  rule: QueryRule;
  onChange: (updated: QueryRule) => void;
  onDelete: () => void;
  isExclude: boolean;
}) {
  const entityDef = RULE_ENTITIES.find((e) => e.type === rule.entityType);
  const valueOptions = entityDef?.values ?? [];
  const entityLabel = ENTITY_TYPE_OPTIONS.find((e) => e.type === rule.entityType)?.label ?? "Genre";
  const qs = isExclude
    ? { pillBg: "#FFF5F5", pillColor: "#C53030", pillBorder: "rgba(197,48,48,0.2)" }
    : QUADRANT_STYLES.play;

  return (
    <div className="flex items-start gap-2 group">
      <div className="flex-1 text-[12px] text-[#4A5568] leading-relaxed flex flex-wrap items-center gap-1.5">
        {rule.ruleType === "played_n_games" ? (
          <>
            <span className="text-[11px] text-[#6B7280]">Played more than</span>
            <input
              type="number"
              min={1}
              value={rule.gameCount}
              onChange={(e) => onChange({ ...rule, gameCount: Math.max(1, parseInt(e.target.value) || 1) })}
              className="w-12 px-1.5 py-0.5 text-[11px] text-center border border-[#E5E7EB] rounded-full focus:outline-none focus:border-[#4F46E5]"
            />
            <span className="text-[11px] text-[#6B7280]">games in</span>
            <PillDropdown
              value={entityLabel}
              options={ENTITY_TYPE_OPTIONS.map((e) => e.label)}
              onChange={(label) => {
                const et = ENTITY_TYPE_OPTIONS.find((e) => e.label === label);
                if (et) onChange({ ...rule, entityType: et.type, entityValue: "" });
              }}
              pillBg={qs.pillBg}
              pillColor={qs.pillColor}
              pillBorder={qs.pillBorder}
              searchable
            />
            <MultiPillDropdown
              values={parseMultiValue(rule.entityValue)}
              options={valueOptions}
              onChange={(vals) => onChange({ ...rule, entityValue: joinMultiValue(vals) })}
              placeholder="Select value..."
              pillBg="#F3E8FF"
              pillColor="#805AD5"
              pillBorder="rgba(128,90,213,0.2)"
              searchable
              attributeLabel={ENTITY_TYPE_PLURALS[rule.entityType] || "values"}
            />
          </>
        ) : (
          <>
            <span className="text-[11px] text-[#6B7280]">Players who</span>
            <PillDropdown
              value={rule.ruleType === "played" ? "played" : "have not played"}
              options={["played", "have not played"]}
              onChange={(v) => onChange({ ...rule, ruleType: v === "played" ? "played" : "not_played" })}
              pillBg={qs.pillBg}
              pillColor={qs.pillColor}
              pillBorder={qs.pillBorder}
            />
            <span className="text-[11px] text-[#6B7280]">a game with</span>
            <PillDropdown
              value={entityLabel}
              options={ENTITY_TYPE_OPTIONS.map((e) => e.label)}
              onChange={(label) => {
                const et = ENTITY_TYPE_OPTIONS.find((e) => e.label === label);
                if (et) onChange({ ...rule, entityType: et.type, entityValue: "" });
              }}
              pillBg={qs.pillBg}
              pillColor={qs.pillColor}
              pillBorder={qs.pillBorder}
              searchable
            />
            <MultiPillDropdown
              values={parseMultiValue(rule.entityValue)}
              options={valueOptions}
              onChange={(vals) => onChange({ ...rule, entityValue: joinMultiValue(vals) })}
              placeholder="Select value..."
              pillBg="#F3E8FF"
              pillColor="#805AD5"
              pillBorder="rgba(128,90,213,0.2)"
              searchable
              attributeLabel={ENTITY_TYPE_PLURALS[rule.entityType] || "values"}
            />
            {rule.minHours > 0 ? (
              <>
                <span className="text-[11px] text-[#6B7280]">for at least</span>
                <input
                  type="number"
                  min={0}
                  value={rule.minHours}
                  onChange={(e) => onChange({ ...rule, minHours: Math.max(0, parseInt(e.target.value) || 0) })}
                  className="w-12 px-1.5 py-0.5 text-[11px] text-center border border-[#E5E7EB] rounded-full focus:outline-none focus:border-[#4F46E5]"
                />
                <span className="text-[11px] text-[#6B7280]">hrs</span>
                <button
                  type="button"
                  onClick={() => onChange({ ...rule, minHours: 0 })}
                  className="text-[10px] text-red-400 hover:text-red-600"
                  title="Remove hours filter"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => onChange({ ...rule, minHours: 10 })}
                className="text-[10px] font-medium hover:underline"
                style={{ color: qs.pillColor }}
              >
                + hrs
              </button>
            )}
          </>
        )}
      </div>
      <button
        type="button"
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 text-[#6B7280] hover:text-red-500 mt-1 shrink-0 transition-opacity"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// ─── Demographic Rule Row ───

function DemographicRuleRow({
  rule,
  onChange,
  onDelete,
}: {
  rule: DemographicRule;
  onChange: (updated: DemographicRule) => void;
  onDelete: () => void;
}) {
  const qs = QUADRANT_STYLES.demo;
  const attrDef = DEMOGRAPHIC_ATTRIBUTES.find((a) => a.type === rule.attribute);
  const attrLabel = attrDef?.label || "Age Group";
  const valueOptions = attrDef?.values ?? [];

  return (
    <div className="flex items-start gap-2 group">
      <div className="flex-1 text-[12px] text-[#4A5568] leading-relaxed flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] text-[#6B7280]">Players who are</span>
        <PillDropdown
          value={attrLabel}
          options={DEMOGRAPHIC_ATTRIBUTES.map((a) => a.label)}
          onChange={(label) => {
            const attr = DEMOGRAPHIC_ATTRIBUTES.find((a) => a.label === label);
            if (attr) onChange({ ...rule, attribute: attr.type, value: "" });
          }}
          pillBg={qs.pillBg}
          pillColor={qs.pillColor}
          pillBorder={qs.pillBorder}
        />
        <MultiPillDropdown
          values={parseMultiValue(rule.value)}
          options={valueOptions}
          onChange={(vals) => onChange({ ...rule, value: joinMultiValue(vals) })}
          placeholder="Select value..."
          pillBg={qs.pillBg}
          pillColor={qs.pillColor}
          pillBorder={qs.pillBorder}
          searchable
          attributeLabel={ATTRIBUTE_PLURALS[rule.attribute] || "values"}
        />
      </div>
      <button
        type="button"
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 text-[#6B7280] hover:text-red-500 mt-1 shrink-0 transition-opacity"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// ─── Psychographic Rule Row ───

function PsychographicRuleRow({
  rule,
  onChange,
  onDelete,
}: {
  rule: PsychographicRule;
  onChange: (updated: PsychographicRule) => void;
  onDelete: () => void;
}) {
  const qs = QUADRANT_STYLES.psycho;
  const attrDef = PSYCHOGRAPHIC_ATTRIBUTES.find((a) => a.type === rule.attribute);
  const attrLabel = attrDef?.label || "Gaming Motivation";
  const valueOptions = attrDef?.values ?? [];

  return (
    <div className="flex items-start gap-2 group">
      <div className="flex-1 text-[12px] text-[#4A5568] leading-relaxed flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] text-[#6B7280]">Players who identify as</span>
        <PillDropdown
          value={attrLabel}
          options={PSYCHOGRAPHIC_ATTRIBUTES.map((a) => a.label)}
          onChange={(label) => {
            const attr = PSYCHOGRAPHIC_ATTRIBUTES.find((a) => a.label === label);
            if (attr) onChange({ ...rule, attribute: attr.type, value: "" });
          }}
          pillBg={qs.pillBg}
          pillColor={qs.pillColor}
          pillBorder={qs.pillBorder}
        />
        <MultiPillDropdown
          values={parseMultiValue(rule.value)}
          options={valueOptions}
          onChange={(vals) => onChange({ ...rule, value: joinMultiValue(vals) })}
          placeholder="Select value..."
          pillBg={qs.pillBg}
          pillColor={qs.pillColor}
          pillBorder={qs.pillBorder}
          searchable
          attributeLabel={ATTRIBUTE_PLURALS[rule.attribute] || "values"}
        />
      </div>
      <button
        type="button"
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 text-[#6B7280] hover:text-red-500 mt-1 shrink-0 transition-opacity"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// ─── Monetization Rule Row ───

function MonetizationRuleRow({
  rule,
  onChange,
  onDelete,
}: {
  rule: MonetizationRule;
  onChange: (updated: MonetizationRule) => void;
  onDelete: () => void;
}) {
  const qs = QUADRANT_STYLES.money;

  return (
    <div className="flex items-start gap-2 group">
      <div className="flex-1 text-[12px] text-[#4A5568] leading-relaxed flex flex-wrap items-center gap-1.5">
        {rule.ruleType === "spend_comparison" ? (
          <>
            <span className="text-[11px] text-[#6B7280]">Players who spend</span>
            <PillDropdown
              value={rule.comparison || "more"}
              options={["more", "less", "between"]}
              onChange={(v) => onChange({ ...rule, comparison: v as "more" | "less" | "between" })}
              pillBg={qs.pillBg}
              pillColor={qs.pillColor}
              pillBorder={qs.pillBorder}
            />
            <span className="text-[11px] text-[#6B7280]">than</span>
            <input
              type="number"
              min={0}
              value={rule.amount || 0}
              onChange={(e) => onChange({ ...rule, amount: Math.max(0, parseInt(e.target.value) || 0) })}
              className="w-16 px-1.5 py-0.5 text-[11px] text-center border border-[#E5E7EB] rounded-full focus:outline-none focus:border-[#B7791F]"
            />
            <span className="text-[11px] text-[#6B7280]">/month on</span>
            <MultiPillDropdown
              values={parseMultiValue(rule.category || "")}
              options={SPEND_CATEGORIES}
              onChange={(vals) => onChange({ ...rule, category: joinMultiValue(vals) })}
              placeholder="Category..."
              pillBg={qs.pillBg}
              pillColor={qs.pillColor}
              pillBorder={qs.pillBorder}
              attributeLabel="categories"
            />
          </>
        ) : (
          <>
            <span className="text-[11px] text-[#6B7280]">Players who have</span>
            <PillDropdown
              value={rule.purchased ? "purchased" : "not purchased"}
              options={["purchased", "not purchased"]}
              onChange={(v) => onChange({ ...rule, purchased: v === "purchased" })}
              pillBg={qs.pillBg}
              pillColor={qs.pillColor}
              pillBorder={qs.pillBorder}
            />
            <PillDropdown
              value={rule.purchaseType || ""}
              options={PURCHASE_TYPES}
              onChange={(v) => onChange({ ...rule, purchaseType: v })}
              placeholder="Type..."
              pillBg={qs.pillBg}
              pillColor={qs.pillColor}
              pillBorder={qs.pillBorder}
            />
            <span className="text-[11px] text-[#6B7280]">in the last</span>
            <PillDropdown
              value={rule.timeframeDays ? `${rule.timeframeDays} days` : ""}
              options={PURCHASE_TIMEFRAMES.map((d) => `${d} days`)}
              onChange={(v) => onChange({ ...rule, timeframeDays: parseInt(v) || 90 })}
              placeholder="Timeframe..."
              pillBg={qs.pillBg}
              pillColor={qs.pillColor}
              pillBorder={qs.pillBorder}
            />
          </>
        )}
      </div>
      <button
        type="button"
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 text-[#6B7280] hover:text-red-500 mt-1 shrink-0 transition-opacity"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// ─── Games Modal ───

function GamesModal({
  titles,
  onClose,
}: {
  titles: string[];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E7EB]">
          <h3 className="text-sm font-semibold text-[#111827]">Matched Games ({titles.length})</h3>
          <button type="button" onClick={onClose} className="text-[#6B7280] hover:text-[#111827]">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="max-h-80 overflow-y-auto p-4">
          {titles.map((t) => (
            <div key={t} className="py-1.5 text-sm text-[#4A5568] border-b border-[#F5F6F8] last:border-0">{t}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Compare Modal ───

function CompareModal({
  columns,
  tierAssignments,
  onClose,
}: {
  columns: SegmentColumn[];
  tierAssignments: { tier: string; color: string }[];
  onClose: () => void;
}) {
  const analyzed = columns.filter((c) => c.analyzed);
  if (analyzed.length < 2) return null;

  const rows = [
    { label: "Addressable Market", fn: (c: SegmentColumn) => c.size.toLocaleString() },
    { label: "Conversion Rate", fn: (c: SegmentColumn) => `${c.convRate}%` },
    { label: "Games Matched", fn: (c: SegmentColumn) => String(c.gamesCount) },
    { label: "Health", fn: (c: SegmentColumn) => HEALTH_BADGES[computeHealth(c, columns)].emoji + " " + HEALTH_BADGES[computeHealth(c, columns)].label.split(":")[0] },
    { label: "Tier", fn: (c: SegmentColumn) => {
      const idx = columns.indexOf(c);
      return tierAssignments[idx]?.tier || "—";
    }},
    { label: "Play Rules", fn: (c: SegmentColumn) => String(c.playRules.filter((r) => r.entityValue).length) },
    { label: "Demo Rules", fn: (c: SegmentColumn) => String(c.demoRules.filter((r) => r.value).length) },
    { label: "Psycho Rules", fn: (c: SegmentColumn) => String(c.psychoRules.filter((r) => r.value).length) },
    { label: "Money Rules", fn: (c: SegmentColumn) => String(c.moneyRules.length) },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E7EB]">
          <h3 className="text-sm font-semibold text-[#111827]">Compare Segments</h3>
          <button type="button" onClick={onClose} className="text-[#6B7280] hover:text-[#111827]">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="p-4 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="text-left py-2 pr-4 text-[#6B7280] font-medium"></th>
                {analyzed.map((c, i) => (
                  <th key={i} className="text-left py-2 px-3 font-semibold text-[#111827]">{c.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-t border-[#F5F6F8]">
                  <td className="py-2 pr-4 text-[#6B7280] font-medium whitespace-nowrap">{row.label}</td>
                  {analyzed.map((c, i) => (
                    <td key={i} className="py-2 px-3 text-[#111827]">{row.fn(c)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Result Breakdown Tags ───

function ResultBreakdownTags({ col }: { col: SegmentColumn }) {
  const sections: { key: keyof typeof QUADRANT_STYLES; has: boolean }[] = [
    { key: "play", has: col.playRules.some((r) => r.entityValue) },
    { key: "demo", has: col.demoRules.some((r) => r.value) },
    { key: "psycho", has: col.psychoRules.some((r) => r.value) },
    { key: "money", has: col.moneyRules.length > 0 },
  ];
  const active = sections.filter((s) => s.has);
  if (active.length === 0) return null;

  const labelMap = { play: "Behavioral", demo: "Demographic", psycho: "Psychographic", money: "Monetization" };

  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {active.map(({ key }) => {
        const s = QUADRANT_STYLES[key];
        return (
          <span
            key={key}
            className="text-[9px] font-semibold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: s.pillBg, color: s.pillColor, border: `1px solid ${s.pillBorder}` }}
          >
            {labelMap[key]}
          </span>
        );
      })}
    </div>
  );
}

// ─── Props ───

interface SegmentBuilderProps {
  columns: SegmentColumn[];
  onChange: (columns: SegmentColumn[]) => void;
  projectId?: string;
  projectContext?: {
    title?: string;
    lifecycle?: string;
    monetization?: string;
    platforms?: string[];
    primaryMarket?: string;
  };
}

// ─── Main Component ───

export function SegmentBuilder({ columns, onChange, projectId, projectContext }: SegmentBuilderProps) {
  const [editingName, setEditingName] = useState<number | null>(null);
  const [gamesModalCol, setGamesModalCol] = useState<number | null>(null);
  const [showCompare, setShowCompare] = useState(false);
  const [notesOpen, setNotesOpen] = useState<Record<number, boolean>>({});
  const { isDimVisible, showAIMode, hasMultiSegment } = useVersion();

  const tierAssignments = assignTiers(columns);
  const analyzedCount = columns.filter((c) => c.analyzed).length;

  const updateCol = (colIdx: number, patch: Partial<SegmentColumn>) => {
    onChange(columns.map((col, i) => (i === colIdx ? { ...col, ...patch } : col)));
  };

  // Play rules
  const updatePlayRule = (colIdx: number, ruleId: number, updated: QueryRule) => {
    updateCol(colIdx, {
      playRules: columns[colIdx].playRules.map((r) => (r.id === ruleId ? updated : r)),
    });
  };

  const addPlayRule = (colIdx: number, type: "played" | "played_n_games" = "played") => {
    const rule = emptyRule();
    rule.ruleType = type;
    updateCol(colIdx, { playRules: [...columns[colIdx].playRules, rule] });
  };

  const deletePlayRule = (colIdx: number, ruleId: number) => {
    updateCol(colIdx, { playRules: columns[colIdx].playRules.filter((r) => r.id !== ruleId) });
  };

  // Exclude rules
  const updateExcludeRule = (colIdx: number, ruleId: number, updated: QueryRule) => {
    updateCol(colIdx, {
      excludeRules: columns[colIdx].excludeRules.map((r) => (r.id === ruleId ? updated : r)),
    });
  };

  const addExcludeRule = (colIdx: number) => {
    const rule = emptyRule();
    rule.ruleType = "not_played";
    updateCol(colIdx, { excludeRules: [...columns[colIdx].excludeRules, rule] });
  };

  const deleteExcludeRule = (colIdx: number, ruleId: number) => {
    updateCol(colIdx, { excludeRules: columns[colIdx].excludeRules.filter((r) => r.id !== ruleId) });
  };

  // Demo rules
  const addDemoRule = (colIdx: number) => {
    updateCol(colIdx, {
      demoRules: [...columns[colIdx].demoRules, { id: ++_ruleIdCounter, attribute: "ageGroup", value: "" }],
    });
  };

  const updateDemoRule = (colIdx: number, ruleId: number, updated: DemographicRule) => {
    updateCol(colIdx, {
      demoRules: columns[colIdx].demoRules.map((r) => (r.id === ruleId ? updated : r)),
    });
  };

  const deleteDemoRule = (colIdx: number, ruleId: number) => {
    updateCol(colIdx, { demoRules: columns[colIdx].demoRules.filter((r) => r.id !== ruleId) });
  };

  // Psycho rules
  const addPsychoRule = (colIdx: number) => {
    updateCol(colIdx, {
      psychoRules: [...columns[colIdx].psychoRules, { id: ++_ruleIdCounter, attribute: "motivation", value: "" }],
    });
  };

  const updatePsychoRule = (colIdx: number, ruleId: number, updated: PsychographicRule) => {
    updateCol(colIdx, {
      psychoRules: columns[colIdx].psychoRules.map((r) => (r.id === ruleId ? updated : r)),
    });
  };

  const deletePsychoRule = (colIdx: number, ruleId: number) => {
    updateCol(colIdx, { psychoRules: columns[colIdx].psychoRules.filter((r) => r.id !== ruleId) });
  };

  // Money rules
  const addMoneyRule = (colIdx: number, type: "spend_comparison" | "purchase_history") => {
    const rule: MonetizationRule =
      type === "spend_comparison"
        ? { id: ++_ruleIdCounter, ruleType: "spend_comparison", comparison: "more", amount: 20, category: "" }
        : { id: ++_ruleIdCounter, ruleType: "purchase_history", purchased: true, purchaseType: "", timeframeDays: 90 };
    updateCol(colIdx, { moneyRules: [...columns[colIdx].moneyRules, rule] });
  };

  const updateMoneyRule = (colIdx: number, ruleId: number, updated: MonetizationRule) => {
    updateCol(colIdx, {
      moneyRules: columns[colIdx].moneyRules.map((r) => (r.id === ruleId ? updated : r)),
    });
  };

  const deleteMoneyRule = (colIdx: number, ruleId: number) => {
    updateCol(colIdx, { moneyRules: columns[colIdx].moneyRules.filter((r) => r.id !== ruleId) });
  };

  // Toggle section collapsed
  const toggleSection = (colIdx: number, section: keyof SegmentColumn["collapsedSections"]) => {
    updateCol(colIdx, {
      collapsedSections: {
        ...columns[colIdx].collapsedSections,
        [section]: !columns[colIdx].collapsedSections[section],
      },
    });
  };

  // Run Analysis
  const runAnalysis = async (colIdx: number) => {
    updateCol(colIdx, { loading: true });
    const col = columns[colIdx];

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectContext: projectContext || {},
          segment: {
            name: col.name,
            playRules: col.playRules,
            demoRules: col.demoRules,
            psychoRules: col.psychoRules,
            moneyRules: col.moneyRules,
            sectionConnector: col.sectionConnector,
          },
        }),
      });
      const data = await res.json();

      // Cache result
      if (projectId) {
        try {
          const cacheKey = scopedKey(`project_${projectId}_results`);
          const cache = JSON.parse(localStorage.getItem(cacheKey) || "{}");
          cache[colIdx] = data;
          localStorage.setItem(cacheKey, JSON.stringify(cache));
        } catch { /* ignore */ }
      }

      updateCol(colIdx, {
        loading: false,
        analyzed: true,
        size: data.size || 0,
        convRate: data.convRate || 0,
        gamesCount: data.gamesCount || 0,
        suggestedName: data.suggestedName || "",
        benchmarkConvLow: data.benchmarkConvLow || 0,
        benchmarkConvMid: data.benchmarkConvMid || 0,
        benchmarkConvHigh: data.benchmarkConvHigh || 0,
        comparableTitles: Array.isArray(data.comparableTitles) ? data.comparableTitles : [],
        confidence: data.confidence || "Medium",
      });
    } catch {
      // Fallback to local heuristic
      const estimate = estimateSegmentSize(col);
      const h = stableHash(`fallback-${col.name}-${colIdx}`);
      const fallbackSize = estimate || Math.round(50_000 + h * 300_000);
      const fallbackConv = Math.round((3 + h * 12) * 10) / 10;
      updateCol(colIdx, {
        loading: false,
        analyzed: true,
        size: fallbackSize,
        convRate: fallbackConv,
        gamesCount: estimateGameCount(col.playRules) || Math.round(30 + h * 150),
        suggestedName: "",
        benchmarkConvLow: Math.round(Math.max(0.5, fallbackConv - 2.5) * 10) / 10,
        benchmarkConvMid: fallbackConv,
        benchmarkConvHigh: Math.round(Math.min(30, fallbackConv + 2.5) * 10) / 10,
        comparableTitles: [],
        confidence: "Low",
      });
    }
  };

  const renameSeg = (colIdx: number, name: string) => {
    updateCol(colIdx, { name });
    setEditingName(null);
  };

  const addSegment = () => {
    if (columns.length >= 5) return;
    onChange([...columns, emptyColumn(columns.length)]);
  };

  const removeSegment = (colIdx: number) => {
    if (columns.length <= 1) return;
    onChange(columns.filter((_, i) => i !== colIdx));
  };

  const acceptSuggestedName = (colIdx: number) => {
    updateCol(colIdx, { name: columns[colIdx].suggestedName, suggestedName: "" });
  };

  const dismissSuggestedName = (colIdx: number) => {
    updateCol(colIdx, { suggestedName: "" });
  };

  // Single segment uses full width; multi-segment uses horizontal scroll
  const isSingle = columns.length === 1;

  // AI mode state (V5 only)
  const [aiMode, setAiMode] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim() || aiLoading) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch("/api/ai-segment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt, version: "v5" }),
      });
      if (!res.ok) throw new Error("AI generation failed");
      const data = await res.json();
      // Auto-populate first segment column with AI results
      const col = { ...columns[0] };
      if (data.whatTheyPlay) {
        const rules: QueryRule[] = [];
        if (data.whatTheyPlay.genre) {
          rules.push({ ...emptyRule(), entityType: "genre", entityValue: data.whatTheyPlay.genre });
        }
        if (data.whatTheyPlay.subGenre) {
          rules.push({ ...emptyRule(), entityType: "subGenre", entityValue: data.whatTheyPlay.subGenre });
        }
        if (rules.length > 0) col.playRules = rules;
      }
      if (data.whoTheyAre) {
        const demoRules: DemographicRule[] = [];
        let demoId = 100;
        if (data.whoTheyAre.ageRange) demoRules.push({ id: demoId++, attribute: "age", value: data.whoTheyAre.ageRange });
        if (data.whoTheyAre.gender) demoRules.push({ id: demoId++, attribute: "gender", value: data.whoTheyAre.gender });
        if (data.whoTheyAre.region) demoRules.push({ id: demoId++, attribute: "region", value: data.whoTheyAre.region });
        if (demoRules.length > 0) col.demoRules = demoRules;
      }
      if (data.whyTheyPlay) {
        const psychoRules: PsychographicRule[] = [];
        let psychoId = 200;
        if (data.whyTheyPlay.motivation) psychoRules.push({ id: psychoId++, attribute: "motivation", value: data.whyTheyPlay.motivation });
        if (psychoRules.length > 0) col.psychoRules = psychoRules;
      }
      if (data.whatTheyPay) {
        const moneyRules: MonetizationRule[] = [];
        let moneyId = 300;
        if (data.whatTheyPay.spendingTier) {
          moneyRules.push({
            id: moneyId++,
            ruleType: "spend_comparison",
            comparison: "more",
            amount: data.whatTheyPay.spendingTier === "whale" ? 100 : data.whatTheyPay.spendingTier === "high" ? 50 : data.whatTheyPay.spendingTier === "medium" ? 20 : 5,
          });
        }
        if (moneyRules.length > 0) col.moneyRules = moneyRules;
      }
      col.collapsedSections = { play: false, demo: false, psycho: false, money: false };
      if (data.suggestedName) col.name = data.suggestedName;
      onChange(columns.map((c, i) => (i === 0 ? col : c)));
      setAiMode(false);
      setAiPrompt("");
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Failed to generate segment");
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div>
      {/* AI Mode toggle (V5 only) */}
      {showAIMode && (
        <div className="mb-4">
          <div className="flex items-center gap-1 bg-nz-bg-subtle rounded-full p-0.5 w-fit mb-3">
            <button
              type="button"
              onClick={() => setAiMode(false)}
              className={`px-3 py-1.5 text-[11px] font-medium rounded-full transition-colors ${
                !aiMode ? "bg-nz-accent text-white" : "text-nz-text-secondary hover:text-nz-text"
              }`}
            >
              Manual
            </button>
            <button
              type="button"
              onClick={() => setAiMode(true)}
              className={`px-3 py-1.5 text-[11px] font-medium rounded-full transition-colors ${
                aiMode ? "bg-[#D97706] text-white" : "text-nz-text-secondary hover:text-nz-text"
              }`}
            >
              AI-Assisted
            </button>
          </div>

          {aiMode && (
            <div className="bg-white rounded-card border border-nz-border p-5 shadow-card mb-4">
              <label className="block text-sm font-body font-medium text-nz-text mb-2">
                Describe the audience you want to reach...
              </label>
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="e.g. Hardcore RPG players in their 20s-30s who spend heavily on premium games and are motivated by exploration and story depth"
                className="w-full h-24 px-3 py-2 text-sm font-body text-nz-text border border-nz-border rounded-card resize-none focus:outline-none focus:border-[#D97706] focus:ring-1 focus:ring-[#D97706]/20 placeholder:text-nz-text-muted"
              />
              <div className="flex items-center gap-3 mt-3">
                <button
                  type="button"
                  onClick={handleAiGenerate}
                  disabled={!aiPrompt.trim() || aiLoading}
                  className="px-4 py-2 text-sm font-body font-medium text-white bg-[#D97706] rounded-card hover:bg-[#B45309] transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {aiLoading ? (
                    <>
                      <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Generating...
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Generate Segment
                    </>
                  )}
                </button>
                {aiError && (
                  <span className="text-xs text-nz-red">{aiError}</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Header bar */}
      <div className="flex items-center justify-between mb-4">
        {hasMultiSegment ? (
          <div className="text-xs text-[#6B7280]">
            {columns.length} segment{columns.length !== 1 ? "s" : ""}
          </div>
        ) : (
          <div />
        )}
        <div className="flex items-center gap-2">
          {hasMultiSegment && analyzedCount >= 2 && (
            <button
              type="button"
              onClick={() => setShowCompare(true)}
              className="px-3 py-1.5 text-[11px] font-medium text-[#4A5568] bg-white border border-[#E5E7EB] rounded-md hover:border-[#4F46E5]/40 transition-colors"
            >
              Compare Segments
            </button>
          )}
          {hasMultiSegment && (
            <button
              type="button"
              onClick={addSegment}
              disabled={columns.length >= 5}
              className="px-3 py-1.5 text-[11px] font-medium text-[#4A5568] bg-white border border-[#E5E7EB] rounded-md hover:border-[#4F46E5]/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title={columns.length >= 5 ? "Maximum 5 segments reached" : "Add a new segment"}
            >
              + Add Segment
            </button>
          )}
        </div>
      </div>

      <div className={isSingle ? "max-w-xl" : "flex gap-5 overflow-x-auto pb-4"}>
        {columns.map((col, colIdx) => {
          const liveEstimate = estimateSegmentSize(col);
          const tier = tierAssignments[colIdx];
          const health = computeHealth(col, columns);
          const healthBadge = HEALTH_BADGES[health];
          const gameCountEstimate = estimateGameCount(col.playRules);

          // Count active sections for cross-section connectors
          const activeSections: { key: keyof typeof QUADRANT_STYLES; hasRules: boolean }[] = [
            { key: "play", hasRules: col.playRules.some((r) => r.entityValue) },
            { key: "demo", hasRules: col.demoRules.some((r) => r.value) },
            { key: "psycho", hasRules: col.psychoRules.some((r) => r.value) },
            { key: "money", hasRules: col.moneyRules.length > 0 },
          ];
          const activeSectionCount = activeSections.filter((s) => s.hasRules).length;
          let sectionRendered = 0;

          return (
            <div
              key={colIdx}
              className={`bg-white rounded-card border border-nz-border shadow-card overflow-hidden ${isSingle ? "" : "flex-none min-w-[280px] w-72"}`}
            >
              {/* Top color bar */}
              <div className="h-1" style={{ backgroundColor: tier.color }} />

              <div className={`p-4 ${columns.length >= 4 ? "p-3" : ""}`}>
                {/* Segment name + tier + health + delete */}
                <div className="flex items-center justify-between mb-4">
                  {/* Name + edit — only in multi-segment (V2+). V0/V1 rename from page title. */}
                  {hasMultiSegment ? (
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {editingName === colIdx ? (
                        <input
                          autoFocus
                          defaultValue={col.name}
                          onBlur={(e) => renameSeg(colIdx, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") renameSeg(colIdx, e.currentTarget.value);
                          }}
                          className="text-base font-heading font-semibold text-nz-text border-b border-nz-primary focus:outline-none bg-transparent min-w-0"
                        />
                      ) : (
                        <>
                          <h3 className="text-base font-heading font-semibold text-nz-text truncate">{col.name}</h3>
                          <button
                            type="button"
                            onClick={() => setEditingName(colIdx)}
                            className="text-nz-text-muted hover:text-nz-primary shrink-0"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="flex-1" />
                  )}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Health badge — only for multi-segment (V2+) */}
                    {hasMultiSegment && (
                      <span title={healthBadge.label} className="text-xs cursor-help">{healthBadge.emoji}</span>
                    )}
                    {/* Notes indicator */}
                    {col.notes && (
                      <span className="text-xs" title="Has notes">
                        <svg className="w-3.5 h-3.5 text-[#4F46E5]" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
                        </svg>
                      </span>
                    )}
                    {/* Tier badge — only show for multi-segment (V2+) */}
                    {hasMultiSegment && tier.tier && (
                      <span
                        className={`text-xs font-semibold uppercase px-2.5 py-0.5 rounded-full ${
                          tier.tier === "Core"
                            ? "bg-nz-primary-light text-nz-primary-text"
                            : ""
                        }`}
                        style={tier.tier !== "Core" ? {
                          backgroundColor: tier.color + "15",
                          color: tier.color,
                        } : undefined}
                      >
                        {tier.tier}
                      </span>
                    )}
                    {/* Delete button */}
                    {columns.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSegment(colIdx)}
                        className="text-[#6B7280] hover:text-red-500 transition-colors"
                        title="Remove segment"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                {/* Live estimate badge */}
                {liveEstimate > 0 && !col.analyzed && (
                  <div className="mb-3 px-2.5 py-1.5 bg-[#F5F6F8] rounded-md flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#F6A623] animate-pulse" />
                    <span className="text-[10px] text-[#6B7280]">
                      Est. ~{liveEstimate.toLocaleString()} players
                    </span>
                  </div>
                )}

                {/* ── QUADRANT 1: WHAT THEY PLAY ── */}
                <div className="mb-3">
                  <SectionHeader
                    quadrant="play"
                    ruleCount={col.playRules.filter((r) => r.entityValue).length}
                    collapsed={col.collapsedSections.play}
                    onToggle={() => toggleSection(colIdx, "play")}
                  />
                  {!col.collapsedSections.play && (
                    <>
                      <div className="space-y-0 mt-1">
                        {col.playRules.map((rule, rIdx) => (
                          <div key={rule.id}>
                            {rIdx > 0 && (
                              <ConnectorPill
                                value={col.playConnector}
                                onChange={(v) => updateCol(colIdx, { playConnector: v })}
                              />
                            )}
                            <PlayRuleRow
                              rule={rule}
                              onChange={(updated) => updatePlayRule(colIdx, rule.id, updated)}
                              onDelete={() => deletePlayRule(colIdx, rule.id)}
                              isExclude={false}
                            />
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 flex gap-3">
                        <button
                          type="button"
                          onClick={() => addPlayRule(colIdx)}
                          className="text-[11px] font-medium text-[#4F46E5] hover:text-[#4F46E5]/80 transition-colors"
                        >
                          + Add Rule
                        </button>
                        <button
                          type="button"
                          onClick={() => addPlayRule(colIdx, "played_n_games")}
                          className="text-[11px] font-medium text-[#4F46E5] hover:text-[#4F46E5]/80 transition-colors"
                        >
                          + Games Count
                        </button>
                      </div>

                      {/* Exclude rules */}
                      <div className="mt-2">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="text-xs font-heading font-semibold uppercase tracking-wider text-nz-red">
                            Exclude
                          </div>
                          <div className="flex-1 h-px bg-nz-red/20" />
                        </div>
                        {col.excludeRules.length === 0 ? (
                          <button
                            type="button"
                            onClick={() => addExcludeRule(colIdx)}
                            className="text-[11px] font-medium text-red-400 hover:text-red-500 transition-colors"
                          >
                            + Add Exclude Rule
                          </button>
                        ) : (
                          <>
                            <div className="space-y-0 pl-2 border-l-2 border-red-200">
                              {col.excludeRules.map((rule, rIdx) => (
                                <div key={rule.id}>
                                  {rIdx > 0 && (
                                    <ConnectorPill
                                      value={col.excludeConnector}
                                      onChange={(v) => updateCol(colIdx, { excludeConnector: v })}
                                    />
                                  )}
                                  <PlayRuleRow
                                    rule={rule}
                                    onChange={(updated) => updateExcludeRule(colIdx, rule.id, updated)}
                                    onDelete={() => deleteExcludeRule(colIdx, rule.id)}
                                    isExclude={true}
                                  />
                                </div>
                              ))}
                            </div>
                            <button
                              type="button"
                              onClick={() => addExcludeRule(colIdx)}
                              className="mt-2 text-[11px] font-medium text-red-400 hover:text-red-500 transition-colors"
                            >
                              + Add Exclude Rule
                            </button>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Cross-section connector between play and demo */}
                {(() => {
                  if (col.playRules.some((r) => r.entityValue)) sectionRendered++;
                  const showConn = sectionRendered > 0 && (col.demoRules.some((r) => r.value) || col.psychoRules.some((r) => r.value) || col.moneyRules.length > 0);
                  return showConn && activeSectionCount > 1 ? (
                    <CrossSectionConnector
                      value={col.sectionConnector}
                      onChange={(v) => updateCol(colIdx, { sectionConnector: v })}
                    />
                  ) : null;
                })()}

                {/* ── QUADRANT 2: WHO THEY ARE ── */}
                {isDimVisible("demo") && (
                <div className="mb-3">
                  <SectionHeader
                    quadrant="demo"
                    ruleCount={col.demoRules.filter((r) => r.value).length}
                    collapsed={col.collapsedSections.demo}
                    onToggle={() => toggleSection(colIdx, "demo")}
                  />
                  {!col.collapsedSections.demo && (
                    <>
                      <div className="space-y-0 mt-1">
                        {col.demoRules.map((rule, rIdx) => (
                          <div key={rule.id}>
                            {rIdx > 0 && (
                              <ConnectorPill
                                value={col.demoConnector}
                                onChange={(v) => updateCol(colIdx, { demoConnector: v })}
                              />
                            )}
                            <DemographicRuleRow
                              rule={rule}
                              onChange={(updated) => updateDemoRule(colIdx, rule.id, updated)}
                              onDelete={() => deleteDemoRule(colIdx, rule.id)}
                            />
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => addDemoRule(colIdx)}
                        className="mt-2 text-[11px] font-medium hover:opacity-80 transition-colors"
                        style={{ color: QUADRANT_STYLES.demo.pillColor }}
                      >
                        + Add Demographic Rule
                      </button>
                    </>
                  )}
                </div>
                )}

                {/* Cross-section connector between demo and psycho if needed */}
                {isDimVisible("demo") && col.demoRules.some((r) => r.value) && (col.psychoRules.some((r) => r.value) || col.moneyRules.length > 0) && activeSectionCount > 1 && (
                  <CrossSectionConnector
                    value={col.sectionConnector}
                    onChange={(v) => updateCol(colIdx, { sectionConnector: v })}
                  />
                )}

                {/* ── QUADRANT 3: WHY THEY PLAY ── */}
                {isDimVisible("psycho") && (
                <div className="mb-3">
                  <SectionHeader
                    quadrant="psycho"
                    ruleCount={col.psychoRules.filter((r) => r.value).length}
                    collapsed={col.collapsedSections.psycho}
                    onToggle={() => toggleSection(colIdx, "psycho")}
                  />
                  {!col.collapsedSections.psycho && (
                    <>
                      <div className="space-y-0 mt-1">
                        {col.psychoRules.map((rule, rIdx) => (
                          <div key={rule.id}>
                            {rIdx > 0 && (
                              <ConnectorPill
                                value={col.psychoConnector}
                                onChange={(v) => updateCol(colIdx, { psychoConnector: v })}
                              />
                            )}
                            <PsychographicRuleRow
                              rule={rule}
                              onChange={(updated) => updatePsychoRule(colIdx, rule.id, updated)}
                              onDelete={() => deletePsychoRule(colIdx, rule.id)}
                            />
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => addPsychoRule(colIdx)}
                        className="mt-2 text-[11px] font-medium hover:opacity-80 transition-colors"
                        style={{ color: QUADRANT_STYLES.psycho.pillColor }}
                      >
                        + Add Psychographic Rule
                      </button>
                    </>
                  )}
                </div>
                )}

                {/* Cross-section connector between psycho and money if needed */}
                {isDimVisible("psycho") && col.psychoRules.some((r) => r.value) && col.moneyRules.length > 0 && activeSectionCount > 1 && (
                  <CrossSectionConnector
                    value={col.sectionConnector}
                    onChange={(v) => updateCol(colIdx, { sectionConnector: v })}
                  />
                )}

                {/* ── QUADRANT 4: WHAT THEY PAY ── */}
                {isDimVisible("money") && (
                <div className="mb-3">
                  <SectionHeader
                    quadrant="money"
                    ruleCount={col.moneyRules.length}
                    collapsed={col.collapsedSections.money}
                    onToggle={() => toggleSection(colIdx, "money")}
                  />
                  {!col.collapsedSections.money && (
                    <>
                      <div className="space-y-0 mt-1">
                        {col.moneyRules.map((rule, rIdx) => (
                          <div key={rule.id}>
                            {rIdx > 0 && (
                              <ConnectorPill
                                value={col.moneyConnector}
                                onChange={(v) => updateCol(colIdx, { moneyConnector: v })}
                              />
                            )}
                            <MonetizationRuleRow
                              rule={rule}
                              onChange={(updated) => updateMoneyRule(colIdx, rule.id, updated)}
                              onDelete={() => deleteMoneyRule(colIdx, rule.id)}
                            />
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 flex gap-3">
                        <button
                          type="button"
                          onClick={() => addMoneyRule(colIdx, "spend_comparison")}
                          className="text-[11px] font-medium hover:opacity-80 transition-colors"
                          style={{ color: QUADRANT_STYLES.money.pillColor }}
                        >
                          + Spending Rule
                        </button>
                        <button
                          type="button"
                          onClick={() => addMoneyRule(colIdx, "purchase_history")}
                          className="text-[11px] font-medium hover:opacity-80 transition-colors"
                          style={{ color: QUADRANT_STYLES.money.pillColor }}
                        >
                          + Purchase Rule
                        </button>
                      </div>
                    </>
                  )}
                </div>
                )}

                {/* Run Analysis */}
                <div className="mt-4 pt-4 border-t border-nz-border flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => runAnalysis(colIdx)}
                    disabled={col.loading}
                    className="px-6 py-2.5 bg-nz-primary text-white text-sm font-heading font-semibold rounded-card hover:bg-nz-primary-hover transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    {col.loading ? (
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : null}
                    {col.loading ? "Analyzing..." : "Run Analysis"}
                  </button>
                  {/* Games count beside button */}
                  {gameCountEstimate > 0 && (
                    <button
                      type="button"
                      onClick={() => setGamesModalCol(colIdx)}
                      className="text-[10px] text-nz-primary hover:underline font-body"
                    >
                      ~{col.analyzed ? col.gamesCount : gameCountEstimate} games &#8250;
                    </button>
                  )}
                </div>

                {/* Results */}
                {col.analyzed && !col.loading && (
                  <div className="mt-4 p-4 bg-nz-bg-subtle rounded-card border border-nz-border">
                    <div className="text-2xl font-mono font-semibold text-nz-text">
                      {col.size.toLocaleString()}
                    </div>
                    <div className="text-xs font-body text-nz-text-secondary mt-1">
                      Addressable market
                    </div>
                    <div className="text-xs font-body text-nz-text-secondary mt-1">
                      Conversion rate: <span className="font-semibold text-nz-text">{typeof col.convRate === "number" ? col.convRate.toFixed(2) : col.convRate}%</span>
                    </div>
                    <ResultBreakdownTags col={col} />
                  </div>
                )}

                {/* AI Suggested Name */}
                {col.analyzed && col.suggestedName && col.suggestedName !== col.name && (
                  <div className="mt-3 px-3 py-2 bg-blue-50 border border-blue-100 rounded-md flex items-center gap-2">
                    <span className="text-xs text-blue-700 flex-1">
                      Suggested: <span className="font-semibold">{col.suggestedName}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => acceptSuggestedName(colIdx)}
                      className="text-[10px] font-medium text-blue-600 hover:text-blue-800 px-2 py-0.5 bg-blue-100 rounded"
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      onClick={() => dismissSuggestedName(colIdx)}
                      className="text-[10px] font-medium text-[#6B7280] hover:text-[#4A5568]"
                    >
                      Dismiss
                    </button>
                  </div>
                )}

                {/* Segment Notes */}
                <div className="mt-3">
                  {notesOpen[colIdx] || col.notes ? (
                    <div>
                      <textarea
                        value={col.notes}
                        onChange={(e) => updateCol(colIdx, { notes: e.target.value.slice(0, 500) })}
                        placeholder="Strategic notes for this segment..."
                        rows={3}
                        className="w-full px-2.5 py-2 text-xs text-[#4A5568] border border-[#E5E7EB] rounded-md focus:outline-none focus:border-[#4F46E5] resize-none"
                      />
                      <div className="text-right text-[10px] text-[#6B7280]">{col.notes.length}/500</div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setNotesOpen({ ...notesOpen, [colIdx]: true })}
                      className="text-[11px] text-[#6B7280] hover:text-[#4F46E5] transition-colors"
                    >
                      Add strategic notes...
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Games Modal */}
      {gamesModalCol !== null && (
        <GamesModal
          titles={getMatchedTitles(columns[gamesModalCol]?.playRules || [])}
          onClose={() => setGamesModalCol(null)}
        />
      )}

      {/* Compare Modal */}
      {showCompare && (
        <CompareModal
          columns={columns}
          tierAssignments={tierAssignments}
          onClose={() => setShowCompare(false)}
        />
      )}
    </div>
  );
}
