/**
 * Shared posture report types, maps, and insight scoring.
 * Used by the on-screen report and the deterministic PDF generator.
 */

export interface Measurement {
  id: string;
  metricKey: string;
  value: number;
  unit: string;
  quality: string;
  confidence: number;
}

export interface TestResult {
  id: string;
  testType: string;
  overallQuality: string;
  avgConfidence: number;
  snapshotUrl?: string | null;
  measurements: Measurement[];
}

export interface PostureSession {
  id: string;
  deviceInfo?: string | null;
  clinicalOpinion?: string | null;
  createdAt: string;
  completedAt?: string | null;
  testResults: TestResult[];
  insightOverrides?: InsightOverrideRecord[];
}

export interface PatientProfile {
  photo?: string | null;
  age?: number | null;
  phone?: string | null;
  gender?: string | null;
  shortDescription?: string | null;
  longDetails?: string | null;
  clinicalOpinion?: string | null;
  videoLinks?: string[] | null;
  responsibleAdmin?: { id: string; name: string } | null;
}

export interface Patient {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  profile?: PatientProfile | null;
}

export interface ReportData {
  patient: Patient;
  sessions: PostureSession[];
}

export type InsightColor = "red" | "orange" | "yellow" | "green";

export interface Insight {
  key: string;
  title: string;
  description: string;
  /** AI-computed score (never overwritten). */
  aiScore: number;
  /** Effective score used in grades / PDF: clinician override if set, else AI. */
  riskScore: number;
  clinicianScore?: number | null;
  color: InsightColor;
}

export interface InsightOverrideRecord {
  insightKey: string;
  aiScore: number;
  clinicianScore: number;
}

export const INSIGHT_KEYS = [
  "scoliosis",
  "forward_head",
  "kyphosis",
  "lumbar_disc",
  "cervical_disc",
  "meniscus_acl",
  "frozen_shoulder",
  "shoulder_mobility",
  "knee_oa",
  "tinnitus",
  "general_posture",
  "fibromyalgia",
  "tennis_elbow",
  "plantar_heel",
] as const;

export type InsightKey = (typeof INSIGHT_KEYS)[number];

export function colorFromScore(score: number, hi = 70, mid = 30): InsightColor {
  return score > hi ? "red" : score > mid ? "orange" : "green";
}

export function applyInsightOverrides(
  insights: Insight[],
  overrides?: InsightOverrideRecord[] | Record<string, number> | null
): Insight[] {
  if (!overrides) return insights;
  const map: Record<string, number> = Array.isArray(overrides)
    ? Object.fromEntries(overrides.map((o) => [o.insightKey, o.clinicianScore]))
    : overrides;
  return insights.map((insight) => {
    const raw = map[insight.key];
    if (raw == null || Number.isNaN(Number(raw))) return insight;
    const clinicianScore = Math.max(0, Math.min(100, Math.round(Number(raw))));
    return {
      ...insight,
      clinicianScore,
      riskScore: clinicianScore,
      color: colorFromScore(clinicianScore),
    };
  });
}

export const TEST_TYPE_MAP: Record<string, string> = {
  front_static_posture: "Ön Postür Analizi",
  side_static_posture: "Yan Postür Analizi",
  squat_5_reps: "Squat Analizi (5 Tekrar)",
  shoulder_flexion: "Omuz Fleksiyonu",
  shoulder_abduction: "Omuz Abdüksiyonu",
};

export const METRIC_NAME_MAP: Record<string, string> = {
  shoulderLevelAngle: "Omuz Denge Açısı",
  pelvicLevelAngle: "Kalça (Pelvis) Denge Açısı",
  trunkLateralLean: "Gövde Yana Eğilim",
  forwardHeadAngle: "İleri Baş Açısı (FHP)",
  sagittalTrunkLean: "Gövde Öne Eğilim",
  completedRepetitions: "Tamamlanan Tekrar",
  maxLeftKneeFlexion: "Maks. Sol Diz Fleksiyonu",
  maxRightKneeFlexion: "Maks. Sağ Diz Fleksiyonu",
  maxTrunkShift: "Gövde Yanal Kayması",
  leftShoulderROM: "Sol Omuz ROM",
  rightShoulderROM: "Sağ Omuz ROM",
  difference: "Sağ/Sol Farkı",
};

