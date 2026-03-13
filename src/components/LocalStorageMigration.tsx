"use client";

import { useEffect } from "react";
import { useProjectStore } from "@/lib/store";

const KCD2_SEGMENT_NAMES = [
  "Simulation RPG Purists",
  "Mastery Combat Fans",
  "Historical Explorers",
];

const SEGMENT_COLORS = ["#4F46E5", "#00C2A8", "#F6A623", "#805AD5", "#A0AEC0"];

const MIGRATION_KEY = "nz_localStorage_migration_v2";

/**
 * Runs on app startup:
 * 1. One-time migration: clears corrupted localStorage for non-kcd2 projects
 * 2. Reconciles segment count between localStorage builder state and the Zustand store
 */
export function LocalStorageMigration() {
  const projects = useProjectStore((s) => s.projects);
  const syncProjectSegments = useProjectStore((s) => s.syncProjectSegments);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // --- Phase 1: one-time corruption cleanup ---
    if (!localStorage.getItem(MIGRATION_KEY)) {
      for (const project of projects) {
        if (project.id === "kcd2") continue;

        for (const key of [
          `project_${project.id}_segments`,
          `nz_segments_${project.id}`,
        ]) {
          const saved = localStorage.getItem(key);
          if (saved) {
            try {
              const segs = JSON.parse(saved);
              const isCorrupted =
                Array.isArray(segs) &&
                segs.some((s: { name?: string }) =>
                  KCD2_SEGMENT_NAMES.includes(s.name ?? "")
                );
              if (isCorrupted) {
                localStorage.removeItem(key);
              }
            } catch {
              localStorage.removeItem(key);
            }
          }
        }
      }
      localStorage.setItem(MIGRATION_KEY, Date.now().toString());
    }

    // --- Phase 2: reconcile localStorage builder state → store ---
    for (const project of projects) {
      if (project.id === "kcd2") continue;

      const key = `project_${project.id}_segments`;
      const saved = localStorage.getItem(key);
      if (!saved) continue;

      try {
        const builderSegs = JSON.parse(saved);
        if (!Array.isArray(builderSegs) || builderSegs.length === 0) continue;

        // Check if store segments count differs from builder
        const storeCount = project.segments?.length ?? 0;
        const builderCount = builderSegs.length;
        const needsSync = storeCount !== builderCount ||
          builderSegs.some((bs: { name?: string; analyzed?: boolean; size?: number; convRate?: number }, i: number) => {
            const ss = project.segments?.[i];
            if (!ss) return true;
            return ss.name !== (bs.name ?? "") ||
              (bs.analyzed && ss.addressableMarket !== (bs.size ?? 0));
          });

        if (needsSync) {
          syncProjectSegments(
            project.id,
            builderSegs.map((col: { name?: string; analyzed?: boolean; size?: number; convRate?: number }, i: number) => ({
              name: col.name ?? `Segment ${i + 1}`,
              color: SEGMENT_COLORS[i] || SEGMENT_COLORS[0],
              analyzed: col.analyzed ?? false,
              size: col.size ?? 0,
              convRate: col.convRate ?? 0,
            }))
          );
        }
      } catch { /* ignore corrupted data */ }
    }
  }, [projects, syncProjectSegments]);

  return null;
}
