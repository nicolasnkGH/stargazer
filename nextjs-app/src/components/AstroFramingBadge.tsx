"use client";

interface AstroFramingBadgeProps {
  size?: string;
  sizeArcmin?: number;
  compact?: boolean;
}

export function getFramingRecommendation(sizeArcmin?: number, sizeStr?: string) {
  let arcmin = sizeArcmin;
  if (arcmin === undefined && sizeStr) {
    // Try to extract first number
    const match = sizeStr.match(/([\d.]+)/);
    if (match) {
      arcmin = parseFloat(match[1]);
      if (sizeStr.includes("°")) arcmin *= 60;
      if (sizeStr.includes('"')) arcmin /= 60;
    }
  }

  if (arcmin === undefined) return null;

  if (arcmin >= 60) {
    return {
      category: "wide" as const,
      label: arcmin >= 120 ? "🎯 Wide-Field / Smart Scope (Mosaic > 2°)" : "🎯 Wide-Field / Smart Scope Ideal",
      sublabel: "Fills DWARF 3 / Seestar FOV with expansive structure",
      badgeClass: "bg-emerald-950/70 border-emerald-500/40 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.25)]",
    };
  } else if (arcmin >= 15) {
    return {
      category: "medium" as const,
      label: "🔭 Single-Frame Smart Scope / Short Refractor",
      sublabel: "Perfect fit for single 24mm - 250mm frame without mosaic",
      badgeClass: "bg-cyan-950/70 border-cyan-500/40 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.25)]",
    };
  } else {
    return {
      category: "compact" as const,
      label: "🔍 Tiny in Wide-Field — High Focal Length (1000mm+ SCT) Recommended",
      sublabel: "Small DSO / Planetary disk — long focal length provides detail",
      badgeClass: "bg-purple-950/70 border-purple-500/40 text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.25)]",
    };
  }
}

export default function AstroFramingBadge({
  size,
  sizeArcmin,
  compact = false,
}: AstroFramingBadgeProps) {
  const rec = getFramingRecommendation(sizeArcmin, size);
  if (!rec) return null;

  if (compact) {
    return (
      <span
        title={rec.sublabel}
        className={`rounded-md border px-2 py-0.5 text-[0.65rem] font-bold tracking-tight inline-flex items-center gap-1 ${rec.badgeClass}`}
      >
        <span>{rec.label}</span>
        {size && <span className="opacity-75 font-mono">({size})</span>}
      </span>
    );
  }

  return (
    <div className={`rounded-xl border p-2.5 flex items-start gap-2.5 ${rec.badgeClass}`}>
      <div className="flex-1 text-xs">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span className="font-extrabold tracking-wide">{rec.label}</span>
          {size && (
            <span className="font-mono text-[0.68rem] font-semibold opacity-90">
              Angular Size: {size}
            </span>
          )}
        </div>
        <p className="text-[0.68rem] opacity-80 leading-snug">{rec.sublabel}</p>
      </div>
    </div>
  );
}
