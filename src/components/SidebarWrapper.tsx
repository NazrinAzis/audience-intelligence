"use client";

import { useVersion } from "@/contexts/VersionContext";
import { Sidebar } from "@/components/Sidebar";

export function SidebarWrapper() {
  const { hasProjectModel } = useVersion();
  if (!hasProjectModel) return null;
  return <Sidebar />;
}
