/**
 * Deterministic A4 posture PDF generator (jsPDF).
 * Fixed millimetre layout — independent of viewport, DPI, or browser print engine.
 * Two dense, medical-grade pages.
 */

import type { jsPDF as JsPdfInstance } from "jspdf";
import { renderBodyHeatmapPng } from "./body-heatmap";

type PdfGStateCtor = new (params: { opacity?: number }) => object;
let PdfGState: PdfGStateCtor | null = null;
import {
  type Insight,
  type Patient,
  type PostureSession,
  type Severity,
  TEST_TYPE_MAP,
  METRIC_NAME_MAP,
  generateInsights,
  applyInsightOverrides,
  overallRiskGrade,
  qualityLabel,
  genderLabel,
  formatTrDate,
  resolveAssetUrl,
  assessMetric,
  severityPalette,
  riskSeverity,
  posturalIndex,
  posturalIndexBand,
  symmetryIndex,
} from "./posture-report-data";

// ── Geometry ────────────────────────────────────────────────────────────────
const PAGE_W = 210;
const PAGE_H = 297;
const M = 12;
const CONTENT_W = PAGE_W - M * 2;
const MAX_PAGES = 2;

// ── Palette ─────────────────────────────────────────────────────────────────
const BRAND = "#14324e"; // deep medical navy
const BRAND2 = "#1e4a73";
const ACCENT = "#2563eb";
const INK = "#0f172a";
const MUTED = "#64748b";
const FAINT = "#94a3b8";
const LINE = "#d5dce5";
const LIGHT = "#eef2f7";
const WHITE = "#ffffff";

const FONT_FAMILY = "Roboto";
let fontCache: { regular: string; bold: string } | null = null;
let FONT = "helvetica";

