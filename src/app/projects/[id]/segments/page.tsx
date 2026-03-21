"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { TopNav } from "@/components/TopNav";
import { SegmentBuilder, emptyRule, emptyColumn, migrateColumn } from "@/components/SegmentBuilder";
import type { SegmentColumn } from "@/components/SegmentBuilder";
import { segments as segmentData } from "@/lib/mockData";
import { useProjectStore } from "@/lib/store";

/** Project-namespaced localStorage key for segment builder columns */
function segmentsStorageKey(projectId: string): string {
  return `project_${projectId}_segments`;
}

/** KCD2 segment names — used only for corruption detection */
const KCD2_SEGMENT_NAMES = [
  "Simulation RPG Purists",
  "Mastery Combat Fans",
  "Historical Explorers",
];

/** SSR-safe default columns (no localStorage access). */
function getDefaultColumns(projectId: string): SegmentColumn[] {
  if (projectId === "kcd2") {
    return [
      {
        ...emptyColumn(0),
        name: segmentData[0].name,
        playRules: [
          { ...emptyRule(), id: 1, ruleType: "played", entityType: "subGenre", entityValue: "Action RPG" },
          { ...emptyRule(), id: 2, ruleType: "played", entityType: "theme", entityValue: "Historic — Medieval" },
          { ...emptyRule(), id: 3, ruleType: "played", entityType: "genre", entityValue: "Simulation" },
        ],
        size: segmentData[0].addressableMarket,
        convRate: segmentData[0].conversionRate,
        gamesCount: 147,
      },
      {
        ...emptyColumn(1),
        name: segmentData[1].name,
        playRules: [
          { ...emptyRule(), id: 4, ruleType: "played", entityType: "subGenre", entityValue: "Souls-like" },
          { ...emptyRule(), id: 5, ruleType: "played", entityType: "subGenre", entityValue: "Action RPG", minHours: 50, gameCount: 3 },
        ],
        size: segmentData[1].addressableMarket,
        convRate: segmentData[1].conversionRate,
        gamesCount: 213,
      },
      {
        ...emptyColumn(2),
        name: segmentData[2].name,
        playRules: [
          { ...emptyRule(), id: 6, ruleType: "played", entityType: "theme", entityValue: "Historic — Medieval" },
          { ...emptyRule(), id: 7, ruleType: "played", entityType: "genre", entityValue: "Adventure" },
        ],
        size: segmentData[2].addressableMarket,
        convRate: segmentData[2].conversionRate,
        gamesCount: 89,
      },
    ];
  }
  return [emptyColumn(0)];
}

/** Load columns from localStorage (client-only). Returns null if nothing saved. */
function loadColumnsFromStorage(projectId: string): SegmentColumn[] | null {
  const saved = localStorage.getItem(segmentsStorageKey(projectId));
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Guard: if a non-kcd2 project somehow has KCD2 names, discard
        if (
          projectId !== "kcd2" &&
          parsed.some((s: Record<string, unknown>) =>
            KCD2_SEGMENT_NAMES.includes(s.name as string)
          )
        ) {
          localStorage.removeItem(segmentsStorageKey(projectId));
        } else {
          return parsed.map((item: Record<string, unknown>) => migrateColumn(item));
        }
      }
    } catch {
      // corrupted localStorage — fall through
    }
  }

  // Migrate from old key format (nz_segments_) if present
  const oldKey = `nz_segments_${projectId}`;
  const oldSaved = localStorage.getItem(oldKey);
  if (oldSaved) {
    try {
      const parsed = JSON.parse(oldSaved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const isCorrupted =
          projectId !== "kcd2" &&
          parsed.some((s: Record<string, unknown>) =>
            KCD2_SEGMENT_NAMES.includes(s.name as string)
          );
        if (!isCorrupted) {
          const migrated = parsed.map((item: Record<string, unknown>) => migrateColumn(item));
          localStorage.setItem(segmentsStorageKey(projectId), JSON.stringify(migrated));
          localStorage.removeItem(oldKey);
          return migrated;
        }
      }
    } catch { /* ignore */ }
    localStorage.removeItem(oldKey);
  }

  return null;
}

const SEGMENT_COLORS = ["#4F46E5", "#00C2A8", "#F6A623", "#805AD5", "#A0AEC0"];

export default function SegmentsPage() {
  const params = useParams();
  const projectId = params.id as string;
  const project = useProjectStore((s) => s.projects.find((p) => p.id === projectId));
  const syncProjectSegments = useProjectStore((s) => s.syncProjectSegments);
  const projectTitle = project?.title ?? "Project";

  const [columns, setColumns] = useState<SegmentColumn[]>(() =>
    getDefaultColumns(projectId)
  );

  // Hydrate from localStorage after mount (avoids SSR/client mismatch)
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (!hydratedRef.current) {
      hydratedRef.current = true;
      const saved = loadColumnsFromStorage(projectId);
      if (saved) {
        setColumns(saved);
        return; // the setColumns will re-trigger the persist effect below
      }
    }
  }, [projectId]);

  // Persist to localStorage AND sync to Zustand store on every change
  const isInitialMount = useRef(true);
  useEffect(() => {
    // Skip persisting the SSR default before hydration completes
    if (!hydratedRef.current) return;
    localStorage.setItem(segmentsStorageKey(projectId), JSON.stringify(columns));
    // Sync segment summary data into the project store
    syncProjectSegments(
      projectId,
      columns.map((col, i) => ({
        name: col.name,
        color: SEGMENT_COLORS[i] || SEGMENT_COLORS[0],
        analyzed: col.analyzed,
        size: col.size,
        convRate: col.convRate,
        benchmarkConvLow: col.benchmarkConvLow ?? undefined,
        benchmarkConvMid: col.benchmarkConvMid ?? undefined,
        benchmarkConvHigh: col.benchmarkConvHigh ?? undefined,
        comparableTitles: (col.comparableTitles ?? []).length > 0 ? col.comparableTitles : undefined,
        confidence: (col.benchmarkConvMid ?? 0) > 0 ? (col.confidence ?? "Medium") : undefined,
      }))
    );
    isInitialMount.current = false;
  }, [columns, projectId, syncProjectSegments]);

  const projectContext = project
    ? {
        title: project.title,
        lifecycle: project.lifecycle,
        monetization: project.monetization,
        platforms: project.platforms,
        primaryMarket: project.primaryMarket,
      }
    : undefined;

  return (
    <div>
      <TopNav
        breadcrumbs={[
          { label: "Workspace", href: "/dashboard" },
          { label: projectTitle },
          { label: "Segments" },
        ]}
        title="Segment Builder"
      />

      <div className="p-6">
        {/* Info banner */}
        <div className="flex items-start gap-3 px-4 py-3 bg-nz-primary-light border border-nz-primary/20 rounded-card mb-5">
          <svg className="w-5 h-5 text-nz-primary mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <p className="text-sm text-nz-text-secondary">
            Define audience segments across four dimensions: behavioral, demographic, psychographic, and monetization.
            Each segment is independently defined. Use AND/OR connectors to combine rules.
          </p>
        </div>

        <SegmentBuilder
          columns={columns}
          onChange={setColumns}
          projectId={projectId}
          projectContext={projectContext}
        />
      </div>
    </div>
  );
}
