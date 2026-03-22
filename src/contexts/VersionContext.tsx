"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";

// ─── Types ───

export type AppVersion = "v0" | "v1" | "v2" | "v3" | "v4" | "v5";

export interface VersionConfig {
  version: AppVersion;
  label: string;
  tagline: string;
  dataSource: string;
  color: string;
  colorLight: string;
}

// ─── Version definitions ───

export const VERSION_CONFIGS: Record<AppVersion, VersionConfig> = {
  v0: {
    version: "v0",
    label: "V0",
    tagline: "Who is engaging with games in my genre?",
    dataSource: "GPME behavioral data only",
    color: "#6B7280",
    colorLight: "#F3F4F6",
  },
  v1: {
    version: "v1",
    label: "V1",
    tagline: "Who are those players, really?",
    dataSource: "GPME behavioral + GHT demographic + psychographic via Data Fusion",
    color: "#00C9A7",
    colorLight: "#F0FDF9",
  },
  v2: {
    version: "v2",
    label: "V2",
    tagline: "Which audience segment should I prioritize?",
    dataSource: "GPME behavioral data — multi-segment analysis",
    color: "#805AD5",
    colorLight: "#FAF5FF",
  },
  v3: {
    version: "v3",
    label: "V3",
    tagline: "Is my target segment growing or shrinking?",
    dataSource: "GPME behavioral data — longitudinal tracking",
    color: "#6B21A8",
    colorLight: "#F5F3FF",
  },
  v4: {
    version: "v4",
    label: "V4",
    tagline: "Full audience strategy — segments, enrichment, over time, all connected.",
    dataSource: "Full Data Fusion + GPMR integration",
    color: "#F97316",
    colorLight: "#FFF7ED",
  },
  v5: {
    version: "v5",
    label: "V5",
    tagline: "Describe your ideal player. We'll build the strategy.",
    dataSource: "Full Data Fusion + GPMR + AI-assisted segment building",
    color: "#D97706",
    colorLight: "#FFFBEB",
  },
};

export const ALL_VERSIONS: AppVersion[] = ["v0", "v1", "v2", "v3", "v4", "v5"];

// ─── Dimension visibility ───

type Dimension = "play" | "demo" | "psycho" | "money";

const DIMENSION_VISIBILITY: Record<AppVersion, Record<Dimension, boolean>> = {
  v0: { play: true, demo: false, psycho: false, money: false },
  v1: { play: true, demo: true, psycho: true, money: true },
  v2: { play: true, demo: false, psycho: false, money: false },
  v3: { play: true, demo: false, psycho: false, money: false },
  v4: { play: true, demo: true, psycho: true, money: true },
  v5: { play: true, demo: true, psycho: true, money: true },
};

export function isDimensionVisible(dimension: Dimension, version: AppVersion): boolean {
  return DIMENSION_VISIBILITY[version][dimension];
}

// ─── Version number helpers ───

const VERSION_ORDER: Record<AppVersion, number> = { v0: 0, v1: 1, v2: 2, v3: 3, v4: 4, v5: 5 };

export function useVersionGate(minVersion: AppVersion): boolean {
  const { version } = useVersion();
  return VERSION_ORDER[version] >= VERSION_ORDER[minVersion];
}

// ─── Context ───

interface VersionContextValue {
  version: AppVersion;
  setVersion: (v: AppVersion) => void;
  config: VersionConfig;
  /** Whether a given segment builder dimension is visible (not locked — just absent when false) */
  isDimVisible: (dimension: Dimension) => boolean;
  /** Whether the project model (multi-project, sidebar project nav) is active */
  hasProjectModel: boolean;
  /** Whether multiple segments are supported */
  hasMultiSegment: boolean;
  /** Whether the bullseye chart should show */
  showBullseye: boolean;
  /** Whether conversion rate data should show */
  showConversionRate: boolean;
  /** Whether the Campaign Brief button should show */
  showCampaignBrief: boolean;
  /** Whether the Export button should show */
  showExport: boolean;
  /** Whether the Performance tab should show */
  showPerformance: boolean;
  /** Whether segment overlap analysis should show */
  showOverlap: boolean;
  /** Whether trend indicators should show on segment cards */
  showTrends: boolean;
  /** Whether the AI-assisted segment builder mode should show */
  showAIMode: boolean;
  /** Whether the version banner has been dismissed this session */
  bannerDismissed: boolean;
  dismissBanner: () => void;
}

const VersionContext = createContext<VersionContextValue | null>(null);

const STORAGE_KEY = "ai_version";
const BANNER_SESSION_KEY = "ai_version_banner_dismissed";

export function VersionProvider({ children }: { children: ReactNode }) {
  const [version, setVersionState] = useState<AppVersion>("v1");
  const [mounted, setMounted] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && stored in VERSION_CONFIGS) {
      setVersionState(stored as AppVersion);
      // Check sessionStorage for banner dismiss state
      const dismissed = sessionStorage.getItem(`${BANNER_SESSION_KEY}_${stored}`);
      if (dismissed === "true") setBannerDismissed(true);
    }
    setMounted(true);
  }, []);

  const setVersion = useCallback((v: AppVersion) => {
    localStorage.setItem(STORAGE_KEY, v);
    sessionStorage.removeItem(`${BANNER_SESSION_KEY}_${v}`);

    // Full page reload so Zustand store re-initializes with version-scoped key
    window.location.href = "/dashboard";
  }, []);

  const dismissBanner = useCallback(() => {
    setBannerDismissed(true);
    sessionStorage.setItem(`${BANNER_SESSION_KEY}_${version}`, "true");
  }, [version]);

  const config = VERSION_CONFIGS[version];
  const vNum = VERSION_ORDER[version];

  const value: VersionContextValue = {
    version,
    setVersion,
    config,
    isDimVisible: (dim) => isDimensionVisible(dim, version),
    hasProjectModel: vNum >= 2,
    hasMultiSegment: vNum >= 2,
    showBullseye: vNum >= 2,
    showConversionRate: vNum >= 1,
    showCampaignBrief: vNum >= 4,
    showExport: vNum >= 4,
    showPerformance: vNum >= 3,
    showOverlap: vNum >= 2,
    showTrends: vNum >= 3,
    showAIMode: vNum >= 5,
    bannerDismissed,
    dismissBanner,
  };

  if (!mounted) return null;

  return (
    <VersionContext.Provider value={value}>
      {children}
    </VersionContext.Provider>
  );
}

export function useVersion(): VersionContextValue {
  const ctx = useContext(VersionContext);
  if (!ctx) {
    throw new Error("useVersion must be used within a VersionProvider");
  }
  return ctx;
}