export const QUALITY_THRESHOLDS: Record<
  string,
  { normal: number; label: string; unit: string }
> = {
  shoulderLevelAngle: { normal: 2, label: "Normal <2°", unit: "°" },
  pelvicLevelAngle: { normal: 2, label: "Normal <2°", unit: "°" },
  trunkLateralLean: { normal: 3, label: "Normal <3°", unit: "°" },
  forwardHeadAngle: { normal: 12, label: "Normal <12°", unit: "°" },
  sagittalTrunkLean: { normal: 6, label: "Normal <6°", unit: "°" },
  leftShoulderROM: { normal: 160, label: "Normal >160°", unit: "°" },
  rightShoulderROM: { normal: 160, label: "Normal >160°", unit: "°" },
};

export function generateInsights(session: {
  testResults: Array<{ measurements: Array<{ metricKey: string; value: number }> }>;
}): Insight[] {
  let shoulderLevel = 0,
    hipLevel = 0,
    fhp = 0,
    trunkLean = 0;
  let leftRom = 0,
    rightRom = 0;
  let squatReps = -1,
    leftKneeFlex = 0,
    rightKneeFlex = 0;
  let trunkShiftFront = 0;
  let hasSquatData = false,
    hasRomData = false;

  session.testResults.forEach((test) => {
    test.measurements.forEach((m) => {
      if (m.metricKey === "shoulderLevelAngle") shoulderLevel = Math.abs(m.value);
      if (m.metricKey === "pelvicLevelAngle") hipLevel = Math.abs(m.value);
      if (m.metricKey === "forwardHeadAngle") fhp = Math.abs(m.value);
      if (m.metricKey === "sagittalTrunkLean") trunkLean = Math.abs(m.value);
      if (m.metricKey === "leftShoulderROM") {
        leftRom = m.value;
        hasRomData = true;
      }
      if (m.metricKey === "rightShoulderROM") {
        rightRom = m.value;
        hasRomData = true;
      }
      if (m.metricKey === "completedRepetitions") {
        squatReps = m.value;
        hasSquatData = true;
      }
      if (m.metricKey === "maxLeftKneeFlexion") {
        leftKneeFlex = m.value;
        hasSquatData = true;
      }
      if (m.metricKey === "maxRightKneeFlexion") {
        rightKneeFlex = m.value;
        hasSquatData = true;
      }
      if (m.metricKey === "trunkLateralLean") trunkShiftFront = Math.abs(m.value);
    });
  });

  const minRom = hasRomData
    ? Math.min(leftRom > 0 ? leftRom : 180, rightRom > 0 ? rightRom : 180)
    : 180;
  const kneeFlex = Math.max(leftKneeFlex, rightKneeFlex);

  const scoliosisScore = Math.max(5, Math.min(95, (shoulderLevel + hipLevel) * 8));
  const fhpScore = Math.max(5, Math.min(95, (fhp - 5) * 4));
  const kyphosisScore = Math.max(5, Math.min(90, trunkLean * 6));
  const herniatedDiscScore = Math.max(5, Math.min(95, (trunkShiftFront + hipLevel) * 10));
  const cervicalScore = Math.max(
    5,
    Math.min(95, (fhp > 15 ? fhp * 3 : 5) + Math.abs(leftRom - rightRom) * 0.5)
  );
  const kneeAsymmetry = Math.abs(leftKneeFlex - rightKneeFlex);
  const aclScore = Math.max(5, Math.min(95, kneeAsymmetry * 4));
  const frozenShoulderScore = !hasRomData
    ? 5
    : Math.max(5, Math.min(95, (110 - minRom) * 2.2));
  const mobilityScore = !hasRomData
    ? 5
    : Math.max(5, Math.min(90, (175 - minRom) * 1.2));
  let oaScore = 5;
  if (hasSquatData) {
    const flexPenalty = Math.max(0, (kneeFlex - 60) * 1.2);
    const repPenalty = squatReps < 5 ? (5 - squatReps) * 8 : 0;
    oaScore = Math.max(5, Math.min(95, flexPenalty + repPenalty));
  }
  const tinnitusScore = Math.max(5, Math.min(90, (fhp - 12) * 5));
  const generalPostureScore = Math.round(
    (scoliosisScore + fhpScore + kyphosisScore) / 3
  );
  const fibroScore = Math.max(5, Math.min(60, generalPostureScore * 0.8));

  const item = (
    key: string,
    title: string,
    description: string,
    score: number,
    color: InsightColor
  ): Insight => {
    const riskScore = Math.round(score);
    return { key, title, description, aiScore: riskScore, riskScore, clinicianScore: null, color };
  };

  return [
    item(
      "scoliosis",
      "Skolyoz / Asimetri",
      shoulderLevel > 2 || hipLevel > 2
        ? `Omuz (${shoulderLevel.toFixed(1)}°) ve kalça (${hipLevel.toFixed(1)}°) asimetrisi`
        : "Omuz ve kalça hizası normal.",
      scoliosisScore,
      colorFromScore(scoliosisScore)
    ),
    item(
      "forward_head",
      "İleri Baş Postürü",
      fhp > 12
        ? `Baş dikey eksenden ${fhp.toFixed(1)}° ileride`
        : "Baş-boyun hizası sağlıklı.",
      fhpScore,
      colorFromScore(fhpScore, 60)
    ),
    item(
      "kyphosis",
      "Kifoz / Kamburluk",
      trunkLean > 6
        ? `Gövde ${trunkLean.toFixed(1)}° öne eğik`
        : "Gövde dikliği normal sınırlarda.",
      kyphosisScore,
      colorFromScore(kyphosisScore, 60)
    ),
    item(
      "lumbar_disc",
      "Bel Fıtığı Riski",
      herniatedDiscScore > 30
        ? "Gövde ağırlık merkezi asimetrik dağılıyor."
        : "Bel ve pelvis dengeli yük taşıyor.",
      herniatedDiscScore,
      colorFromScore(herniatedDiscScore)
    ),
    item(
      "cervical_disc",
      "Boyun Fıtığı Riski",
      cervicalScore > 30
        ? "Servikal sinir baskısı riski tespit edildi."
        : "Boyun ekseninde risk saptanmadı.",
      cervicalScore,
      colorFromScore(cervicalScore)
    ),
    item(
      "meniscus_acl",
      "Menisküs / Bağ Riski",
      kneeAsymmetry > 15
        ? `Diz bükülme açıları arasında ciddi fark (${kneeAsymmetry.toFixed(0)}°)`
        : "Her iki diz dengeli ve simetrik.",
      aclScore,
      colorFromScore(aclScore)
    ),
    item(
      "frozen_shoulder",
      "Donuk Omuz",
      frozenShoulderScore > 40
        ? "Omuz eklem açıklığı kritik seviyede kısıtlı."
        : "Omuz kapsülünde donukluk belirtisi yok.",
      frozenShoulderScore,
      colorFromScore(frozenShoulderScore, 60, 40)
    ),
    item(
      "shoulder_mobility",
      "Omuz Mobilite",
      minRom < 160
        ? `Omuz ROM: ${minRom.toFixed(1)}° (ideal 180°)`
        : "Omuz hareket açıklığı mükemmel.",
      mobilityScore,
      colorFromScore(mobilityScore)
    ),
    item(
      "knee_oa",
      "Diz Kireçlenmesi",
      oaScore > 40
        ? "Squat kapasitesinde ciddi yetersizlik."
        : "Alt ekstremite gücü sağlıklı.",
      oaScore,
      colorFromScore(oaScore, 60, 40)
    ),
    item(
      "tinnitus",
      "Kulak Çınlaması",
      tinnitusScore > 40
        ? "Servikal gerginlik çınlamayı tetikleyebilir."
        : "Servikal eksende çınlama riski yok.",
      tinnitusScore,
      colorFromScore(tinnitusScore)
    ),
    item(
      "general_posture",
      "Genel Duruş",
      generalPostureScore > 30
        ? "Birden fazla postüral sapma bir arada."
        : "Genel iskelet yapısı çok sağlıklı.",
      generalPostureScore,
      colorFromScore(generalPostureScore)
    ),
    item(
      "fibromyalgia",
      "Fibromiyalji (Dolaylı)",
      "Kronik yaygın ağrı potansiyeli (Klinik test gerektirir).",
      fibroScore,
      fibroScore > 40 ? "orange" : "green"
    ),
    item(
      "tennis_elbow",
      "Tenisçi/Golfçü Dirseği",
      "Dirsek ve el bileği için spesifik ROM testleri gereklidir.",
      5,
      "green"
    ),
    item(
      "plantar_heel",
      "Topuk Dikeni / Pelvik Taban",
      "Ayak basış analizi ve klinik palpe testi yapılması önerilir.",
      5,
      "green"
    ),
  ];
}

