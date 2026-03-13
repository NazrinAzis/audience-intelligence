import { create } from "zustand";
import { persist } from "zustand/middleware";
import { project as kcd2Project, segments as kcd2Segments } from "./mockData";
import type { QueryRule, DemographicRule, PsychographicRule, MonetizationRule } from "@/components/SegmentBuilder";

// ─── Types ───

export interface ComparableTitle {
  title: string;
  convRate: number;
  similarity: number;
  genre: string;
  year: number;
}

export interface SegmentData {
  name: string;
  tier: string;
  color: string;
  addressableMarket: number;
  conversionRate: number;
  // Benchmark data (Greenlight / Pre-Launch)
  benchmarkConvLow?: number;
  benchmarkConvMid?: number;
  benchmarkConvHigh?: number;
  comparableTitles?: ComparableTitle[];
  confidence?: "High" | "Medium" | "Low";
  // Priority
  priorityScore?: number;
}

export interface ProjectData {
  id: string;
  title: string;
  lifecycle: string;
  monetization: string;
  launchDate: string;
  platforms: string[];
  primaryMarket: string;
  secondaryMarkets: string[];
  totalAddressableAudience: number;
  totalTrackedUsers: number;
  generalPopConversionRate: number;
  totalAdopters: number;
  segments: SegmentData[];
}

export interface WizardSegment {
  name: string;
  tier: string;
  color: string;
  rules: QueryRule[];
  demoRules: DemographicRule[];
  psychoRules: PsychographicRule[];
  moneyRules: MonetizationRule[];
  analyzed: boolean;
  size: number;
  convRate: number;
}

interface WizardForm {
  lifecycle: string;
  monetization: string;
  gameTitle: string;
  projectName: string;
  launchMonth: string;
  launchYear: string;
  platforms: string[];
  primaryMarket: string;
  secondaryMarkets: string[];
}

interface ProjectStore {
  projects: ProjectData[];
  wizardForm: WizardForm;
  wizardSegments: WizardSegment[];
  setWizardField: <K extends keyof WizardForm>(key: K, value: WizardForm[K]) => void;
  setWizardSegments: (segments: WizardSegment[]) => void;
  createProject: () => string;
  resetWizard: () => void;
  /** Sync segment builder state into project store */
  syncProjectSegments: (
    projectId: string,
    builderSegments: {
      name: string;
      color: string;
      analyzed: boolean;
      size: number;
      convRate: number;
      benchmarkConvLow?: number;
      benchmarkConvMid?: number;
      benchmarkConvHigh?: number;
      comparableTitles?: ComparableTitle[];
      confidence?: "High" | "Medium" | "Low";
    }[]
  ) => void;
  /** Delete a project by ID (also clears its localStorage keys) */
  deleteProject: (projectId: string) => void;
  /** Update benchmark data for a specific segment */
  updateSegmentBenchmark: (
    projectId: string,
    segmentIndex: number,
    benchmark: {
      benchmarkConvLow: number;
      benchmarkConvMid: number;
      benchmarkConvHigh: number;
      comparableTitles: ComparableTitle[];
      confidence: "High" | "Medium" | "Low";
    }
  ) => void;
}

// ─── Helpers ───

function toSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

const SEGMENT_COLORS = ["#4F46E5", "#00C2A8", "#F6A623", "#805AD5", "#A0AEC0"];
const TIERS = ["Core", "Secondary", "Tertiary", "Quaternary", "Additional"];

const initialWizardForm: WizardForm = {
  lifecycle: "",
  monetization: "",
  gameTitle: "",
  projectName: "",
  launchMonth: "",
  launchYear: "",
  platforms: [],
  primaryMarket: "Global",
  secondaryMarkets: [],
};

const initialWizardSegments: WizardSegment[] = [
  { name: "Segment 1", tier: TIERS[0], color: SEGMENT_COLORS[0], rules: [], demoRules: [], psychoRules: [], moneyRules: [], analyzed: false, size: 0, convRate: 0 },
];

// ─── Seed KCD2 ───

const kcd2Seed: ProjectData = {
  id: kcd2Project.id,
  title: kcd2Project.title,
  lifecycle: kcd2Project.lifecycle,
  monetization: kcd2Project.monetization,
  launchDate: kcd2Project.launchDate,
  platforms: kcd2Project.platforms,
  primaryMarket: kcd2Project.primaryMarket,
  secondaryMarkets: [],
  totalAddressableAudience: kcd2Project.totalAddressableAudience,
  totalTrackedUsers: kcd2Project.totalTrackedUsers,
  generalPopConversionRate: kcd2Project.generalPopConversionRate,
  totalAdopters: kcd2Project.totalAdopters,
  segments: kcd2Segments.map((s) => ({
    name: s.name,
    tier: s.tier,
    color: s.color,
    addressableMarket: s.addressableMarket,
    conversionRate: s.conversionRate,
  })),
};

