"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useProjectStore } from "@/lib/store";

const workspaceNav = [
  { label: "All Projects", href: "/dashboard", icon: "grid" },
];

const icons: Record<string, React.ReactNode> = {
  grid: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
    </svg>
  ),
  users: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  chart: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  eye: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ),
  layers: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  ),
  user: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  target: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
    </svg>
  ),
  trending: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  ),
};

export function Sidebar() {
  const pathname = usePathname();
  const isProjectPage = pathname.startsWith("/projects/") && !pathname.endsWith("/new");

  // Extract project ID from URL
  const projectId = isProjectPage ? pathname.split("/")[2] : null;

  // Look up project title from store
  const projectTitle = useProjectStore((s) => {
    if (!projectId) return "Project";
    const found = s.projects.find((p) => p.id === projectId);
    return found?.title ?? "Project";
  });

  // Build dynamic project nav
  const projectNav = projectId
    ? [
        { label: "Overview", href: `/projects/${projectId}/audience`, icon: "eye" },
        { label: "Segments", href: `/projects/${projectId}/segments`, icon: "layers" },
        { label: "Profile", href: `/projects/${projectId}/profile`, icon: "user" },
        { label: "Audience", href: `/projects/${projectId}/audience`, icon: "target" },
        { label: "Performance", href: `/projects/${projectId}/performance`, icon: "trending" },
      ]
    : [];

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[200px] bg-nz-sidebar text-white flex flex-col z-50">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
        <div className="text-lg font-bold tracking-tight">Newzoo</div>
        <div className="text-[11px] text-[#94A3B8] mt-0.5">Audience Intelligence</div>
      </div>

      {/* Workspace nav */}
      <div className="mt-4 px-2">
        <div className="px-3 text-[10px] font-semibold uppercase tracking-wider text-nz-green mb-2">
          Workspace
        </div>
        {workspaceNav.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] transition-colors mb-0.5 ${
                active
                  ? "text-white font-medium"
                  : "text-[#94A3B8] hover:text-white"
              }`}
            >
              {icons[item.icon]}
              {item.label}
            </Link>
          );
        })}
      </div>

      {/* Project nav — only when inside a project */}
      {isProjectPage && (
        <div className="mt-4 px-2">
          <div className="px-3 text-[10px] font-semibold uppercase tracking-wider text-nz-green mb-1">
            {projectTitle}
          </div>
          {projectNav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] transition-colors mb-0.5 ${
                  active
                    ? "text-white font-medium"
                    : "text-[#94A3B8] hover:text-white"
                }`}
              >
                {icons[item.icon]}
                {item.label}
              </Link>
            );
          })}
        </div>
      )}

      {/* Bottom */}
      <div className="mt-auto px-5 py-4 border-t border-white/10">
        <div className="text-[11px] text-white/30">v2.4.0</div>
      </div>
    </aside>
  );
}
