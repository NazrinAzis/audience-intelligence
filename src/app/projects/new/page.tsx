"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TopNav } from "@/components/TopNav";
import { SegmentBuilder, emptyColumn } from "@/components/SegmentBuilder";
import type { SegmentColumn } from "@/components/SegmentBuilder";
import { useProjectStore } from "@/lib/store";
import { formatNumber } from "@/lib/mockData";
import { scopedKey } from "@/lib/versionedStorage";

const lifecycleOptions = [
  "Concept/Pre-Greenlight",
  "In Development",
  "Pre-Launch",
  "Launched",
  "Live Service",
];

const monetizationOptions = [
  { label: "Premium / P2P", note: "One-time purchase model. Benchmarks use sell-through and engagement data." },
  { label: "Free to Play", note: "Monetization via in-app purchases. Funnel metrics and retention curves apply." },
  { label: "Hybrid", note: "Base price + in-game purchases. Both sell-through and IAP metrics are tracked." },
];

const platformOptions = ["PC", "PlayStation", "Xbox", "Nintendo Switch", "Mobile"];

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const years = [2023, 2024, 2025, 2026, 2027, 2028];

const SEGMENT_COLORS = ["#4F46E5", "#00C2A8", "#F6A623", "#805AD5", "#A0AEC0"];
const TIERS_LABELS = ["Core", "Secondary", "Tertiary", "Quaternary", "Additional"];

const regions = [
  "Asia Pacific",
  "Europe",
  "Middle East & Africa",
  "North America",
  "Latin America",
];

const countriesByRegion: Record<string, string[]> = {
  "North America": ["United States", "Canada", "Mexico"],
  "Europe": ["United Kingdom", "Germany", "France", "Spain", "Italy", "Netherlands", "Sweden", "Poland"],
  "Asia Pacific": ["Japan", "South Korea", "China", "Australia", "India", "Indonesia"],
  "Latin America": ["Brazil", "Argentina", "Colombia", "Chile"],
  "Middle East & Africa": ["Saudi Arabia", "UAE", "South Africa", "Nigeria", "Egypt"],
};

type MarketLevel = "global" | "region" | "country";

