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

  const projectId = isProjectPage ? pathname.split("/")[2] : null;

  const projectTitle = useProjectStore((s) => {
    if (!projectId) return "Project";
    const found = s.projects.find((p) => p.id === projectId);
    return found?.title ?? "Project";
  });

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
    <aside
      className="fixed left-0 top-0 bottom-0 w-[200px] flex flex-col z-50"
      style={{
        backgroundColor: "#F9FAFB",
        borderRight: "1px solid #E5E7EB",
      }}
    >
      {/* User header with avatar */}
      <div
        className="flex items-center gap-2.5 px-4 py-5"
        style={{ borderBottom: "1px solid #E5E7EB" }}
      >
        {/* "N" avatar */}
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            backgroundColor: "#1A1F36",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <span style={{ color: "#FFFFFF", fontSize: 13, fontWeight: 700, fontFamily: "Sora, sans-serif" }}>
            N
          </span>
        </div>
        <div>
          <div
            className="font-heading"
            style={{ fontSize: 14, fontWeight: 600, color: "#1A1F36", lineHeight: 1.2 }}
          >
            Naz
          </div>
          <div
            className="font-body"
            style={{ fontSize: 12, color: "#6B7280", lineHeight: 1.2 }}
          >
            Audience Intelligence
          </div>
        </div>
      </div>

      {/* Workspace nav */}
      <div>
        <div
          className="font-body uppercase"
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.08em",
            color: "#6B7280",
            padding: "16px 16px 4px 16px",
          }}
        >
          Workspace
        </div>
        {workspaceNav.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.label}
              href={item.href}
              className="flex items-center gap-2.5 font-body transition-colors"
              style={{
                fontSize: 14,
                fontWeight: 400,
                padding: "8px 16px",
                color: active ? "#00C9A7" : "#6B7280",
                backgroundColor: active ? "rgba(0,201,167,0.08)" : "transparent",
                borderLeft: active ? "3px solid #00C9A7" : "3px solid transparent",
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.03)";
                  e.currentTarget.style.color = "#1A1F36";
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.color = "#6B7280";
                }
              }}
            >
              {icons[item.icon]}
              {item.label}
            </Link>
          );
        })}
      </div>

      {/* Project nav */}
      {isProjectPage && (
        <div>
          <div
            className="font-body uppercase"
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.08em",
              color: "#6B7280",
              padding: "16px 16px 4px 16px",
            }}
          >
            {projectTitle}
          </div>
          {projectNav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center gap-2.5 font-body transition-colors"
                style={{
                  fontSize: 14,
                  fontWeight: 400,
                  padding: "8px 16px",
                  color: active ? "#00C9A7" : "#6B7280",
                  backgroundColor: active ? "rgba(0,201,167,0.08)" : "transparent",
                  borderLeft: active ? "3px solid #00C9A7" : "3px solid transparent",
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.03)";
                    e.currentTarget.style.color = "#1A1F36";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.color = "#6B7280";
                  }
                }}
              >
                {icons[item.icon]}
                {item.label}
              </Link>
            );
          })}
        </div>
      )}

      {/* Version label */}
      <div
        className="mt-auto font-body"
        style={{
          padding: "16px",
          borderTop: "1px solid #E5E7EB",
          fontSize: 11,
          color: "#9CA3AF",
        }}
      >
        v2.4.0
      </div>
    </aside>
  );
}
