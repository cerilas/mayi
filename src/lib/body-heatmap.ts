/**
 * Body-region heatmap for the posture report.
 *
 * Coordinates are normalized 0–1 against `public/body-heatmap/anatomical-figure.jpg`
 * (576×1024, front anatomical pose). Landmarks were calibrated from the
 * silhouette bounding box and bone-brightness peaks — not guessed at runtime.
 */

import type { Insight, InsightKey } from "./posture-report-data";

export const BODY_FIGURE_SRC = "/body-heatmap/anatomical-figure.jpg?v=2";

export interface HeatRegion {
  id: string;
  /** Insights that light this region; visual intensity uses the max score. */
  keys: InsightKey[];
  x: number;
  y: number;
  rx: number;
  ry: number;
  label: boolean;
}

export interface HeatSpot {
  id: string;
  x: number;
  y: number;
  rx: number;
  ry: number;
  score: number;
  title: string;
  label: boolean;
  marker: boolean;
}

/** Calibrated on the neon anatomical figure (cx ≈ 0.502). */
export const BODY_HEAT_REGIONS: HeatRegion[] = [
  { id: "head", keys: ["forward_head"], x: 0.502, y: 0.092, rx: 0.082, ry: 0.052, label: true },
  { id: "ear-l", keys: ["tinnitus"], x: 0.45, y: 0.112, rx: 0.046, ry: 0.026, label: false },
  { id: "ear-r", keys: ["tinnitus"], x: 0.554, y: 0.112, rx: 0.046, ry: 0.026, label: true },
  { id: "neck", keys: ["cervical_disc"], x: 0.5, y: 0.15, rx: 0.056, ry: 0.03, label: true },
  {
    id: "shoulder-l",
    keys: ["frozen_shoulder", "shoulder_mobility"],
    x: 0.305,
    y: 0.208,
    rx: 0.07,
    ry: 0.04,
    label: true,
  },
  {
    id: "shoulder-r",
    keys: ["frozen_shoulder", "shoulder_mobility"],
    x: 0.695,
    y: 0.208,
    rx: 0.07,
    ry: 0.04,
    label: true,
  },
  { id: "thoracic", keys: ["kyphosis"], x: 0.5, y: 0.275, rx: 0.108, ry: 0.052, label: true },
  { id: "spine", keys: ["scoliosis"], x: 0.5, y: 0.34, rx: 0.052, ry: 0.14, label: true },
  { id: "elbow-l", keys: ["tennis_elbow"], x: 0.21, y: 0.372, rx: 0.052, ry: 0.03, label: false },
  { id: "elbow-r", keys: ["tennis_elbow"], x: 0.79, y: 0.372, rx: 0.052, ry: 0.03, label: true },
  { id: "lumbar", keys: ["lumbar_disc"], x: 0.5, y: 0.455, rx: 0.092, ry: 0.046, label: true },
  {
    id: "knee-l",
    keys: ["meniscus_acl", "knee_oa"],
    x: 0.374,
    y: 0.718,
    rx: 0.06,
    ry: 0.036,
    label: true,
  },
  {
    id: "knee-r",
    keys: ["meniscus_acl", "knee_oa"],
    x: 0.628,
    y: 0.718,
    rx: 0.06,
    ry: 0.036,
    label: true,
  },
  { id: "heel-l", keys: ["plantar_heel"], x: 0.37, y: 0.938, rx: 0.068, ry: 0.03, label: false },
  { id: "heel-r", keys: ["plantar_heel"], x: 0.637, y: 0.938, rx: 0.068, ry: 0.03, label: true },
  {
    id: "fibro",
    keys: ["fibromyalgia"],
    x: 0.5,
    y: 0.3,
    rx: 0.155,
    ry: 0.118,
    label: false,
  },
  {
    id: "posture",
    keys: ["general_posture"],
    x: 0.5,
    y: 0.312,
    rx: 0.138,
    ry: 0.155,
    label: false,
  },
];

const HEAT_STOPS: Array<{ t: number; r: number; g: number; b: number }> = [
  { t: 0, r: 34, g: 211, b: 238 },
  { t: 22, r: 74, g: 222, b: 128 },
  { t: 42, r: 250, g: 204, b: 21 },
  { t: 62, r: 249, g: 115, b: 22 },
  { t: 82, r: 239, g: 68, b: 68 },
  { t: 100, r: 185, g: 28, b: 28 },
];

