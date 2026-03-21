"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TopNav } from "@/components/TopNav";
import { MetricTooltip } from "@/components/MetricTooltip";
import { formatNumber } from "@/lib/mockData";
import { useProjectStore } from "@/lib/store";

// ─── Confirmation Modal ───

function DeleteModal({
  projectName,
  onCancel,
  onConfirm,
}: {
  projectName: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white rounded-card border border-nz-border w-full max-w-md p-6 z-10 shadow-card">
        <h3 className="text-base font-heading font-semibold text-nz-text mb-2">
          Delete {projectName}?
        </h3>
        <p className="text-sm font-body text-nz-text-secondary mb-6">
          This will permanently remove all segments, analysis results, and data
          for this project. This cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium font-body text-nz-text bg-white border border-nz-border rounded-card hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium font-body text-white bg-nz-red rounded-card hover:bg-[#DC2626] transition-colors"
          >
            Delete Project
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Card Menu ───

function CardMenu({
  projectId,
  projectName,
  canDelete,
  onDelete,
}: {
  projectId: string;
  projectName: string;
  canDelete: boolean;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(!open);
        }}
        className="w-6 h-6 rounded flex items-center justify-center text-nz-text-secondary hover:bg-nz-bg-subtle transition-colors"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <circle cx="10" cy="4" r="1.5" />
          <circle cx="10" cy="10" r="1.5" />
          <circle cx="10" cy="16" r="1.5" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-8 bg-white border border-nz-border rounded-card min-w-[160px] z-[9999] py-1 shadow-card">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOpen(false);
              router.push(`/projects/${projectId}/audience`);
            }}
            className="w-full text-left px-4 py-2 text-sm font-body text-nz-text hover:bg-nz-bg-subtle transition-colors"
          >
            Open Project
          </button>
          <div className="border-t border-nz-border mx-2 my-1" />
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOpen(false);
              if (canDelete) onDelete();
            }}
            disabled={!canDelete}
            className={`w-full text-left px-4 py-2 text-sm font-body flex items-center gap-2 transition-colors ${
              canDelete
                ? "text-nz-red hover:bg-red-50"
                : "text-nz-red/40 cursor-not-allowed"
            }`}
            title={canDelete ? undefined : "Cannot delete last project"}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete Project
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main ───