export function riskPalette(color: InsightColor) {
  if (color === "red")
    return { stroke: "#b91c1c", text: "#7f1d1d", bg: "#fef2f2", bar: "#ef4444" };
  if (color === "orange")
    return { stroke: "#c2410c", text: "#9a3412", bg: "#fff7ed", bar: "#f97316" };
  if (color === "yellow")
    return { stroke: "#a16207", text: "#854d0e", bg: "#fefce8", bar: "#eab308" };
  return { stroke: "#15803d", text: "#14532d", bg: "#f0fdf4", bar: "#22c55e" };
}

export function qualityLabel(q: string) {
  const ql = q?.toLowerCase() ?? "";
  if (ql === "high" || ql === "excellent")
    return { text: "Mükemmel", ok: true };
  if (ql === "good") return { text: "İyi", ok: true };
  if (ql === "acceptable") return { text: "Kabul Edilebilir", ok: true };
  if (ql === "low" || ql === "poor") return { text: "Düşük", ok: false };
  if (ql === "invalid") return { text: "Geçersiz", ok: false };
  return { text: q || "—", ok: false };
}

export function overallRiskGrade(insights: Insight[]) {
  const avg =
    insights.reduce((s, i) => s + i.riskScore, 0) / Math.max(insights.length, 1);
  if (avg < 20)
    return {
      grade: "A",
      label: "Mükemmel",
      color: "#15803d",
      desc: "Postüral durum çok sağlıklı",
    };
  if (avg < 35)
    return {
      grade: "B",
      label: "İyi",
      color: "#65a30d",
      desc: "Hafif iyileştirme alanları mevcut",
    };
  if (avg < 50)
    return {
      grade: "C",
      label: "Orta",
      color: "#ca8a04",
      desc: "Belirli bölgelerde dikkat gerekli",
    };
  if (avg < 65)
    return {
      grade: "D",
      label: "Zayıf",
      color: "#ea580c",
      desc: "Kapsamlı fizyoterapi önerilir",
    };
  return {
    grade: "E",
    label: "Kritik",
    color: "#dc2626",
    desc: "Acil müdahale gerektirebilir",
  };
}

