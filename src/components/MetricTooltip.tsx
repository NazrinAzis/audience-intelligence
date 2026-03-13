"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";

interface MetricTooltipProps {
  label: string;
  definition: string;
  whyItMatters: string;
  formula?: string;
  caveat?: string;
  interpretation?: string;
  /** Extra sections rendered after the standard ones */
  extraSections?: { label: string; body: string; color?: string }[];
}

interface Position {
  top: number;
  left: number;
  arrowLeft: number;
  above: boolean;
  alignRight: boolean;
}

const TOOLTIP_MAX_W = 320;
const TOOLTIP_MIN_W = 200;
const GAP = 8;

function computePosition(triggerRect: DOMRect): Position {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Default: below the icon, horizontally centered on it
  let above = false;
  let left = triggerRect.left + triggerRect.width / 2 - TOOLTIP_MAX_W / 2;
  let alignRight = false;

  // Flip above if not enough room below
  const spaceBelow = vh - triggerRect.bottom - GAP;
  const spaceAbove = triggerRect.top - GAP;
  if (spaceBelow < 180 && spaceAbove > spaceBelow) {
    above = true;
  }

  // Clamp horizontal to viewport
  if (left < 8) {
    left = 8;
  } else if (left + TOOLTIP_MAX_W > vw - 8) {
    left = vw - TOOLTIP_MAX_W - 8;
    alignRight = true;
  }

  const arrowLeft = Math.max(12, Math.min(TOOLTIP_MAX_W - 12, triggerRect.left + triggerRect.width / 2 - left));

  const top = above
    ? triggerRect.top - GAP // will use bottom anchor via transform
    : triggerRect.bottom + GAP;

  return { top, left, arrowLeft, above, alignRight };
}

function TooltipPortal({ position, children }: { position: Position; children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  return createPortal(
    <div
      style={{
        position: "fixed",
        zIndex: 9999,
        top: position.top,
        left: position.left,
        transform: position.above ? "translateY(-100%)" : undefined,
        maxWidth: TOOLTIP_MAX_W,
        minWidth: TOOLTIP_MIN_W,
        pointerEvents: "none",
      }}
    >
      {children}
    </div>,
    document.body,
  );
}

function Divider() {
  return <div style={{ height: 1, background: "rgba(255,255,255,0.1)", margin: "8px 0" }} />;
}

function Section({ label, body, color, mono }: { label: string; body: string; color: string; mono?: boolean }) {
  return (
    <div>
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color,
          marginBottom: 3,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 12,
          color: "rgba(255,255,255,0.85)",
          whiteSpace: mono ? "pre-wrap" : "normal",
          fontFamily: mono ? "monospace" : "inherit",
          ...(mono ? { fontSize: 10.5 } : {}),
        }}
      >
        {body}
      </div>
    </div>
  );
}

export function MetricTooltip({ label, definition, whyItMatters, formula, caveat, interpretation, extraSections }: MetricTooltipProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<Position | null>(null);
  const iconRef = useRef<HTMLSpanElement>(null);

  const show = useCallback(() => {
    if (iconRef.current) {
      const rect = iconRef.current.getBoundingClientRect();
      setPos(computePosition(rect));
    }
    setOpen(true);
  }, []);

  const hide = useCallback(() => {
    setOpen(false);
    setPos(null);
  }, []);

  // Recalculate on scroll/resize while open
  useEffect(() => {
    if (!open) return;
    const update = () => {
      if (iconRef.current) {
        setPos(computePosition(iconRef.current.getBoundingClientRect()));
      }
    };
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open]);

  return (
    <span className="inline-flex items-center gap-1">
      {label}
      <span
        ref={iconRef}
        className="cursor-help"
        onMouseEnter={show}
        onMouseLeave={hide}
      >
        <svg className="w-3.5 h-3.5 text-nz-text-muted hover:text-nz-primary transition-colors" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
      </span>

      {open && pos && (
        <TooltipPortal position={pos}>
          <div
            style={{
              background: "#111827",
              color: "#fff",
              borderRadius: 8,
              padding: "12px 14px",
              fontSize: 12,
              lineHeight: 1.5,
              wordWrap: "break-word",
              whiteSpace: "normal",
              boxShadow: "0 8px 30px rgba(0,0,0,0.3)",
            }}
          >
            {/* Arrow */}
            <div
              style={{
                position: "absolute",
                left: pos.arrowLeft,
                transform: "translateX(-50%)",
                width: 0,
                height: 0,
                borderLeft: "6px solid transparent",
                borderRight: "6px solid transparent",
                ...(pos.above
                  ? { bottom: -6, borderTop: "6px solid #111827" }
                  : { top: -6, borderBottom: "6px solid #111827" }),
              }}
            />

            <Section label="Definition" body={definition} color="#22C55E" />

            {formula && (
              <>
                <Divider />
                <Section label="Formula" body={formula} color="#805AD5" mono />
              </>
            )}

            <Divider />
            <Section label="Why it matters" body={whyItMatters} color="#F6A623" />

            {caveat && (
              <>
                <Divider />
                <Section label="Caveat" body={caveat} color="#EF4444" />
              </>
            )}

            {interpretation && (
              <>
                <Divider />
                <Section label="Interpretation" body={interpretation} color="#22C55E" />
              </>
            )}

            {extraSections?.map((sec, i) => (
              <div key={i}>
                <Divider />
                <Section label={sec.label} body={sec.body} color={sec.color || "#22C55E"} />
              </div>
            ))}
          </div>
        </TooltipPortal>
      )}
    </span>
  );
}