// ─── Store ───

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set, get) => ({
  projects: [kcd2Seed],
  wizardForm: { ...initialWizardForm },
  wizardSegments: initialWizardSegments.map((s) => ({ ...s, rules: [], demoRules: [], psychoRules: [], moneyRules: [] })),

  setWizardField: (key, value) =>
    set((state) => ({ wizardForm: { ...state.wizardForm, [key]: value } })),

  setWizardSegments: (segments) => set({ wizardSegments: segments }),

  createProject: () => {
    const { wizardForm, wizardSegments, projects } = get();
    const title = wizardForm.gameTitle || wizardForm.projectName || "Untitled Project";
    let slug = toSlug(title);

    const existingIds = new Set(projects.map((p) => p.id));
    if (existingIds.has(slug)) {
      let counter = 2;
      while (existingIds.has(`${slug}-${counter}`)) counter++;
      slug = `${slug}-${counter}`;
    }

    const totalSize = wizardSegments.reduce((sum, s) => sum + s.size, 0);
    const avgConv =
      wizardSegments.filter((s) => s.convRate > 0).length > 0
        ? wizardSegments.reduce((sum, s) => sum + s.convRate, 0) /
          wizardSegments.filter((s) => s.convRate > 0).length
        : 0;

    const newProject: ProjectData = {
      id: slug,
      title,
      lifecycle: wizardForm.lifecycle,
      monetization: wizardForm.monetization,
      launchDate: wizardForm.launchMonth && wizardForm.launchYear
        ? `${wizardForm.launchMonth} ${wizardForm.launchYear}`
        : "",
      platforms: wizardForm.platforms,
      primaryMarket: wizardForm.primaryMarket,
      secondaryMarkets: wizardForm.secondaryMarkets,
      totalAddressableAudience: totalSize,
      totalTrackedUsers: Math.round(totalSize * 7.5),
      generalPopConversionRate: Math.round(avgConv * 100) / 100,
      totalAdopters: Math.round(totalSize * (avgConv / 100)),
      segments: wizardSegments.map((s) => ({
        name: s.name,
        tier: s.tier,
        color: s.color,
        addressableMarket: s.size,
        conversionRate: s.convRate,
      })),
    };

    set((state) => ({
      projects: [...state.projects, newProject],
      wizardForm: { ...initialWizardForm },
      wizardSegments: initialWizardSegments.map((s) => ({ ...s, rules: [], demoRules: [], psychoRules: [], moneyRules: [] })),
    }));

    return slug;
  },

  resetWizard: () =>
    set({
      wizardForm: { ...initialWizardForm },
      wizardSegments: initialWizardSegments.map((s) => ({ ...s, rules: [], demoRules: [], psychoRules: [], moneyRules: [] })),
    }),

  syncProjectSegments: (projectId, builderSegments) =>
    set((state) => ({
      projects: state.projects.map((p) => {
        if (p.id !== projectId) return p;
        // Assign tiers by descending convRate among analyzed segments
        const analyzed = builderSegments
          .map((s, i) => ({ ...s, i }))
          .filter((s) => s.analyzed && s.convRate > 0);
        analyzed.sort((a, b) => b.convRate - a.convRate);
        const tierMap = new Map<number, string>();
        analyzed.forEach((s, rank) => {
          tierMap.set(s.i, TIERS[rank] || TIERS[TIERS.length - 1]);
        });

        const newSegments: SegmentData[] = builderSegments.map((s, i) => ({
          name: s.name,
          tier: tierMap.get(i) || (p.segments[i]?.tier ?? TIERS[Math.min(i, TIERS.length - 1)]),
          color: s.color || SEGMENT_COLORS[i] || SEGMENT_COLORS[0],
          addressableMarket: s.size,
          conversionRate: s.convRate,
          benchmarkConvLow: s.benchmarkConvLow ?? p.segments[i]?.benchmarkConvLow,
          benchmarkConvMid: s.benchmarkConvMid ?? p.segments[i]?.benchmarkConvMid,
          benchmarkConvHigh: s.benchmarkConvHigh ?? p.segments[i]?.benchmarkConvHigh,
          comparableTitles: s.comparableTitles ?? p.segments[i]?.comparableTitles,
          confidence: s.confidence ?? p.segments[i]?.confidence,
          priorityScore: p.segments[i]?.priorityScore,
        }));

        const totalSize = newSegments.reduce((sum, s) => sum + s.addressableMarket, 0);
        const analyzedSegs = newSegments.filter((s) => s.conversionRate > 0);
        const avgConv =
          analyzedSegs.length > 0
            ? analyzedSegs.reduce((sum, s) => sum + s.conversionRate, 0) / analyzedSegs.length
            : p.generalPopConversionRate;

        return {
          ...p,
          segments: newSegments,
          totalAddressableAudience: totalSize || p.totalAddressableAudience,
          totalTrackedUsers: totalSize ? Math.round(totalSize * 7.5) : p.totalTrackedUsers,
          generalPopConversionRate: Math.round(avgConv * 100) / 100,
          totalAdopters: totalSize
            ? Math.round(totalSize * (avgConv / 100))
            : p.totalAdopters,
        };
      }),
    })),

  deleteProject: (projectId) => {
    // Remove all localStorage keys for this project
    if (typeof window !== "undefined") {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(`project_${projectId}_`)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    }
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== projectId),
    }));
  },

  updateSegmentBenchmark: (projectId, segmentIndex, benchmark) =>
    set((state) => ({
      projects: state.projects.map((p) => {
        if (p.id !== projectId) return p;
        const segments = p.segments.map((s, i) => {
          if (i !== segmentIndex) return s;
          return { ...s, ...benchmark };
        });
        return { ...p, segments };
      }),
    })),
    }),
    {
      name: "nz-project-store",
      partialize: (state) => ({
        projects: state.projects,
        wizardForm: state.wizardForm,
        wizardSegments: state.wizardSegments,
      }),
    }
  )
);