export interface PosturePdfInput {
  patient: Patient;
  session: PostureSession;
  includePatientPhotos?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Asset + font loading
// ─────────────────────────────────────────────────────────────────────────────
async function loadImageAsDataUrl(
  src: string,
  maxSide = 480
): Promise<{ dataUrl: string; format: "PNG" | "JPEG"; width: number; height: number } | null> {
  try {
    const res = await fetch(src, { credentials: "same-origin" });
    if (!res.ok) return null;
    const blob = await res.blob();
    const bitmap = await createImageBitmap(blob);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const isPng = blob.type.includes("png");
    return {
      dataUrl: canvas.toDataURL(isPng ? "image/png" : "image/jpeg", 0.88),
      format: isPng ? "PNG" : "JPEG",
      width: w,
      height: h,
    };
  } catch {
    return null;
  }
}

/** Draw image inside a box without stretching (contain + center). */
function drawContainedImage(
  doc: JsPdfInstance,
  img: { dataUrl: string; format: "PNG" | "JPEG"; width: number; height: number },
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number,
  pad = 1
) {
  const innerW = boxW - pad * 2;
  const innerH = boxH - pad * 2;
  const scale = Math.min(innerW / img.width, innerH / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  const dx = boxX + pad + (innerW - dw) / 2;
  const dy = boxY + pad + (innerH - dh) / 2;
  doc.addImage(img.dataUrl, img.format, dx, dy, dw, dh, undefined, "FAST");
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function loadFontBase64(url: string): Promise<string> {
  const res = await fetch(url, { credentials: "same-origin" });
  if (!res.ok) throw new Error(`Font yüklenemedi: ${url}`);
  return arrayBufferToBase64(await res.arrayBuffer());
}

async function registerFonts(doc: JsPdfInstance): Promise<boolean> {
  try {
    if (!fontCache) {
      const [regular, bold] = await Promise.all([
        loadFontBase64("/fonts/Roboto-Regular.ttf"),
        loadFontBase64("/fonts/Roboto-Bold.ttf"),
      ]);
      fontCache = { regular, bold };
    }
    doc.addFileToVFS("Roboto-Regular.ttf", fontCache.regular);
    doc.addFont("Roboto-Regular.ttf", FONT_FAMILY, "normal");
    doc.addFileToVFS("Roboto-Bold.ttf", fontCache.bold);
    doc.addFont("Roboto-Bold.ttf", FONT_FAMILY, "bold");
    return true;
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Low-level draw helpers
// ─────────────────────────────────────────────────────────────────────────────
function wrapText(doc: JsPdfInstance, text: string, maxWidth: number, fontSize: number): string[] {
  doc.setFontSize(fontSize);
  const raw = (text || "").replace(/\s+/g, " ").trim();
  if (!raw) return [];
  return doc.splitTextToSize(raw, maxWidth) as string[];
}

/** Fit a single line into maxWidth with an ellipsis — avoids wrap leftover overflow. */
function clip(doc: JsPdfInstance, text: string, maxWidth: number, fontSize: number): string {
  doc.setFontSize(fontSize);
  const raw = (text || "").replace(/\s+/g, " ").trim();
  if (!raw) return "";
  if (doc.getTextWidth(raw) <= maxWidth) return raw;
  const ell = "…";
  let s = raw;
  while (s.length > 1 && doc.getTextWidth(s + ell) > maxWidth) s = s.slice(0, -1);
  return s + ell;
}

/** jsPDF y is the glyph baseline. Center a line optically inside a row. */
function rowBaseline(rowTop: number, rowH: number, fontPt: number) {
  const capMm = fontPt * 0.25;
  return rowTop + (rowH + capMm) / 2;
}

function truncateLines(lines: string[], max: number): string[] {
  if (lines.length <= max) return lines;
  const kept = lines.slice(0, max);
  const last = kept[max - 1] || "";
  kept[max - 1] = last.length > 3 ? `${last.slice(0, -3)}...` : "...";
  return kept;
}

function setText(doc: JsPdfInstance, size: number, color: string, bold = false) {
  doc.setFont(FONT, bold ? "bold" : "normal");
  doc.setFontSize(size);
  doc.setTextColor(color);
}

/** Navy band with a clipped, semi-transparent geometric wash. */
function drawNavyHeader(doc: JsPdfInstance, height: number, accentH: number) {
  doc.setFillColor(BRAND);
  doc.rect(0, 0, PAGE_W, height, "F");
  drawNavyPattern(doc, 0, 0, PAGE_W, height);
  doc.setFillColor(ACCENT);
  doc.rect(0, height, PAGE_W, accentH, "F");
}

function drawNavyPattern(doc: JsPdfInstance, x: number, y: number, w: number, h: number) {
  if (!PdfGState) return;
  doc.saveGraphicsState();
  doc.rect(x, y, w, h);
  doc.clip();

  const cx = x + w;
  const midY = y + h / 2;
  const setOp = (opacity: number) => doc.setGState(new PdfGState!({ opacity }) as never);

  setOp(0.1);
  doc.setFillColor(255, 255, 255);
  doc.circle(cx - 6, y + h * 0.12, Math.max(14, h * 0.95), "F");
  doc.circle(cx - 34, y + h + 5, Math.max(12, h * 0.78), "F");
  doc.circle(x + 16, y + h * 0.92, Math.max(11, h * 0.68), "F");

  setOp(0.07);
  doc.circle(cx - 58, y - 5, Math.max(10, h * 0.62), "F");
  doc.circle(x + w * 0.46, y + h + 8, Math.max(13, h * 0.85), "F");
  doc.circle(x + w * 0.28, y - 3, 9, "F");

  setOp(0.16);
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.32);
  doc.circle(cx - 20, midY, Math.min(12, h * 0.42), "S");
  doc.circle(cx - 20, midY, Math.min(17.5, h * 0.62), "S");

  setOp(0.08);
  doc.setLineWidth(0.16);
  for (let i = 0; i < 10; i += 1) {
    const lx = cx - 62 + i * 6.4;
    doc.line(lx, y - 3, lx + h * 1.15 + 10, y + h + 3);
  }

  setOp(0.12);
  doc.setLineWidth(0.22);
  const pluses: Array<[number, number]> = [
    [x + 38, y + h * 0.58],
    [x + 68, y + h * 0.3],
    [x + w * 0.54, y + h * 0.72],
  ];
  for (const [px, py] of pluses) {
    doc.line(px - 1.7, py, px + 1.7, py);
    doc.line(px, py - 1.7, px, py + 1.7);
  }

  doc.restoreGraphicsState();
}

function drawSectionHeader(
  doc: JsPdfInstance,
  title: string,
  y: number,
  subtitle?: string
): number {
  doc.setFillColor(LIGHT);
  doc.rect(M, y, CONTENT_W, 6.4, "F");
  doc.setFillColor(ACCENT);
  doc.rect(M, y, 1.8, 6.4, "F");
  const headerH = 6.4;
  const base = rowBaseline(y, headerH, 8.5);
  setText(doc, 8.5, BRAND, true);
  const heading = title.toLocaleUpperCase("tr-TR");
  if (subtitle) {
    setText(doc, 6.5, MUTED, false);
    const sub = clip(doc, subtitle, 52, 6.5);
    const subW = doc.getTextWidth(sub);
    doc.text(sub, PAGE_W - M - 2, base, { align: "right" });
    setText(doc, 8.5, BRAND, true);
    doc.text(clip(doc, heading, CONTENT_W - subW - 10, 8.5), M + 4, base);
  } else {
    doc.text(clip(doc, heading, CONTENT_W - 8, 8.5), M + 4, base);
  }
  return y + headerH + 2.4;
}

function drawSeverityChip(
  doc: JsPdfInstance,
  x: number,
  rowTop: number,
  rowH: number,
  severity: Severity,
  chipW = 22
) {
  const pal = severityPalette(severity);
  const h = 3.6;
  const chipY = rowTop + (rowH - h) / 2;
  doc.setFillColor(pal.bg);
  doc.roundedRect(x, chipY, chipW, h, 0.7, 0.7, "F");
  setText(doc, 6, pal.color, true);
  doc.text(clip(doc, pal.label, chipW - 2.4, 6), x + chipW / 2, rowBaseline(rowTop, rowH, 6), {
    align: "center",
  });
}

function drawFooter(
  doc: JsPdfInstance,
  pageNum: number,
  reportId: string,
  patientName: string
) {
  const fy = PAGE_H - 6.5;
  doc.setFillColor(BRAND);
  doc.rect(0, PAGE_H - 9.2, PAGE_W, 9.2, "F");
  doc.setFillColor(ACCENT);
  doc.rect(0, PAGE_H - 9.2, PAGE_W, 0.55, "F");
  setText(doc, 6.2, "#d6e4f5", false);
  doc.text("GİZLİ  ·  Yalnızca klinik kullanım", M, fy);
  doc.text(clip(doc, patientName, 56, 6.2), PAGE_W / 2, fy, { align: "center" });
  doc.text(`Rapor No ${reportId}   ·   ${pageNum} / ${MAX_PAGES}`, PAGE_W - M, fy, {
    align: "right",
  });
}

/** Page-2 closing stack: confidentiality, signature, clinic contact. */
function drawClosingStack(
  doc: JsPdfInstance,
  opts: {
    therapist: string;
    reportDate: string;
    logo: { dataUrl: string; format: "PNG" | "JPEG" } | null;
  }
) {
  const boxGap = 2.6;
  const clinicH = 16;
  const clinicY = PAGE_H - 9.2 - boxGap - clinicH;
  const sigH = 16;
  const sigY = clinicY - boxGap - sigH;
  const discH = 17;
  const discY = sigY - boxGap - discH;

  // ── Confidentiality ──
  doc.setFillColor("#f4f7fb");
  doc.setDrawColor("#c5d0de");
  doc.setLineWidth(0.25);
  doc.rect(M, discY, CONTENT_W, discH, "FD");
  doc.setFillColor(BRAND);
  doc.rect(M, discY, 2, discH, "F");
  setText(doc, 6.4, BRAND, true);
  doc.text("GİZLİLİK VE YASAL UYARI", M + 5, discY + 4.4);
  setText(doc, 6, MUTED, false);
  const disclaimer =
    "Bu belge hasta gizliliği kapsamındadır ve yalnızca ilgili klinisyen / hasta için üretilmiştir. Yapay zeka destekli biyomekanik ölçümlere dayanır; tanı koymaz. Kesin tanı ve tedavi planı lisanslı fizyoterapist veya ortopedi uzmanının klinik muayenesine bağlıdır. İzinsiz çoğaltılamaz, iletilemez veya üçüncü taraflarla paylaşılamaz.";
  truncateLines(wrapText(doc, disclaimer, CONTENT_W - 9, 6), 4).forEach((ln, i) => {
    doc.text(ln, M + 5, discY + 8 + i * 2.5);
  });

  // ── Signature ──
  const half = CONTENT_W / 2;
  doc.setFillColor(WHITE);
  doc.setDrawColor("#c5d0de");
  doc.setLineWidth(0.25);
  doc.rect(M, sigY, CONTENT_W, sigH, "FD");
  doc.line(M + half, sigY, M + half, sigY + sigH);

  setText(doc, 5.8, FAINT, false);
  doc.text("DEĞERLENDİREN FİZYOTERAPİST", M + 4, sigY + 4);
  setText(doc, 8.5, INK, true);
  doc.text(clip(doc, opts.therapist || "—", half - 8, 8.5), M + 4, sigY + 8.6);
  setText(doc, 6, MUTED, false);
  doc.text(`Tarih: ${opts.reportDate}`, M + 4, sigY + 13.2);

  setText(doc, 5.8, FAINT, false);
  doc.text("İMZA VE KAŞE", M + half + 4, sigY + 4);
  doc.setDrawColor(BRAND2);
  doc.setLineWidth(0.35);
  doc.line(M + half + 4, sigY + 12.2, PAGE_W - M - 4, sigY + 12.2);
  setText(doc, 5.6, FAINT, false);
  doc.text("Ad / soyad ve kaşe", M + half + 4, sigY + 14.4);

  // ── Clinic identity bar ──
  doc.setFillColor(BRAND);
  doc.rect(M, clinicY, CONTENT_W, clinicH, "F");
  doc.setFillColor(ACCENT);
  doc.rect(M, clinicY, CONTENT_W, 0.55, "F");

  if (opts.logo) {
    try {
      doc.setFillColor(WHITE);
      doc.roundedRect(M + 3, clinicY + 2.6, 10.6, 10.6, 1.2, 1.2, "F");
      doc.addImage(opts.logo.dataUrl, opts.logo.format, M + 4, clinicY + 3.5, 8.6, 8.6);
    } catch {
      /* ignore */
    }
  }

  const textX = opts.logo ? M + 16.5 : M + 4;
  setText(doc, 8, WHITE, true);
  doc.text("My FizyoPilates", textX, clinicY + 5.4);
  setText(doc, 6.2, "#c7d7ea", false);
  doc.text("Gaziantep Fizyoterapi ve Rehabilitasyon", textX, clinicY + 9);
  doc.text("MY FizioAI Biyomekanik Değerlendirme", textX, clinicY + 12.4);

  setText(doc, 6.2, "#e8eef6", false);
  const rightX = PAGE_W - M - 3.5;
  doc.text("Atatürk, Duisburg Blv. ALEYNA APT NO: 19/B", rightX, clinicY + 5.4, {
    align: "right",
  });
  doc.text("27560 Şehitkamil / Gaziantep", rightX, clinicY + 9, { align: "right" });
  doc.text("Tel (0342) 341 10 00   ·   info@myfizyo.com", rightX, clinicY + 12.4, {
    align: "right",
  });

  return discY;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────
export async function generateAndDownloadPosturePdf(input: PosturePdfInput): Promise<void> {
  const { patient, session, includePatientPhotos = true } = input;
  const insights = applyInsightOverrides(
    generateInsights(session),
    session.insightOverrides
  );
  const grade = overallRiskGrade(insights);
  const pIndex = posturalIndex(insights);
  const pBand = posturalIndexBand(pIndex);
  const symIndex = symmetryIndex(session);
  const reportDate = formatTrDate(new Date());
  const sessionDate = formatTrDate(session.createdAt, true);
  const reportId = session.id.slice(-8).toUpperCase();
  const patientId = patient.id.slice(-8).toUpperCase();
  const profile = patient.profile;
  const highRisk = insights.filter((i) => i.color === "red").length;
  const medRisk = insights.filter((i) => i.color === "orange").length;
  const okRisk = insights.filter((i) => i.color === "green").length;
  const totalMetrics = session.testResults.reduce((s, t) => s + t.measurements.length, 0);

  const logo = await loadImageAsDataUrl("/logo.png", 160);
  const bodyHeat = await renderBodyHeatmapPng(insights);

  const MODULE_REF: Record<string, string> = {
    front_static_posture: "/module-refs/front_static_posture.jpg",
    side_static_posture: "/module-refs/side_static_posture.jpg",
    squat_5_reps: "/module-refs/squat_5_reps.jpg",
    shoulder_flexion: "/module-refs/shoulder_flexion.jpg",
    shoulder_abduction: "/module-refs/shoulder_abduction.jpg",
  };

  const snapshotThumbs: Array<{
    label: string;
    testType: string;
    img: { dataUrl: string; format: "PNG" | "JPEG"; width: number; height: number } | null;
    isPatientPhoto: boolean;
  }> = [];
  for (const test of session.testResults.slice(0, 4)) {
    const url = includePatientPhotos ? resolveAssetUrl(test.snapshotUrl) : null;
    const patientImg = url ? await loadImageAsDataUrl(url, 320) : null;
    const refUrl = MODULE_REF[test.testType];
    const refImg = !patientImg && refUrl ? await loadImageAsDataUrl(refUrl, 320) : null;
    snapshotThumbs.push({
      label: TEST_TYPE_MAP[test.testType] || test.testType,
      testType: test.testType,
      img: patientImg || refImg,
      isPatientPhoto: !!patientImg,
    });
  }

  const { jsPDF, GState } = await import("jspdf");
  PdfGState = GState;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
  const hasFont = await registerFonts(doc);
  FONT = hasFont ? FONT_FAMILY : "helvetica";
  doc.setFont(FONT, "normal");

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 1
  // ═══════════════════════════════════════════════════════════════════════════
  drawFooter(doc, 1, reportId, patient.name || "Hasta");

  // ── Masthead ──
  drawNavyHeader(doc, 24, 1.2);
  // logo on white tile
  doc.setFillColor(WHITE);
  doc.roundedRect(M, 6, 12, 12, 1.5, 1.5, "F");
  if (logo) {
    try {
      doc.addImage(logo.dataUrl, logo.format, M + 1, 7, 10, 10);
    } catch {
      /* ignore */
    }
  }
  setText(doc, 13, WHITE, true);
  doc.text("MY FizioAI", M + 15.5, 11.2);
  setText(doc, 7, "#c7d7ea", false);
  doc.text("Biyomekanik Değerlendirme Platformu", M + 15.5, 16.2);
  setText(doc, 9.5, WHITE, true);
  doc.text("POSTÜRAL BİYOMEKANİK", PAGE_W - M, 10.4, { align: "right" });
  doc.text("DEĞERLENDİRME RAPORU", PAGE_W - M, 15, { align: "right" });
  setText(doc, 7, "#c7d7ea", false);
  doc.text(
    clip(doc, `Rapor No: ${reportId}   ·   Tarih: ${reportDate}`, 90, 7),
    PAGE_W - M,
    20,
    { align: "right" }
  );

  let y = 30;

  // ── Patient & assessment info ──
  y = drawSectionHeader(doc, "Hasta & Değerlendirme Bilgileri", y);
  const infoFields: Array<[string, string]> = [
    ["Ad Soyad", patient.name || "—"],
    ["Hasta No", patientId],
    ["Yaş / Cinsiyet", `${profile?.age != null ? profile.age : "—"} / ${genderLabel(profile?.gender)}`],
    ["Değerlendirme Tarihi", sessionDate],
    ["Sorumlu Terapist", profile?.responsibleAdmin?.name || "—"],
    ["Telefon", profile?.phone || "—"],
    ["Tamamlanan Modül", `${session.testResults.length} test / ${totalMetrics} parametre`],
    ["Rapor Tarihi", reportDate],
  ];
  const infoCols = 4;
  const infoRows = 2;
  const cellW = CONTENT_W / infoCols;
  const cellH = 11;
  const infoPanelH = cellH * infoRows;
  doc.setDrawColor(LINE);
  doc.setLineWidth(0.25);
  doc.rect(M, y, CONTENT_W, infoPanelH, "S");
  infoFields.forEach(([label, value], i) => {
    const col = i % infoCols;
    const row = Math.floor(i / infoCols);
    const cx = M + col * cellW;
    const cy = y + row * cellH;
    if (col > 0) {
      doc.setDrawColor(LINE);
      doc.line(cx, cy + 1.5, cx, cy + cellH - 1.5);
    }
    if (row > 0) {
      doc.setDrawColor(LINE);
      doc.line(cx, cy, cx + cellW, cy);
    }
    const pad = 2.2;
    setText(doc, 5.8, FAINT, false);
    doc.text(clip(doc, label.toLocaleUpperCase("tr-TR"), cellW - pad * 2, 5.8), cx + pad, cy + 3.8);
    setText(doc, 7.5, INK, true);
    doc.text(clip(doc, value, cellW - pad * 2, 7.5), cx + pad, cy + 8.3);
  });
  y += infoPanelH + 4;

  // ── Clinical summary KPI strip ──
  y = drawSectionHeader(doc, "Klinik Özet", y, "Genel postüral durum göstergeleri");
  const kpiH = 24;
  const kpiGap = 3;
  const kpiW = (CONTENT_W - kpiGap * 3) / 4;

  const kpiPad = 2.6;
  const kpiTitleY = y + 4.6;
  const kpiValueY = y + 13.4;

  // Card 1: Overall grade
  drawKpiCard(doc, M, y, kpiW, kpiH);
  setText(doc, 5.8, FAINT, false);
  doc.text(clip(doc, "GENEL DEĞERLENDİRME", kpiW - kpiPad * 2, 5.8), M + kpiPad, kpiTitleY);
  setText(doc, 16, grade.color, true);
  doc.text(grade.grade, M + kpiPad, kpiValueY);
  const gradeW = doc.getTextWidth(grade.grade);
  setText(doc, 7.5, INK, true);
  doc.text(clip(doc, grade.label, kpiW - gradeW - kpiPad * 2 - 2, 7.5), M + kpiPad + gradeW + 2, kpiValueY - 0.4);
  setText(doc, 5.8, MUTED, false);
  doc.text(clip(doc, grade.desc, kpiW - kpiPad * 2, 5.8), M + kpiPad, y + 20.2);

  // Card 2: Postural index with gauge
  const c2x = M + (kpiW + kpiGap);
  drawKpiCard(doc, c2x, y, kpiW, kpiH);
  setText(doc, 5.8, FAINT, false);
  doc.text(clip(doc, "POSTÜRAL İNDEKS", kpiW - 22, 5.8), c2x + kpiPad, kpiTitleY);
  setText(doc, 6.5, pBand.color, true);
  doc.text(pBand.label, c2x + kpiW - kpiPad, kpiTitleY, { align: "right" });
  setText(doc, 16, pBand.color, true);
  const pStr = String(pIndex);
  doc.text(pStr, c2x + kpiPad, kpiValueY);
  const pW = doc.getTextWidth(pStr);
  setText(doc, 7, MUTED, false);
  doc.text("/100", c2x + kpiPad + pW + 1.2, kpiValueY - 0.3);
  const gx = c2x + kpiPad;
  const gw = kpiW - kpiPad * 2;
  doc.setFillColor("#e2e8f0");
  doc.roundedRect(gx, y + 18.6, gw, 2, 0.8, 0.8, "F");
  doc.setFillColor(pBand.color);
  doc.roundedRect(gx, y + 18.6, Math.max(1.4, (pIndex / 100) * gw), 2, 0.8, 0.8, "F");

  // Card 3: Risk distribution
  const c3x = M + (kpiW + kpiGap) * 2;
  drawKpiCard(doc, c3x, y, kpiW, kpiH);
  setText(doc, 5.8, FAINT, false);
  doc.text("RİSK DAĞILIMI", c3x + kpiPad, kpiTitleY);
  const riskRows: Array<[string, number, string]> = [
    ["Yüksek", highRisk, "#dc2626"],
    ["Orta", medRisk, "#ea580c"],
    ["Normal", okRisk, "#16a34a"],
  ];
  riskRows.forEach(([label, n, color], i) => {
    const rowTop = y + 6.6 + i * 5.4;
    const base = rowBaseline(rowTop, 5.4, 7);
    doc.setFillColor(color);
    doc.circle(c3x + kpiPad + 1.1, rowTop + 2.7, 1.05, "F");
    setText(doc, 7, INK, false);
    doc.text(label, c3x + kpiPad + 4, base);
    setText(doc, 7.5, color, true);
    doc.text(String(n), c3x + kpiW - kpiPad, base, { align: "right" });
  });

  // Card 4: Symmetry index
  const c4x = M + (kpiW + kpiGap) * 3;
  drawKpiCard(doc, c4x, y, kpiW, kpiH);
  setText(doc, 5.8, FAINT, false);
  doc.text("SİMETRİ İNDEKSİ", c4x + kpiPad, kpiTitleY);
  if (symIndex != null) {
    const symColor = symIndex >= 90 ? "#16a34a" : symIndex >= 80 ? "#ca8a04" : "#ea580c";
    setText(doc, 16, symColor, true);
    const sStr = String(symIndex);
    doc.text(sStr, c4x + kpiPad, kpiValueY);
    const sW = doc.getTextWidth(sStr);
    setText(doc, 7, MUTED, false);
    doc.text("%", c4x + kpiPad + sW + 1.2, kpiValueY - 0.3);
    setText(doc, 5.8, MUTED, false);
    doc.text(clip(doc, "Sağ/sol omuz ROM dengesi", kpiW - kpiPad * 2, 5.8), c4x + kpiPad, y + 20.2);
  } else {
    setText(doc, 12, FAINT, true);
    doc.text("N/A", c4x + kpiPad, kpiValueY);
    setText(doc, 5.8, MUTED, false);
    doc.text(clip(doc, "Bilateral ROM verisi yok", kpiW - kpiPad * 2, 5.8), c4x + kpiPad, y + 20.2);
  }
  y += kpiH + 4;

  // ── Clinical opinion ──
  const opinion = (session.clinicalOpinion || "").trim();
  if (opinion) {
    y = drawSectionHeader(doc, "Klinisyen Görüşü & Tedavi Notları", y);
    const lines = truncateLines(wrapText(doc, opinion, CONTENT_W - 8, 8), 6);
    const boxH = Math.max(12, lines.length * 3.7 + 5);
    doc.setFillColor("#f8fafc");
    doc.setDrawColor(LINE);
    doc.setLineWidth(0.25);
    doc.rect(M, y, CONTENT_W, boxH, "FD");
    doc.setFillColor(ACCENT);
    doc.rect(M, y, 1.6, boxH, "F");
    setText(doc, 8, INK, false);
    lines.forEach((ln, i) => doc.text(ln, M + 4, y + 4.8 + i * 3.7));
    y += boxH + 4;
  }

  // ── AI risk stratification + regional heatmap ──
  y = drawSectionHeader(
    doc,
    "Yapay Zeka Risk Stratifikasyonu",
    y,
    `${insights.length} kondisyon  ·  bölgesel ısıl harita`
  );
  const heatW = 46;
  const tableW = CONTENT_W - heatW - 3;
  const tableBottom = drawRiskTable(doc, insights, y, M, tableW);
  const heatH = tableBottom - y;
  const heatX = M + tableW + 3;
  const titleH = 5;
  doc.setFillColor(WHITE);
  doc.rect(heatX, y, heatW, heatH, "F");
  doc.setFillColor(BRAND);
  doc.rect(heatX, y, heatW, titleH, "F");
  setText(doc, 5.2, "#d6e4f5", true);
  doc.text("BÖLGESEL RİSK", heatX + heatW / 2, rowBaseline(y, titleH, 5.2), {
    align: "center",
  });
  if (bodyHeat) {
    drawContainedImage(
      doc,
      { ...bodyHeat, format: "PNG" },
      heatX,
      y + titleH,
      heatW,
      heatH - titleH,
      1
    );
  }
  doc.setDrawColor("#1e3a54");
  doc.setLineWidth(0.25);
  doc.rect(heatX, y, heatW, heatH, "S");

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 2
  // ═══════════════════════════════════════════════════════════════════════════
  doc.addPage();
  drawFooter(doc, 2, reportId, patient.name || "Hasta");

  // ── Running header ──
  drawNavyHeader(doc, 13, 0.8);
  setText(doc, 8.5, WHITE, true);
  doc.text(clip(doc, "Postüral Biyomekanik Değerlendirme Raporu", 108, 8.5), M, 8.4);
  setText(doc, 7, "#c7d7ea", false);
  doc.text(
    clip(doc, `${patient.name || "Hasta"}  ·  ${reportId}`, 68, 7),
    PAGE_W - M,
    8.4,
    { align: "right" }
  );

  y = 18;

  // Closing stack (confidentiality + signature + clinic) sits above the navy page bar.
  const closingTop = PAGE_H - 9.2 - 2.6 - 16 - 2.6 - 16 - 2.6 - 17;
  const flowLimit = closingTop - 3;

  // ── Biomechanical measurement analysis ──
  y = drawSectionHeader(doc, "Biyomekanik Ölçüm Analizi", y, "Parametre · referans · sapma · değerlendirme");

  // reserve space after the table for images + recommendations + methodology
  const imagesBlockH = session.testResults.length > 0 ? 8 + 50 + 7 : 0;
  const recsBlockH = 6.4 + 2.5 + 24;
  const methodBlockH = 6.4 + 2.5 + 12;
  const maxTableBottom = flowLimit - imagesBlockH - recsBlockH - methodBlockH - 9;

  y = drawMeasurementTable(doc, session, y, maxTableBottom);

  // ── Module images (photo or anatomy) ──
  if (session.testResults.length > 0) {
    const imagesTitleY = y + 3;
    const iy = drawSectionHeader(doc, "Modül Görselleri", imagesTitleY);
    const count = Math.min(snapshotThumbs.length, 4);
    const slotW = 38;
    const thumbH = 50;
    const gapX = count > 1 ? (CONTENT_W - slotW * count) / (count - 1) : 0;
    snapshotThumbs.slice(0, count).forEach((t, i) => {
      const x = M + i * (slotW + gapX);
      doc.setDrawColor(LINE);
      doc.setLineWidth(0.25);
      doc.setFillColor("#f8fafc");
      doc.rect(x, iy, slotW, thumbH, "FD");
      let drewPhoto = false;
      if (t.img) {
        try {
          drawContainedImage(doc, t.img, x, iy, slotW, thumbH, 1.2);
          drewPhoto = true;
        } catch {
          drewPhoto = false;
        }
      }
      if (!drewPhoto) drawAnatomyFigure(doc, x, iy, slotW, thumbH, t.testType);
      setText(doc, 5.8, MUTED, false);
      const lbl = drewPhoto && t.isPatientPhoto ? t.label : `${t.label} (temsili)`;
      doc.text(clip(doc, lbl, slotW - 1, 5.8), x + slotW / 2, iy + thumbH + 3.4, {
        align: "center",
      });
    });
    y = iy + thumbH + 6.5;
  }

  // ── Tiered clinical recommendations ──
  y = drawSectionHeader(doc, "Klinik Öneriler", y, "Kademeli tedavi yaklaşımı");
  const tiers = [
    {
      title: "ÖNCELİKLİ",
      color: "#dc2626",
      items: ["Postürel farkındalık eğitimi", "Ağrı odaklı klinik muayene", "Aktivite / yük modifikasyonu"],
    },
    {
      title: "KISA VADE (0–6 HAFTA)",
      color: "#ea580c",
      items: ["Germe & eklem mobilizasyonu", "Kor stabilizasyon egzersizleri", "Ergonomik düzenleme"],
    },
    {
      title: "UZUN VADE (6+ HAFTA)",
      color: "#16a34a",
      items: ["Progresif kuvvetlendirme", "Motor kontrol & denge", "3–6 ayda kontrol ölçümü"],
    },
  ];
  const tierW = (CONTENT_W - 4) / 3;
  const tierH = 24;
  tiers.forEach((tier, i) => {
    const x = M + i * (tierW + 2);
    doc.setFillColor("#f8fafc");
    doc.setDrawColor(LINE);
    doc.setLineWidth(0.25);
    doc.rect(x, y, tierW, tierH, "FD");
    doc.setFillColor(tier.color);
    doc.rect(x, y, tierW, 4.5, "F");
    setText(doc, 6, WHITE, true);
    doc.text(clip(doc, tier.title, tierW - 4, 6), x + 2.2, rowBaseline(y, 4.5, 6));
    setText(doc, 6.5, INK, false);
    tier.items.forEach((it, li) => {
      const itemTop = y + 6.2 + li * 5.6;
      const base = rowBaseline(itemTop, 5.6, 6.5);
      doc.setFillColor(tier.color);
      doc.circle(x + 3.2, itemTop + 2.8, 0.65, "F");
      doc.text(clip(doc, it, tierW - 8, 6.5), x + 5.4, base);
    });
  });
  y += tierH + 3;

  // ── Methodology ──
  y = drawSectionHeader(doc, "Değerlendirme Yöntemi", y);
  setText(doc, 6.5, MUTED, false);
  const method =
    "Ölçümler, video tabanlı yapay zeka poz-tahmini (pose estimation) ile anatomik işaret noktalarından hesaplanmıştır. Her parametre için bir güven skoru (confidence) raporlanır; düşük güvenli ölçümler klinik muayene ile doğrulanmalıdır. Referans aralıkları genel popülasyon normlarına dayanır ve bireysel farklılıklar klinisyen tarafından yorumlanmalıdır.";
  truncateLines(wrapText(doc, method, CONTENT_W - 2, 6.5), 3).forEach((ln, i) =>
    doc.text(ln, M, y + i * 3)
  );

  drawClosingStack(doc, {
    therapist: profile?.responsibleAdmin?.name || "—",
    reportDate,
    logo,
  });

  while (doc.getNumberOfPages() > MAX_PAGES) doc.deletePage(doc.getNumberOfPages());

  const safeName = (patient.name || "hasta")
    .replace(/[^\w\s\-ğüşıöçĞÜŞİÖÇ]/gi, "")
    .trim()
    .replace(/\s+/g, "_")
    .slice(0, 40);
  doc.save(`Postur_Raporu_${safeName}_${reportId}.pdf`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Composite draw helpers
// ─────────────────────────────────────────────────────────────────────────────
function drawKpiCard(doc: JsPdfInstance, x: number, y: number, w: number, h: number) {
  doc.setFillColor(WHITE);
  doc.setDrawColor(LINE);
  doc.setLineWidth(0.25);
  doc.rect(x, y, w, h, "FD");
  doc.setFillColor(BRAND);
  doc.rect(x, y, w, 0.8, "F");
}

function drawRiskTable(
  doc: JsPdfInstance,
  insights: Insight[],
  y: number,
  boxX = M,
  boxW = CONTENT_W
): number {
  const rowH = 5.6;
  const headerH = 5.5;
  const scale = boxW / CONTENT_W;
  const C_NAME = { x: boxX + 2, w: 50 * scale };
  const C_RISK = { x: boxX + 52 * scale, w: 28 * scale };
  const C_SEV = { x: boxX + 82 * scale, w: 20 * scale };
  const C_FIND = {
    x: boxX + 104 * scale,
    w: boxX + boxW - 2 - (boxX + 104 * scale),
  };

  doc.setFillColor(BRAND);
  doc.rect(boxX, y, boxW, headerH, "F");
  setText(doc, 6.5, WHITE, true);
  const hb = rowBaseline(y, headerH, 6.5);
  doc.text("KONDİSYON", C_NAME.x, hb);
  doc.text("RİSK", C_RISK.x, hb);
  doc.text("ŞİDDET", C_SEV.x, hb);
  doc.text("KLİNİK BULGU", C_FIND.x, hb);
  y += headerH;

  insights.forEach((insight, i) => {
    const sev = riskSeverity(insight.color);
    const pal = severityPalette(sev);
    if (i % 2 === 1) {
      doc.setFillColor("#f8fafc");
      doc.rect(boxX, y, boxW, rowH, "F");
    }
    const base = rowBaseline(y, rowH, 7);
    setText(doc, 7, INK, true);
    doc.text(clip(doc, insight.title, C_NAME.w, 7), C_NAME.x, base);

    setText(doc, 7, pal.color, true);
    const score = String(insight.riskScore);
    doc.text(score, C_RISK.x, base);
    const scoreW = Math.min(doc.getTextWidth(score), 10);
    const barX = C_RISK.x + scoreW + 1.6;
    const barW = C_RISK.x + C_RISK.w - barX - 1;
    const barY = y + (rowH - 1.6) / 2;
    if (barW > 5) {
      doc.setFillColor("#e2e8f0");
      doc.roundedRect(barX, barY, barW, 1.6, 0.6, 0.6, "F");
      doc.setFillColor(pal.color);
      doc.roundedRect(barX, barY, Math.max(1, (insight.riskScore / 100) * barW), 1.6, 0.6, 0.6, "F");
    }

    drawSeverityChip(doc, C_SEV.x, y, rowH, sev, Math.max(16, C_SEV.w));

    setText(doc, 6.2, MUTED, false);
    doc.text(clip(doc, insight.description, C_FIND.w, 6.2), C_FIND.x, rowBaseline(y, rowH, 6.2));

    doc.setDrawColor(LINE);
    doc.setLineWidth(0.15);
    doc.line(boxX, y + rowH, boxX + boxW, y + rowH);
    y += rowH;
  });
  return y;
}

function drawMeasurementTable(
  doc: JsPdfInstance,
  session: PostureSession,
  y: number,
  maxBottom: number
): number {
  const C_P = { x: M + 2, w: 56 };
  const C_VAL = { x: M + 58, w: 22 };
  const C_REF = { x: M + 80, w: 26 };
  const C_DEV = { x: M + 106, w: 28 };
  const C_ASSESS = { x: M + 134, w: 26 };
  const C_CONF = { x: M + 162, w: CONTENT_W - 162 - 2 };

  const headerH = 5.5;
  doc.setFillColor(BRAND);
  doc.rect(M, y, CONTENT_W, headerH, "F");
  setText(doc, 6.5, WHITE, true);
  const hb = rowBaseline(y, headerH, 6.5);
  doc.text(clip(doc, "PARAMETRE", C_P.w, 6.5), C_P.x, hb);
  doc.text(clip(doc, "ÖLÇÜM", C_VAL.w, 6.5), C_VAL.x, hb);
  doc.text(clip(doc, "REFERANS", C_REF.w, 6.5), C_REF.x, hb);
  doc.text(clip(doc, "SAPMA", C_DEV.w, 6.5), C_DEV.x, hb);
  doc.text(clip(doc, "DEĞERLENDİRME", C_ASSESS.w, 6.5), C_ASSESS.x, hb);
  doc.text(clip(doc, "GÜVEN", C_CONF.w, 6.5), C_CONF.x + C_CONF.w, hb, { align: "right" });
  y += headerH;

  const rowH = 5.2;
  let rowAlt = false;
  let truncated = false;

  for (const test of session.testResults) {
    if (y + 11 > maxBottom) {
      truncated = true;
      break;
    }
    const testName = TEST_TYPE_MAP[test.testType] || test.testType;
    const ql = qualityLabel(test.overallQuality);
    doc.setFillColor("#e2e8f0");
    doc.rect(M, y, CONTENT_W, 5, "F");
    const groupH = 5;
    const gb = rowBaseline(y, groupH, 7);
    setText(doc, 7, BRAND, true);
    doc.text(clip(doc, testName, 92, 7), M + 2, gb);
    setText(doc, 6.5, MUTED, false);
    doc.text(
      clip(
        doc,
        `Kalite: ${ql.text}  ·  Ort. güven: ${(test.avgConfidence * 100).toFixed(0)}%`,
        88,
        6.5
      ),
      PAGE_W - M - 2,
      gb,
      { align: "right" }
    );
    y += 5;

    const metrics =
      test.measurements.length > 0
        ? test.measurements
        : [{ id: "empty", metricKey: "—", value: NaN, unit: "", quality: "invalid", confidence: 0 }];

    for (const m of metrics) {
      if (y + rowH > maxBottom) {
        truncated = true;
        break;
      }
      if (rowAlt) {
        doc.setFillColor("#f8fafc");
        doc.rect(M, y, CONTENT_W, rowH, "F");
      }
      rowAlt = !rowAlt;
      const base = rowBaseline(y, rowH, 6.8);
      const isEmpty = Number.isNaN(m.value);

      if (isEmpty) {
        setText(doc, 6.8, FAINT, false);
        doc.text("Ölçüm verisi çıkarılamadı", C_P.x, base);
      } else {
        const a = assessMetric(m.metricKey, m.value, m.unit);
        const pal = severityPalette(a.severity);
        setText(doc, 6.8, INK, false);
        doc.text(clip(doc, METRIC_NAME_MAP[m.metricKey] || m.metricKey, C_P.w, 6.8), C_P.x, base);
        setText(doc, 6.8, INK, true);
        doc.text(
          clip(doc, `${m.value.toFixed(1)}${m.unit ? ` ${m.unit}` : ""}`, C_VAL.w - 1, 6.8),
          C_VAL.x,
          base
        );
        setText(doc, 6.5, MUTED, false);
        doc.text(clip(doc, a.reference, C_REF.w - 1, 6.5), C_REF.x, rowBaseline(y, rowH, 6.5));
        setText(doc, 6.5, pal.color, false);
        doc.text(clip(doc, a.deviation, C_DEV.w - 1, 6.5), C_DEV.x, rowBaseline(y, rowH, 6.5));
        drawSeverityChip(doc, C_ASSESS.x, y, rowH, a.severity, C_ASSESS.w);
        setText(doc, 6.5, m.confidence > 0.8 ? "#16a34a" : m.confidence > 0.6 ? "#ca8a04" : "#dc2626", true);
        doc.text(
          `${(m.confidence * 100).toFixed(0)}%`,
          C_CONF.x + C_CONF.w,
          rowBaseline(y, rowH, 6.5),
          { align: "right" }
        );
      }
      doc.setDrawColor(LINE);
      doc.setLineWidth(0.15);
      doc.line(M, y + rowH, PAGE_W - M, y + rowH);
      y += rowH;
    }
    if (truncated) break;
  }

  if (truncated) {
    setText(doc, 6, FAINT, false);
    doc.text("… ek parametreler alan kısıtı nedeniyle özetlenmiştir.", M, y + 3.2);
    y += 4;
  }
  return y;
}

/**
 * Distinct vector figures per test module (front / side / squat / flexion / abduction).
 */
function drawAnatomyFigure(
  doc: JsPdfInstance,
  x: number,
  y: number,
  w: number,
  h: number,
  testType: string
) {
  const pose =
    testType === "side_static_posture"
      ? "side"
      : testType === "squat_5_reps"
        ? "squat"
        : testType === "shoulder_flexion"
          ? "flexion"
          : testType === "shoulder_abduction"
            ? "abduction"
            : "front";

  const bodyFill = "#b9c6de";
  const guide = "#3b82f6";
  const padTop = 2.4;
  const padBottom = 2.2;
  const figTop = y + padTop;
  const figH = h - padTop - padBottom;
  const cx = x + w / 2;
  const headR = figH * (pose === "squat" ? 0.1 : 0.11);

  doc.setLineCap("round");
  doc.setLineJoin("round");
  doc.setFillColor(bodyFill);
  doc.setDrawColor(bodyFill);

  if (pose === "side") {
    const headCx = cx + figH * 0.04;
    const headCy = figTop + headR;
    const shY = headCy + headR + figH * 0.03;
    const hipY = figTop + figH * 0.55;
    const footY = figTop + figH;
    doc.circle(headCx, headCy, headR, "F");
    doc.setLineWidth(figH * 0.09);
    doc.line(cx, shY, cx - figH * 0.01, hipY);
    doc.setLineWidth(figH * 0.05);
    doc.line(cx + 0.4, shY + 0.4, cx + figH * 0.16, hipY - figH * 0.04);
    doc.setLineWidth(figH * 0.065);
    doc.line(cx - figH * 0.01, hipY, cx - figH * 0.03, footY);
    drawGuides(doc, guide, x, w, cx, figTop, footY, shY, hipY);
  } else if (pose === "squat") {
    const headCy = figTop + figH * 0.18;
    const shY = headCy + headR + figH * 0.02;
    const hipY = figTop + figH * 0.58;
    const kneeY = figTop + figH * 0.78;
    const footY = figTop + figH;
    const shHalf = figH * 0.15;
    doc.circle(cx, headCy, headR, "F");
    doc.setLineWidth(figH * 0.1);
    doc.line(cx, shY, cx, hipY);
    doc.setLineWidth(figH * 0.048);
    doc.line(cx - shHalf, shY, cx - figH * 0.22, shY - figH * 0.02);
    doc.line(cx + shHalf, shY, cx + figH * 0.22, shY - figH * 0.02);
    doc.setLineWidth(figH * 0.06);
    doc.line(cx, hipY, cx - figH * 0.16, kneeY);
    doc.line(cx, hipY, cx + figH * 0.16, kneeY);
    doc.line(cx - figH * 0.16, kneeY, cx - figH * 0.2, footY);
    doc.line(cx + figH * 0.16, kneeY, cx + figH * 0.2, footY);
    drawGuides(doc, guide, x, w, cx, figTop, footY, shY, hipY);
  } else if (pose === "flexion") {
    const headCy = figTop + headR + figH * 0.12;
    const shY = headCy + headR + figH * 0.03;
    const hipY = figTop + figH * 0.62;
    const footY = figTop + figH;
    const shHalf = figH * 0.14;
    doc.circle(cx, headCy, headR, "F");
    doc.setLineWidth(figH * 0.1);
    doc.line(cx, shY, cx, hipY);
    // Arms raised forward/up (overhead flexion)
    doc.setLineWidth(figH * 0.048);
    doc.line(cx - shHalf, shY, cx - figH * 0.08, figTop + figH * 0.02);
    doc.line(cx + shHalf, shY, cx + figH * 0.08, figTop + figH * 0.02);
    doc.setLineWidth(figH * 0.06);
    doc.line(cx - figH * 0.07, hipY, cx - figH * 0.1, footY);
    doc.line(cx + figH * 0.07, hipY, cx + figH * 0.1, footY);
    drawGuides(doc, guide, x, w, cx, figTop, footY, shY, hipY);
  } else if (pose === "abduction") {
    const headCy = figTop + headR;
    const shY = headCy + headR + figH * 0.03;
    const hipY = figTop + figH * 0.56;
    const footY = figTop + figH;
    const shHalf = figH * 0.13;
    doc.circle(cx, headCy, headR, "F");
    doc.setLineWidth(figH * 0.1);
    doc.line(cx, shY, cx, hipY);
    // Arms out to the sides (T / abduction)
    doc.setLineWidth(figH * 0.048);
    doc.line(cx - shHalf, shY, x + 2.2, shY - figH * 0.01);
    doc.line(cx + shHalf, shY, x + w - 2.2, shY - figH * 0.01);
    doc.setLineWidth(figH * 0.06);
    doc.line(cx - figH * 0.07, hipY, cx - figH * 0.1, footY);
    doc.line(cx + figH * 0.07, hipY, cx + figH * 0.1, footY);
    drawGuides(doc, guide, x, w, cx, figTop, footY, shY, hipY);
  } else {
    // front static posture
    const headCy = figTop + headR;
    const shY = headCy + headR + figH * 0.03;
    const hipY = figTop + figH * 0.56;
    const footY = figTop + figH;
    const shHalf = figH * 0.16;
    const hipHalf = figH * 0.11;
    doc.circle(cx, headCy, headR, "F");
    doc.lines(
      [[shHalf * 2, 0], [hipHalf - shHalf, hipY - shY], [-hipHalf * 2, 0]],
      cx - shHalf,
      shY,
      [1, 1],
      "F",
      true
    );
    doc.setLineWidth(figH * 0.05);
    doc.line(cx - shHalf, shY + 0.4, cx - shHalf, hipY);
    doc.line(cx + shHalf, shY + 0.4, cx + shHalf, hipY);
    doc.setLineWidth(figH * 0.06);
    doc.line(cx - hipHalf * 0.55, hipY, cx - hipHalf * 0.75, footY);
    doc.line(cx + hipHalf * 0.55, hipY, cx + hipHalf * 0.75, footY);
    drawGuides(doc, guide, x, w, cx, figTop, footY, shY, hipY);
  }

  doc.setLineWidth(0.2);
  doc.setLineCap("butt");
  doc.setLineJoin("miter");
}

function drawGuides(
  doc: JsPdfInstance,
  color: string,
  boxX: number,
  boxW: number,
  plumbX: number,
  top: number,
  footY: number,
  shoulderY: number,
  hipY: number
) {
  doc.setDrawColor(color);
  doc.setLineWidth(0.22);
  doc.setLineDashPattern([0.55, 0.55], 0);
  doc.line(plumbX, top - 0.6, plumbX, footY + 0.4);
  doc.line(boxX + 2.4, shoulderY, boxX + boxW - 2.4, shoulderY);
  doc.line(boxX + 2.4, hipY, boxX + boxW - 2.4, hipY);
  doc.setLineDashPattern([], 0);
}