export function genderLabel(gender?: string | null) {
  if (gender === "male") return "Erkek";
  if (gender === "female") return "Kadın";
  return "Belirtilmemiş";
}

export function formatTrDate(iso: string | Date, withTime = false) {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleDateString(
    "tr-TR",
    withTime
      ? {
          day: "numeric",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }
      : { day: "numeric", month: "long", year: "numeric" }
  );
}

export function resolveAssetUrl(path?: string | null): string | null {
  if (!path) return null;
  if (path.startsWith("http") || path.startsWith("data:")) return path;
  if (path.startsWith("/")) return path;
  return `/${path}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Clinical / biomechanical assessment helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Metrics where a higher value is clinically better (ROM, reps, depth). */
export const HIGHER_IS_BETTER = new Set([
  "leftShoulderROM",
  "rightShoulderROM",
  "completedRepetitions",
  "maxLeftKneeFlexion",
  "maxRightKneeFlexion",
]);

export type Severity = "normal" | "mild" | "moderate" | "severe" | "info";

export interface MetricAssessment {
  severity: Severity;
  status: string;
  reference: string;
  deviation: string;
}

export function metricUnit(metricKey: string, unit?: string): string {
  if (unit) return unit;
  if (metricKey === "completedRepetitions") return "";
  return "°";
}

/**
 * Classifies a single measurement against its clinical reference range and
 * returns severity, a status label, the reference string, and the deviation.
 */
export function assessMetric(
  metricKey: string,
  value: number,
  unit?: string
): MetricAssessment {
  const u = metricUnit(metricKey, unit);

  if (metricKey === "completedRepetitions") {
    const target = 5;
    if (value >= target)
      return {
        severity: "normal",
        status: "Tamamlandı",
        reference: `≥ ${target} tekrar`,
        deviation: "—",
      };
    const miss = target - value;
    const severity: Severity = miss <= 1 ? "mild" : miss <= 2 ? "moderate" : "severe";
    return {
      severity,
      status: "Eksik tekrar",
      reference: `≥ ${target} tekrar`,
      deviation: `-${miss} tekrar`,
    };
  }

  const th = QUALITY_THRESHOLDS[metricKey];
  if (!th) {
    return { severity: "info", status: "Bilgi", reference: "—", deviation: `${value.toFixed(1)}${u}` };
  }
  const normal = th.normal;

  if (HIGHER_IS_BETTER.has(metricKey)) {
    if (value >= normal)
      return {
        severity: "normal",
        status: "Normal",
        reference: `> ${normal}${u}`,
        deviation: "yeterli",
      };
    const ratio = value / normal;
    const severity: Severity = ratio >= 0.9 ? "mild" : ratio >= 0.75 ? "moderate" : "severe";
    const status =
      severity === "mild"
        ? "Hafif kısıtlılık"
        : severity === "moderate"
          ? "Orta kısıtlılık"
          : "Belirgin kısıtlılık";
    return {
      severity,
      status,
      reference: `> ${normal}${u}`,
      deviation: `-${(normal - value).toFixed(0)}${u} defisit`,
    };
  }

  const abs = Math.abs(value);
  if (abs <= normal)
    return {
      severity: "normal",
      status: "Normal",
      reference: `< ${normal}${u}`,
      deviation: `${abs.toFixed(1)}${u}`,
    };
  const ratio = abs / normal;
  const severity: Severity = ratio <= 1.5 ? "mild" : ratio <= 2.5 ? "moderate" : "severe";
  const status =
    severity === "mild" ? "Sınırda" : severity === "moderate" ? "Orta sapma" : "Belirgin sapma";
  return {
    severity,
    status,
    reference: `< ${normal}${u}`,
    deviation: `+${(abs - normal).toFixed(1)}${u}`,
  };
}

export function severityPalette(severity: Severity) {
  switch (severity) {
    case "severe":
      return { color: "#dc2626", bg: "#fef2f2", bgSoft: "rgba(239,68,68,0.16)", label: "Belirgin" };
    case "moderate":
      return { color: "#ea580c", bg: "#fff7ed", bgSoft: "rgba(249,115,22,0.16)", label: "Orta" };
    case "mild":
      return { color: "#ca8a04", bg: "#fefce8", bgSoft: "rgba(234,179,8,0.16)", label: "Hafif" };
    case "info":
      return { color: "#475569", bg: "#f1f5f9", bgSoft: "rgba(148,163,184,0.16)", label: "Bilgi" };
    default:
      return { color: "#16a34a", bg: "#f0fdf4", bgSoft: "rgba(34,197,94,0.16)", label: "Normal" };
  }
}

/** Overall Postural Index (0–100, higher is healthier). */
export function posturalIndex(insights: Insight[]): number {
  const avg =
    insights.reduce((s, i) => s + i.riskScore, 0) / Math.max(insights.length, 1);
  return Math.round(100 - avg);
}

export function posturalIndexBand(index: number) {
  if (index >= 80) return { label: "Optimal", color: "#15803d" };
  if (index >= 65) return { label: "İyi", color: "#65a30d" };
  if (index >= 50) return { label: "Orta", color: "#ca8a04" };
  if (index >= 35) return { label: "Zayıf", color: "#ea580c" };
  return { label: "Kritik", color: "#dc2626" };
}

/** Left/right symmetry index (0–100) from bilateral shoulder ROM if present. */
export function symmetryIndex(session: PostureSession): number | null {
  let left = 0,
    right = 0,
    has = false;
  session.testResults.forEach((t) =>
    t.measurements.forEach((m) => {
      if (m.metricKey === "leftShoulderROM") {
        left = m.value;
        has = true;
      }
      if (m.metricKey === "rightShoulderROM") {
        right = m.value;
        has = true;
      }
    })
  );
  if (!has || left <= 0 || right <= 0) return null;
  const diff = Math.abs(left - right);
  const mean = (left + right) / 2;
  return Math.max(0, Math.round(100 - (diff / mean) * 100));
}

export function riskSeverity(color: InsightColor): Severity {
  if (color === "red") return "severe";
  if (color === "orange") return "moderate";
  if (color === "yellow") return "mild";
  return "normal";
}