function MarketSelector({
  label,
  value,
  onChange,
  multiSelect = false,
}: {
  label: string;
  value: string | string[];
  onChange: (v: string | string[]) => void;
  multiSelect?: boolean;
}) {
  const [level, setLevel] = useState<MarketLevel>("global");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const selectedArr = Array.isArray(value) ? value : value ? [value] : [];

  const handleSelect = (item: string) => {
    if (multiSelect) {
      const arr = selectedArr.includes(item)
        ? selectedArr.filter((x) => x !== item)
        : [...selectedArr, item];
      onChange(arr);
    } else {
      onChange(item);
      setOpen(false);
    }
  };

  const removeTag = (item: string) => {
    if (multiSelect) {
      onChange(selectedArr.filter((x) => x !== item));
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-nz-text mb-2">{label}</label>

      {/* Level switcher */}
      <div className="flex gap-1 mb-2">
        {(["global", "region", "country"] as MarketLevel[]).map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => { setLevel(l); setOpen(l !== "global"); if (l === "global") { onChange(multiSelect ? [] : "Global"); } }}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              level === l
                ? "bg-nz-primary text-white border-nz-primary"
                : "bg-white text-nz-text-secondary border-nz-border hover:border-nz-primary/30"
            }`}
          >
            {l.charAt(0).toUpperCase() + l.slice(1)}
          </button>
        ))}
      </div>

      {/* Selected tags */}
      {multiSelect && selectedArr.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selectedArr.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-nz-primary/10 text-nz-primary text-xs rounded-full"
            >
              {item}
              <button type="button" onClick={() => removeTag(item)} className="hover:text-red-500">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}

      {!multiSelect && !Array.isArray(value) && value && (
        <div className="text-sm text-nz-text font-medium mb-2 px-3 py-1.5 bg-nz-primary/5 rounded-md inline-block">
          {value}
        </div>
      )}

      {/* Dropdown */}
      {open && level === "region" && (
        <div className="bg-white border border-nz-border rounded-md shadow-sm max-h-48 overflow-y-auto">
          {regions.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => handleSelect(r)}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-nz-bg transition-colors ${
                selectedArr.includes(r) ? "bg-nz-primary/5 text-nz-primary font-medium" : "text-nz-text"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      )}

      {open && level === "country" && (
        <div className="bg-white border border-nz-border rounded-md shadow-sm">
          <div className="p-2 border-b border-nz-border">
            <input
              type="text"
              placeholder="Search countries..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-nz-border rounded focus:outline-none focus:border-nz-primary"
            />
          </div>
          <div className="max-h-60 overflow-y-auto">
            {Object.entries(countriesByRegion).map(([region, countries]) => {
              const filtered = countries.filter((c) =>
                c.toLowerCase().includes(search.toLowerCase())
              );
              if (filtered.length === 0) return null;
              return (
                <div key={region}>
                  <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-nz-text-muted bg-nz-bg">
                    {region}
                  </div>
                  {filtered.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => handleSelect(c)}
                      className={`w-full text-left px-3 py-1.5 text-sm hover:bg-nz-bg transition-colors ${
                        selectedArr.includes(c)
                          ? "bg-nz-primary/5 text-nz-primary font-medium"
                          : "text-nz-text"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function NewProjectPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  // Zustand store
  const wizardForm = useProjectStore((s) => s.wizardForm);
  const setWizardField = useProjectStore((s) => s.setWizardField);
  const wizardSegments = useProjectStore((s) => s.wizardSegments);
  const setWizardSegments = useProjectStore((s) => s.setWizardSegments);
  const createProject = useProjectStore((s) => s.createProject);

  // Local segment builder state
  const [segmentColumns, setSegmentColumns] = useState<SegmentColumn[]>(() =>
    wizardSegments.map((s, i) => ({
      ...emptyColumn(i),
      name: s.name,
      playRules: s.rules.length > 0 ? s.rules.map((r) => ({ ...r, id: r.id || Date.now() + Math.random() })) : emptyColumn(i).playRules,
      demoRules: s.demoRules || [],
      psychoRules: s.psychoRules || [],
      moneyRules: s.moneyRules || [],
      analyzed: s.analyzed,
      size: s.size,
      convRate: s.convRate,
    }))
  );

  const handleSegmentColumnsChange = (cols: SegmentColumn[]) => {
    setSegmentColumns(cols);
    // Sync to store — preserve all four quadrants
    setWizardSegments(
      cols.map((col, i) => ({
        name: col.name,
        tier: TIERS_LABELS[Math.min(i, TIERS_LABELS.length - 1)],
        color: SEGMENT_COLORS[Math.min(i, SEGMENT_COLORS.length - 1)],
        rules: col.playRules,
        demoRules: col.demoRules,
        psychoRules: col.psychoRules,
        moneyRules: col.moneyRules,
        analyzed: col.analyzed,
        size: col.size,
        convRate: col.convRate,
      }))
    );
  };

  const projectContext = {
    title: wizardForm.gameTitle || wizardForm.projectName,
    lifecycle: wizardForm.lifecycle,
    monetization: wizardForm.monetization,
    platforms: wizardForm.platforms,
    primaryMarket: wizardForm.primaryMarket,
  };

  const {
    lifecycle,
    monetization,
    gameTitle,
    projectName,
    launchMonth,
    launchYear,
    platforms,
    primaryMarket,
    secondaryMarkets,
  } = wizardForm;

  const isConcept = lifecycle === "Concept/Pre-Greenlight";
  const isPostLaunch = lifecycle === "Launched" || lifecycle === "Live Service";
  const selectedMonetization = monetizationOptions.find((m) => m.label === monetization);

  const togglePlatform = (p: string) => {
    const next = platforms.includes(p)
      ? platforms.filter((x) => x !== p)
      : [...platforms, p];
    setWizardField("platforms", next);
  };

  const handleCreate = () => {
    const slug = createProject();
    // Persist the full segment builder columns to localStorage so the
    // segments page (and audience/profile pages) can load them.
    localStorage.setItem(
      scopedKey(`project_${slug}_segments`),
      JSON.stringify(segmentColumns)
    );
    router.push(`/projects/${slug}/audience`);
  };

  // Dynamic grid class for review step
  const reviewGridCols =
    wizardSegments.length === 1 ? "grid-cols-1 max-w-xs" :
    wizardSegments.length === 2 ? "grid-cols-2 max-w-lg" :
    wizardSegments.length === 3 ? "grid-cols-3" :
    wizardSegments.length === 4 ? "grid-cols-4" :
    "grid-cols-5";

  return (
    <div>
      <TopNav
        breadcrumbs={[
          { label: "Workspace", href: "/dashboard" },
          { label: "New Project" },
        ]}
        title="Create New Project"
      />

      <div className="p-6 max-w-3xl mx-auto">
        {/* Step indicator */}
        <div className="flex items-center gap-0 mb-8">
          {[
            { n: 1, label: "Project Setup" },
            { n: 2, label: "Build Segments" },
            { n: 3, label: "Review" },
          ].map((s, i) => (
            <div key={s.n} className="flex items-center">
              {i > 0 && (
                <div className={`w-12 h-0.5 ${step >= s.n ? "bg-nz-primary" : "bg-nz-border"}`} />
              )}
              <div className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                    step >= s.n
                      ? "bg-nz-primary text-white"
                      : "bg-nz-border text-nz-text-muted"
                  }`}
                >
                  {s.n}
                </div>
                <span
                  className={`text-sm ${
                    step >= s.n ? "text-nz-text font-medium" : "text-nz-text-muted"
                  }`}
                >
                  {s.label}
                </span>
              </div>
            </div>
          ))}
        </div>

        {step === 1 && (
          <div className="bg-white rounded-card border border-nz-border p-6 space-y-6">
            {/* Lifecycle Stage */}
            <div>
              <label className="block text-sm font-medium text-nz-text mb-2">
                Lifecycle Stage <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {lifecycleOptions.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setWizardField("lifecycle", opt)}
                    className={`px-4 py-2 text-sm font-medium rounded-lg border transition-all ${
                      lifecycle === opt
                        ? "bg-nz-primary text-white border-nz-primary"
                        : "bg-white text-nz-text border-nz-border hover:border-nz-primary/30"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              {isConcept && (
                <div className="mt-2 flex items-start gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-md">
                  <svg className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="text-xs text-amber-700">
                    Game title optional at this stage. You can define segments using market-level behavioral data.
                  </span>
                </div>
              )}
            </div>

            {/* Monetization Model */}
            <div>
              <label className="block text-sm font-medium text-nz-text mb-2">
                Monetization Model <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {monetizationOptions.map((opt) => (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => setWizardField("monetization", opt.label)}
                    className={`px-4 py-2 text-sm font-medium rounded-lg border transition-all ${
                      monetization === opt.label
                        ? "bg-nz-primary text-white border-nz-primary"
                        : "bg-white text-nz-text border-nz-border hover:border-nz-primary/30"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {selectedMonetization && (
                <p className="mt-2 text-xs text-nz-text-secondary px-1">
                  {selectedMonetization.note}
                </p>
              )}
            </div>

            {/* Game Title */}
            <div>
              <label className="block text-sm font-medium text-nz-text mb-2">
                Game Title {isPostLaunch && <span className="text-red-500">*</span>}
              </label>
              <input
                type="text"
                value={gameTitle}
                onChange={(e) => setWizardField("gameTitle", e.target.value)}
                placeholder="e.g. Ironveil: Age of Embers"
                className="w-full px-3 py-2 text-sm border border-nz-border rounded-lg focus:outline-none focus:ring-2 focus:ring-nz-primary/15 focus:border-nz-primary"
              />
            </div>

            {/* Project Name */}
            <div>
              <label className="block text-sm font-medium text-nz-text mb-2">Project Name</label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setWizardField("projectName", e.target.value)}
                placeholder="Internal project name"
                className="w-full px-3 py-2 text-sm border border-nz-border rounded-lg focus:outline-none focus:ring-2 focus:ring-nz-primary/15 focus:border-nz-primary"
              />
            </div>

            {/* Launch Window */}
            {!isConcept && (
              <div>
                <label className="block text-sm font-medium text-nz-text mb-2">Launch Window</label>
                <div className="flex gap-3">
                  <select
                    value={launchMonth}
                    onChange={(e) => setWizardField("launchMonth", e.target.value)}
                    className="px-3 py-2 text-sm border border-nz-border rounded-lg focus:outline-none focus:ring-2 focus:ring-nz-primary/15 focus:border-nz-primary bg-white"
                  >
                    <option value="">Month</option>
                    {months.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  <select
                    value={launchYear}
                    onChange={(e) => setWizardField("launchYear", e.target.value)}
                    className="px-3 py-2 text-sm border border-nz-border rounded-lg focus:outline-none focus:ring-2 focus:ring-nz-primary/15 focus:border-nz-primary bg-white"
                  >
                    <option value="">Year</option>
                    {years.map((y) => (
                      <option key={y} value={String(y)}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Platform */}
            <div>
              <label className="block text-sm font-medium text-nz-text mb-2">Platform</label>
              <div className="flex flex-wrap gap-2">
                {platformOptions.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => togglePlatform(p)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-full border transition-all ${
                      platforms.includes(p)
                        ? "bg-nz-primary text-white border-nz-primary"
                        : "bg-white text-nz-text-secondary border-nz-border hover:border-nz-primary/30"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Primary Market */}
            <MarketSelector
              label="Primary Market"
              value={primaryMarket}
              onChange={(v) => setWizardField("primaryMarket", v as string)}
            />

            {/* Secondary Markets */}
            <MarketSelector
              label="Secondary Markets"
              value={secondaryMarkets}
              onChange={(v) => setWizardField("secondaryMarkets", v as string[])}
              multiSelect
            />

            {/* Submit */}
            <div className="pt-4 border-t border-nz-border flex justify-end">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-6 py-2.5 bg-nz-accent text-white text-sm font-body font-medium rounded-card hover:bg-nz-accent-hover transition-colors"
              >
                Save &amp; Continue &rarr;
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            {/* Info banner */}
            <div className="flex items-start gap-3 px-4 py-3 bg-nz-primary-light border border-nz-primary/20 rounded-card mb-5">
              <svg className="w-5 h-5 text-nz-primary mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-nz-text-secondary">
                Define up to 5 audience segments using behavioral, demographic, psychographic, and monetization data.
              </p>
            </div>

            <SegmentBuilder
              columns={segmentColumns}
              onChange={handleSegmentColumnsChange}
              projectContext={projectContext}
            />

            {/* Nav buttons */}
            <div className="mt-6 flex justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 text-sm text-nz-text-secondary border border-nz-border rounded-lg hover:bg-nz-bg-subtle"
              >
                &larr; Back
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="px-6 py-2.5 bg-nz-accent text-white text-sm font-body font-medium rounded-card hover:bg-nz-accent-hover transition-colors"
              >
                Continue &rarr;
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="bg-white rounded-card border border-nz-border p-6">
            <h3 className="text-lg font-semibold text-nz-text mb-6">Review Project</h3>

            {/* Project details */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <div className="text-xs text-nz-text-muted uppercase mb-1">Game Title</div>
                <div className="text-sm font-medium text-nz-text">{gameTitle || "\u2014"}</div>
              </div>
              <div>
                <div className="text-xs text-nz-text-muted uppercase mb-1">Project Name</div>
                <div className="text-sm font-medium text-nz-text">{projectName || "\u2014"}</div>
              </div>
              <div>
                <div className="text-xs text-nz-text-muted uppercase mb-1">Lifecycle</div>
                <div className="text-sm font-medium text-nz-text">{lifecycle || "\u2014"}</div>
              </div>
              <div>
                <div className="text-xs text-nz-text-muted uppercase mb-1">Monetization</div>
                <div className="text-sm font-medium text-nz-text">{monetization || "\u2014"}</div>
              </div>
              <div>
                <div className="text-xs text-nz-text-muted uppercase mb-1">Platforms</div>
                <div className="text-sm font-medium text-nz-text">
                  {platforms.length > 0 ? platforms.join(", ") : "\u2014"}
                </div>
              </div>
              <div>
                <div className="text-xs text-nz-text-muted uppercase mb-1">Launch Window</div>
                <div className="text-sm font-medium text-nz-text">
                  {launchMonth && launchYear ? `${launchMonth} ${launchYear}` : "\u2014"}
                </div>
              </div>
              <div>
                <div className="text-xs text-nz-text-muted uppercase mb-1">Primary Market</div>
                <div className="text-sm font-medium text-nz-text">{primaryMarket || "\u2014"}</div>
              </div>
              <div>
                <div className="text-xs text-nz-text-muted uppercase mb-1">Secondary Markets</div>
                <div className="text-sm font-medium text-nz-text">
                  {secondaryMarkets.length > 0 ? secondaryMarkets.join(", ") : "\u2014"}
                </div>
              </div>
            </div>

            {/* Segment summary */}
            <h4 className="text-sm font-semibold text-nz-text mb-3">Segments</h4>
            <div className={`grid ${reviewGridCols} gap-4 mb-6`}>
              {wizardSegments.map((seg, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-nz-border overflow-hidden"
                >
                  <div className="h-1" style={{ backgroundColor: seg.color }} />
                  <div className="p-4">
                    <div className="text-xs font-medium text-nz-text-muted uppercase mb-1">
                      {seg.tier}
                    </div>
                    <h5 className="text-sm font-semibold text-nz-text mb-3">{seg.name}</h5>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-nz-text-secondary">Addressable Market</span>
                        <span className="font-semibold text-nz-text">
                          {seg.size > 0 ? formatNumber(seg.size) : "\u2014"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-nz-text-secondary">Conv. Rate</span>
                        <span className="font-semibold text-nz-text">
                          {seg.convRate > 0 ? `${seg.convRate}%` : "\u2014"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-nz-border flex justify-between">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-4 py-2 text-sm text-nz-text-secondary border border-nz-border rounded-lg hover:bg-nz-bg-subtle"
              >
                &larr; Back
              </button>
              <button
                type="button"
                onClick={handleCreate}
                className="px-6 py-2.5 bg-nz-accent text-white text-sm font-body font-medium rounded-card hover:bg-nz-accent-hover transition-colors"
              >
                Create Project &rarr;
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