export default function DashboardPage() {
  const projects = useProjectStore((s) => s.projects);
  const deleteProject = useProjectStore((s) => s.deleteProject);
  const totalSegments = projects.reduce((sum, p) => sum + p.segments.length, 0);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  return (
    <div>
      <TopNav
        breadcrumbs={[{ label: "Workspace" }]}
        title="All Projects"
      />

      <div className="p-6">
        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-4 mb-6 max-w-md">
          <div className="bg-white rounded-card border border-nz-border p-4 shadow-card">
            <div className="text-[10px] font-body text-nz-text-secondary uppercase tracking-wider">Active Projects</div>
            <div className="text-3xl font-mono font-semibold text-nz-text mt-1">{projects.length}</div>
          </div>
          <div className="bg-white rounded-card border border-nz-border p-4 shadow-card">
            <div className="text-[10px] font-body text-nz-text-secondary uppercase tracking-wider">Segments Defined</div>
            <div className="text-3xl font-mono font-semibold text-nz-text mt-1">{totalSegments}</div>
          </div>
        </div>

        {/* Project grid */}
        <div className="grid grid-cols-3 gap-5">
          {projects.map((proj) => {
            const segs = proj.segments;
            const gradientColors =
              segs.length >= 2
                ? `linear-gradient(to right, ${segs[0].color}, ${segs[1].color})`
                : segs.length === 1
                ? segs[0].color
                : "#E5E7EB";

            return (
              <Link
                key={proj.id}
                href={`/projects/${proj.id}/audience`}
                className="bg-white rounded-card border border-nz-border shadow-card hover:shadow-card-hover transition-all overflow-hidden cursor-pointer group relative"
              >
                {/* Top gradient bar */}
                <div
                  className="h-1.5"
                  style={{ background: gradientColors }}
                />

                {/* ⋯ menu */}
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <CardMenu
                    projectId={proj.id}
                    projectName={proj.title}
                    canDelete={projects.length > 1}
                    onDelete={() => setDeleteTarget({ id: proj.id, name: proj.title })}
                  />
                </div>

                <div className="p-5">
                  {/* Title + badges */}
                  <h3 className="text-base font-heading font-semibold text-nz-text group-hover:text-nz-primary transition-colors pr-8">
                    {proj.title}
                  </h3>
                  <div className="flex gap-2 mt-2">
                    {proj.lifecycle && (
                      <span className="text-[11px] font-medium font-body px-2 py-0.5 rounded-full bg-nz-teal/10 text-nz-teal">
                        {proj.lifecycle}
                      </span>
                    )}
                    {proj.monetization && (
                      <span className="text-[11px] font-medium font-body px-2 py-0.5 rounded-full bg-nz-bg-subtle text-nz-text-secondary">
                        {proj.monetization}
                      </span>
                    )}
                  </div>

                  {/* Segment bars */}
                  <div className="mt-4 space-y-2.5">
                    {segs.map((seg, i) => (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] font-body text-nz-text-secondary">{seg.name}</span>
                          <span className="text-[11px] font-mono font-semibold text-nz-text">
                            {seg.conversionRate > 0 ? `${seg.conversionRate}%` : "\u2014"}
                          </span>
                        </div>
                        {seg.conversionRate > 0 && (
                          <div className="h-1.5 bg-nz-bg-subtle rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.min(seg.conversionRate * 5, 100)}%`,
                                backgroundColor: seg.color,
                              }}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Bottom stats */}
                  <div className="mt-5 pt-4 border-t border-nz-border grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-[10px] font-body text-nz-text-secondary uppercase tracking-wider">
                        <MetricTooltip
                          label="Market"
                          definition="Unique players behaviorally qualified for your game across all segments. De-duplicated so each player is counted once."
                          whyItMatters="Tells you the real size of your targetable audience — not the full gaming population."
                        />
                      </div>
                      <div className="text-sm font-mono font-semibold text-nz-text mt-0.5">
                        {proj.totalAddressableAudience > 0
                          ? formatNumber(proj.totalAddressableAudience)
                          : "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-body text-nz-text-secondary uppercase tracking-wider">
                        <MetricTooltip
                          label="Adopters"
                          definition="Players who purchased and played your game, drawn from the addressable market."
                          whyItMatters="Your actual conversion pool. Compare against addressable to gauge campaign headroom."
                        />
                      </div>
                      <div className="text-sm font-mono font-semibold text-nz-text mt-0.5">
                        {proj.totalAdopters > 0
                          ? formatNumber(proj.totalAdopters)
                          : "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-body text-nz-text-secondary uppercase tracking-wider">
                        <MetricTooltip
                          label="Conv %"
                          definition="Adopters / Addressable Market x 100."
                          whyItMatters="Your efficiency rate. Higher = your segments are well-targeted."
                        />
                      </div>
                      <div className="text-sm font-mono font-semibold text-nz-text mt-0.5">
                        {proj.generalPopConversionRate > 0
                          ? `${proj.generalPopConversionRate}%`
                          : "—"}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}

          {/* New Project card */}
          <Link
            href="/projects/new"
            className="rounded-card border-2 border-dashed border-nz-border hover:border-nz-primary/40 flex flex-col items-center justify-center py-16 cursor-pointer group transition-colors"
          >
            <div className="w-12 h-12 rounded-full bg-nz-bg-subtle flex items-center justify-center mb-3 group-hover:bg-nz-primary-light transition-colors">
              <svg className="w-6 h-6 text-nz-text-muted group-hover:text-nz-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <span className="text-sm font-body font-medium text-nz-text-secondary group-hover:text-nz-primary transition-colors">
              New Project
            </span>
            <span className="text-xs font-body text-nz-text-muted mt-1">Any lifecycle stage</span>
          </Link>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <DeleteModal
          projectName={deleteTarget.name}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => {
            deleteProject(deleteTarget.id);
            setDeleteTarget(null);
          }}
        />
      )}
    </div>
  );
}
