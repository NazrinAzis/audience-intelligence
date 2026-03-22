"use client";

import { useVersion, ALL_VERSIONS, VERSION_CONFIGS, type AppVersion } from "@/contexts/VersionContext";

export function VersionSwitcher() {
  const { version, setVersion } = useVersion();

  return (
    <div className="flex items-center gap-0.5 bg-nz-bg-subtle rounded-full p-0.5">
      {ALL_VERSIONS.map((v) => {
        const cfg = VERSION_CONFIGS[v];
        const active = version === v;
        return (
          <button
            key={v}
            onClick={() => setVersion(v)}
            className="px-2.5 py-1 text-[11px] font-body font-semibold rounded-full transition-all whitespace-nowrap"
            style={
              active
                ? {
                    backgroundColor: cfg.color,
                    color: "#FFFFFF",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.12)",
                  }
                : {
                    backgroundColor: "transparent",
                    color: "#9CA3AF",
                    border: "1px solid transparent",
                  }
            }
            onMouseEnter={(e) => {
              if (!active) {
                e.currentTarget.style.color = "#1A1F36";
                e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.04)";
                e.currentTarget.style.borderColor = "#E5E7EB";
              }
            }}
            onMouseLeave={(e) => {
              if (!active) {
                e.currentTarget.style.color = "#9CA3AF";
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.borderColor = "transparent";
              }
            }}
          >
            {cfg.label}
          </button>
        );
      })}
    </div>
  );
}

export function VersionBanner() {
  const { config, bannerDismissed, dismissBanner } = useVersion();

  if (bannerDismissed) return null;

  return (
    <div
      className="flex items-center gap-3 px-6 py-2.5 text-sm font-body print:hidden"
      style={{
        backgroundColor: config.colorLight,
        borderBottom: `1px solid ${config.color}20`,
      }}
    >
      <span
        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
        style={{ backgroundColor: config.color, color: "#FFFFFF" }}
      >
        {config.version.toUpperCase()}
      </span>
      <span className="text-nz-text font-medium">{config.tagline}</span>
      <span className="text-nz-text-muted">&middot;</span>
      <span className="text-nz-text-secondary text-xs">{config.dataSource}</span>
      <button
        onClick={dismissBanner}
        className="ml-auto text-nz-text-muted hover:text-nz-text transition-colors shrink-0"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
