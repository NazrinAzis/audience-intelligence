"use client";

import { useVersion } from "@/contexts/VersionContext";
import { VersionBanner } from "@/components/VersionSwitcher";

export function LayoutInner({ children }: { children: React.ReactNode }) {
  const { hasProjectModel } = useVersion();

  return (
    <main className={`flex-1 min-w-0 min-h-screen ${hasProjectModel ? "ml-[200px]" : ""}`}>
      <VersionBanner />
      {children}
    </main>
  );
}