export function heatRgb(score: number): { r: number; g: number; b: number } {
  const t = Math.max(0, Math.min(100, score));
  let i = 0;
  while (i < HEAT_STOPS.length - 1 && t > HEAT_STOPS[i + 1].t) i += 1;
  const a = HEAT_STOPS[i];
  const b = HEAT_STOPS[Math.min(i + 1, HEAT_STOPS.length - 1)];
  const span = Math.max(1, b.t - a.t);
  const u = (t - a.t) / span;
  return {
    r: Math.round(a.r + (b.r - a.r) * u),
    g: Math.round(a.g + (b.g - a.g) * u),
    b: Math.round(a.b + (b.b - a.b) * u),
  };
}

export function heatCss(score: number, alpha = 1): string {
  const { r, g, b } = heatRgb(score);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function heatOpacity(score: number): number {
  return 0.38 + (Math.max(0, Math.min(100, score)) / 100) * 0.55;
}

export function resolveHeatSpots(insights: Insight[]): HeatSpot[] {
  const byKey = new Map(insights.map((i) => [i.key, i]));
  return BODY_HEAT_REGIONS.map((region) => {
    const matched = region.keys
      .map((k) => byKey.get(k))
      .filter((i): i is Insight => !!i);
    const top = matched.reduce<Insight | null>(
      (best, cur) => (!best || cur.riskScore > best.riskScore ? cur : best),
      null
    );
    const score = top?.riskScore ?? 0;
    return {
      id: region.id,
      x: region.x,
      y: region.y,
      rx: region.rx,
      ry: region.ry,
      score,
      title: top?.title ?? region.id,
      label: region.label,
      marker: region.id !== "fibro" && region.id !== "posture",
    };
  }).filter((s) => s.score > 0);
}

function containBox(
  imgW: number,
  imgH: number,
  boxW: number,
  boxH: number
): { dx: number; dy: number; dw: number; dh: number } {
  const scale = Math.min(boxW / imgW, boxH / imgH);
  const dw = imgW * scale;
  const dh = imgH * scale;
  return { dx: (boxW - dw) / 2, dy: (boxH - dh) / 2, dw, dh };
}

/** Browser-only: composite figure + radial heat into one PNG for the PDF. */
export async function renderBodyHeatmapPng(
  insights: Insight[],
  outW = 420,
  outH = 748
): Promise<{ dataUrl: string; width: number; height: number } | null> {
  try {
    const res = await fetch(BODY_FIGURE_SRC, { credentials: "same-origin" });
    if (!res.ok) return null;
    const bitmap = await createImageBitmap(await res.blob());
    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return null;
    }

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, outW, outH);

    const box = containBox(bitmap.width, bitmap.height, outW, outH);
    ctx.drawImage(bitmap, box.dx, box.dy, box.dw, box.dh);
    bitmap.close();

    const spots = resolveHeatSpots(insights);
    for (const blend of ["multiply", "source-over"] as const) {
      ctx.globalCompositeOperation = blend;
      const boost = blend === "source-over" ? 0.55 : 1;
      for (const spot of spots) {
        const cx = box.dx + spot.x * box.dw;
        const cy = box.dy + spot.y * box.dh;
        const rx = spot.rx * box.dw * (blend === "source-over" ? 0.72 : 1.12);
        const ry = spot.ry * box.dh * (blend === "source-over" ? 0.72 : 1.12);
        const { r, g, b } = heatRgb(spot.score);
        const a = heatOpacity(spot.score) * boost;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(Math.max(rx, 1), Math.max(ry, 1));
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
        grad.addColorStop(0, `rgba(${r},${g},${b},${Math.min(1, a)})`);
        grad.addColorStop(0.38, `rgba(${r},${g},${b},${a * 0.55})`);
        grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    ctx.globalCompositeOperation = "source-over";
    for (const spot of spots) {
      if (!spot.marker) continue;
      const cx = box.dx + spot.x * box.dw;
      const cy = box.dy + spot.y * box.dh;
      const { r, g, b } = heatRgb(spot.score);
      const radius = 4.4 + (spot.score / 100) * 2.4;
      ctx.beginPath();
      ctx.arc(cx, cy, radius + 1.6, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fill();
    }

    return { dataUrl: canvas.toDataURL("image/png"), width: outW, height: outH };
  } catch {
    return null;
  }
}
