import {
  BODY_FIGURE_SRC,
  heatCss,
  heatOpacity,
  resolveHeatSpots,
} from "@/lib/body-heatmap";
import type { Insight } from "@/lib/posture-report-data";

export function BodyRiskHeatmap({
  insights,
  className = "",
}: {
  insights: Insight[];
  className?: string;
}) {
  const spots = resolveHeatSpots(insights);

  return (
    <div className={`overflow-hidden rounded-xl border border-slate-200 bg-[var(--bg-primary)] ${className}`}>
      <div className="relative">
        <img
          src={BODY_FIGURE_SRC}
          alt="Bölgesel risk haritası"
          className="block h-auto w-full"
        />
        {spots.map((spot) => (
          <div
            key={spot.id}
            title={`${spot.title}: %${Math.round(spot.score)}`}
            className="pointer-events-none absolute"
            style={{
              left: `${spot.x * 100}%`,
              top: `${spot.y * 100}%`,
              width: `${spot.rx * 224}%`,
              height: `${spot.ry * 224}%`,
              transform: "translate(-50%, -50%)",
              background: `radial-gradient(ellipse at center, ${heatCss(
                spot.score,
                heatOpacity(spot.score)
              )} 0%, ${heatCss(spot.score, heatOpacity(spot.score) * 0.6)} 36%, ${heatCss(
                spot.score,
                heatOpacity(spot.score) * 0.22
              )} 62%, transparent 78%)`,
            }}
          />
        ))}
        {spots
          .filter((s) => s.marker)
          .map((spot) => (
            <div
              key={`${spot.id}-dot`}
              title={`${spot.title}: %${Math.round(spot.score)}`}
              className="pointer-events-none absolute rounded-full border-[1.5px] border-white shadow-sm"
              style={{
                left: `${spot.x * 100}%`,
                top: `${spot.y * 100}%`,
                width: `${7 + (spot.score / 100) * 3}px`,
                height: `${7 + (spot.score / 100) * 3}px`,
                transform: "translate(-50%, -50%)",
                background: heatCss(spot.score, 1),
              }}
            />
          ))}
      </div>
      <div className="flex items-center gap-2 border-t border-slate-100 px-2.5 py-1.5">
        <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
          Düşük
        </span>
        <div
          className="h-1.5 flex-1 rounded-full"
          style={{
            background:
              "linear-gradient(90deg,#22d3ee 0%,#4ade80 22%,#eab308 45%,#f97316 68%,#ef4444 100%)",
          }}
        />
        <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
          Yüksek
        </span>
      </div>
    </div>
  );
}
