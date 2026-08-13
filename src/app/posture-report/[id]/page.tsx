"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { 
  ArrowLeft, Download, Activity, Target, RotateCw, Fingerprint, 
  Heart, Navigation, Move, ZoomIn, Bone, Info, Stethoscope, 
  ClipboardList, CheckCircle2, AlertTriangle, ShieldAlert, Image as ImageIcon
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface Measurement {
  id: string;
  metricKey: string;
  value: number;
  unit: string;
  quality: string;
  confidence: number;
}

interface TestResult {
  id: string;
  testType: string;
  overallQuality: string;
  avgConfidence: number;
  snapshotUrl?: string;
  measurements: Measurement[];
}

interface PostureSession {
  id: string;
  deviceInfo?: string;
  createdAt: string;
  completedAt?: string;
  testResults: TestResult[];
}

interface PatientProfile {
  photo?: string;
  age?: number;
  phone?: string;
  gender?: string;
  shortDescription?: string;
  longDetails?: string;
  clinicalOpinion?: string;
  videoLinks?: string[];
  responsibleAdmin?: { id: string; name: string };
}

interface Patient {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  profile?: PatientProfile;
}

interface ReportData {
  patient: Patient;
  sessions: PostureSession[];
}

interface Insight {
  title: string;
  description: string;
  riskScore: number;
  color: "red" | "orange" | "yellow" | "green";
  icon: any; // Lucide icon
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const TEST_TYPE_MAP: Record<string, string> = {
  front_static_posture: "Ön Postür Analizi",
  side_static_posture: "Yan Postür Analizi",
  squat_5_reps: "Squat Analizi (5 Tekrar)",
  shoulder_flexion: "Omuz Fleksiyonu",
  shoulder_abduction: "Omuz Abdüksiyonu",
};

const METRIC_NAME_MAP: Record<string, string> = {
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

const QUALITY_THRESHOLDS: Record<string, { normal: number; label: string; unit: string }> = {
  shoulderLevelAngle: { normal: 2, label: "Normal <2°", unit: "°" },
  pelvicLevelAngle: { normal: 2, label: "Normal <2°", unit: "°" },
  trunkLateralLean: { normal: 3, label: "Normal <3°", unit: "°" },
  forwardHeadAngle: { normal: 12, label: "Normal <12°", unit: "°" },
  sagittalTrunkLean: { normal: 6, label: "Normal <6°", unit: "°" },
  leftShoulderROM: { normal: 160, label: "Normal >160°", unit: "°" },
  rightShoulderROM: { normal: 160, label: "Normal >160°", unit: "°" },
};

// ─────────────────────────────────────────────────────────────────────────────
// Insight Generator 
// ─────────────────────────────────────────────────────────────────────────────
function generateInsights(session: PostureSession): Insight[] {
  let shoulderLevel = 0, hipLevel = 0, fhp = 0, trunkLean = 0;
  let leftRom = 0, rightRom = 0;
  let squatReps = -1, leftKneeFlex = 0, rightKneeFlex = 0;
  let trunkShiftFront = 0;
  let hasSquatData = false, hasRomData = false;

  session.testResults.forEach((test) => {
    test.measurements.forEach((m) => {
      if (m.metricKey === "shoulderLevelAngle") shoulderLevel = Math.abs(m.value);
      if (m.metricKey === "pelvicLevelAngle") hipLevel = Math.abs(m.value);
      if (m.metricKey === "forwardHeadAngle") fhp = Math.abs(m.value);
      if (m.metricKey === "sagittalTrunkLean") trunkLean = Math.abs(m.value);
      if (m.metricKey === "leftShoulderROM") { leftRom = m.value; hasRomData = true; }
      if (m.metricKey === "rightShoulderROM") { rightRom = m.value; hasRomData = true; }
      if (m.metricKey === "completedRepetitions") { squatReps = m.value; hasSquatData = true; }
      if (m.metricKey === "maxLeftKneeFlexion") { leftKneeFlex = m.value; hasSquatData = true; }
      if (m.metricKey === "maxRightKneeFlexion") { rightKneeFlex = m.value; hasSquatData = true; }
      if (m.metricKey === "trunkLateralLean") trunkShiftFront = Math.abs(m.value);
    });
  });

  const minRom = hasRomData ? Math.min(leftRom > 0 ? leftRom : 180, rightRom > 0 ? rightRom : 180) : 180;
  const kneeFlex = Math.max(leftKneeFlex, rightKneeFlex);

  const scoliosisScore = Math.max(5, Math.min(95, (shoulderLevel + hipLevel) * 8));
  const fhpScore = Math.max(5, Math.min(95, (fhp - 5) * 4));
  const kyphosisScore = Math.max(5, Math.min(90, trunkLean * 6));
  const herniatedDiscScore = Math.max(5, Math.min(95, (trunkShiftFront + hipLevel) * 10));
  const cervicalScore = Math.max(5, Math.min(95, (fhp > 15 ? fhp * 3 : 5) + Math.abs(leftRom - rightRom) * 0.5));
  const kneeAsymmetry = Math.abs(leftKneeFlex - rightKneeFlex);
  const aclScore = Math.max(5, Math.min(95, kneeAsymmetry * 4));
  const frozenShoulderScore = !hasRomData ? 5 : Math.max(5, Math.min(95, (110 - minRom) * 2.2));
  const mobilityScore = !hasRomData ? 5 : Math.max(5, Math.min(90, (175 - minRom) * 1.2));
  let oaScore = 5;
  if (hasSquatData) {
    const flexPenalty = Math.max(0, (kneeFlex - 60) * 1.2);
    const repPenalty = squatReps < 5 ? (5 - squatReps) * 8 : 0;
    oaScore = Math.max(5, Math.min(95, flexPenalty + repPenalty));
  }
  const tinnitusScore = Math.max(5, Math.min(90, (fhp - 12) * 5));
  const generalPostureScore = Math.round((scoliosisScore + fhpScore + kyphosisScore) / 3);
  const fibroScore = Math.max(5, Math.min(60, generalPostureScore * 0.8));

  const c = (s: number, hi = 70, mid = 30): Insight["color"] => s > hi ? "red" : s > mid ? "orange" : "green";

  return [
    { title: "Skolyoz / Asimetri", description: (shoulderLevel > 2 || hipLevel > 2) ? `Omuz (${shoulderLevel.toFixed(1)}°) ve kalça (${hipLevel.toFixed(1)}°) asimetrisi` : "Omuz ve kalça hizası normal.", riskScore: Math.round(scoliosisScore), color: c(scoliosisScore), icon: Bone },
    { title: "İleri Baş Postürü", description: fhp > 12 ? `Baş dikey eksenden ${fhp.toFixed(1)}° ileride` : "Baş-boyun hizası sağlıklı.", riskScore: Math.round(fhpScore), color: c(fhpScore, 60), icon: Stethoscope },
    { title: "Kifoz / Kamburluk", description: trunkLean > 6 ? `Gövde ${trunkLean.toFixed(1)}° öne eğik` : "Gövde dikliği normal sınırlarda.", riskScore: Math.round(kyphosisScore), color: c(kyphosisScore, 60), icon: RotateCw },
    { title: "Bel Fıtığı Riski", description: herniatedDiscScore > 30 ? "Gövde ağırlık merkezi asimetrik dağılıyor." : "Bel ve pelvis dengeli yük taşıyor.", riskScore: Math.round(herniatedDiscScore), color: c(herniatedDiscScore), icon: ShieldAlert },
    { title: "Boyun Fıtığı Riski", description: cervicalScore > 30 ? "Servikal sinir baskısı riski tespit edildi." : "Boyun ekseninde risk saptanmadı.", riskScore: Math.round(cervicalScore), color: c(cervicalScore), icon: AlertTriangle },
    { title: "Menisküs / Bağ Riski", description: kneeAsymmetry > 15 ? `Diz bükülme açıları arasında ciddi fark (${kneeAsymmetry.toFixed(0)}°)` : "Her iki diz dengeli ve simetrik.", riskScore: Math.round(aclScore), color: c(aclScore), icon: Fingerprint },
    { title: "Donuk Omuz", description: frozenShoulderScore > 40 ? "Omuz eklem açıklığı kritik seviyede kısıtlı." : "Omuz kapsülünde donukluk belirtisi yok.", riskScore: Math.round(frozenShoulderScore), color: c(frozenShoulderScore, 60, 40), icon: Target },
    { title: "Omuz Mobilite", description: minRom < 160 ? `Omuz ROM: ${minRom.toFixed(1)}° (ideal 180°)` : "Omuz hareket açıklığı mükemmel.", riskScore: Math.round(mobilityScore), color: c(mobilityScore), icon: Move },
    { title: "Diz Kireçlenmesi", description: oaScore > 40 ? "Squat kapasitesinde ciddi yetersizlik." : "Alt ekstremite gücü sağlıklı.", riskScore: Math.round(oaScore), color: c(oaScore, 60, 40), icon: Activity },
    { title: "Kulak Çınlaması", description: tinnitusScore > 40 ? "Servikal gerginlik çınlamayı tetikleyebilir." : "Servikal eksende çınlama riski yok.", riskScore: Math.round(tinnitusScore), color: c(tinnitusScore), icon: Navigation },
    { title: "Genel Duruş", description: generalPostureScore > 30 ? "Birden fazla postüral sapma bir arada." : "Genel iskelet yapısı çok sağlıklı.", riskScore: generalPostureScore, color: c(generalPostureScore), icon: ZoomIn },
    { title: "Fibromiyalji (Dolaylı)", description: "Kronik yaygın ağrı potansiyeli (Klinik test gerektirir).", riskScore: Math.round(fibroScore), color: fibroScore > 40 ? "orange" : "green", icon: Heart },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function riskColor(color: Insight["color"]) {
  if (color === "red") return { stroke: "#ef4444", text: "#b91c1c", bg: "#fef2f2", badge: "#fee2e2" };
  if (color === "orange") return { stroke: "#f97316", text: "#c2410c", bg: "#fff7ed", badge: "#ffedd5" };
  if (color === "yellow") return { stroke: "#eab308", text: "#a16207", bg: "#fefce8", badge: "#fef9c3" };
  return { stroke: "#22c55e", text: "#15803d", bg: "#f0fdf4", badge: "#dcfce7" };
}

function qualityLabel(q: string) {
  const ql = q?.toLowerCase() ?? "";
  if (ql === "high" || ql === "excellent") return { text: "Mükemmel", cls: "qual-excellent" };
  if (ql === "good") return { text: "İyi", cls: "qual-good" };
  if (ql === "acceptable") return { text: "Kabul Edilebilir", cls: "qual-acceptable" };
  if (ql === "low" || ql === "poor") return { text: "Düşük", cls: "qual-poor" };
  if (ql === "invalid") return { text: "Geçersiz", cls: "qual-invalid" };
  return { text: q, cls: "qual-acceptable" };
}

function overallRiskGrade(insights: Insight[]) {
  const avg = insights.reduce((s, i) => s + i.riskScore, 0) / insights.length;
  if (avg < 20) return { grade: "A", label: "Mükemmel", color: "#22c55e", desc: "Postüral durum çok sağlıklı" };
  if (avg < 35) return { grade: "B", label: "İyi", color: "#84cc16", desc: "Hafif iyileştirme alanları mevcut" };
  if (avg < 50) return { grade: "C", label: "Orta", color: "#eab308", desc: "Belirli bölgelerde dikkat gerekli" };
  if (avg < 65) return { grade: "D", label: "Zayıf", color: "#f97316", desc: "Kapsamlı fizyoterapi önerilir" };
  return { grade: "E", label: "Kritik", color: "#ef4444", desc: "Acil müdahale gerektirebilir" };
}

// ─────────────────────────────────────────────────────────────────────────────
// SVG Ring chart
// ─────────────────────────────────────────────────────────────────────────────
function RingChart({ score, color, size = 80 }: { score: number; color: string; size?: number }) {
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const cx = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="#e5e7eb" strokeWidth="8" />
      <circle cx={cx} cy={cx} r={r} fill="none" stroke={color} strokeWidth="8"
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
function ReportInner() {
  const { id: userId } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get("sessionId") ?? undefined;
  const printRef = useRef<HTMLDivElement>(null);

  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedSessionIdx, setSelectedSessionIdx] = useState(0);

  useEffect(() => {
    async function load() {
      try {
        const params = new URLSearchParams({ userId });
        if (sessionId) params.set("sessionId", sessionId);
        const res = await fetch(`/api/posture/report?${params}`);
        if (!res.ok) throw new Error("Veriler alınamadı");
        setData(await res.json());
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    if (userId) load();
  }, [userId, sessionId]);

  const handlePrint = () => window.print();

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 gap-4 text-slate-500">
      <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      <p>Rapor hazırlanıyor...</p>
    </div>
  );

  if (error) return <div className="p-10 text-center text-red-500 min-h-screen bg-slate-50">{error}</div>;
  if (!data || data.sessions.length === 0) return <div className="p-10 text-center text-slate-500 min-h-screen bg-slate-50">Bu hasta için rapor verisi bulunamadı.</div>;

  const session = data.sessions[selectedSessionIdx];
  const patient = data.patient;
  const insights = generateInsights(session);
  const grade = overallRiskGrade(insights);
  const reportDate = new Date().toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
  const sessionDate = new Date(session.createdAt).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const highRisk = insights.filter(i => i.color === "red");
  const medRisk = insights.filter(i => i.color === "orange");
  const okRisk = insights.filter(i => i.color === "green");

  return (
    <div style={{ background: "#f1f5f9", width: "100%", fontFamily: "'Inter', sans-serif" }}>
      {/* ── Print / page CSS ─────────────────────────────────── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

        :root {
          --brand: #4f46e5;
          --brand-light: #6366f1;
          --brand-dark: #3730a3;
          --danger: #ef4444;
          --warn: #f97316;
          --ok: #22c55e;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }

        /* Override root layout body constraints for this page */
        html, body {
          height: auto !important;
          min-height: 0 !important;
          overflow: visible !important;
          font-family: 'Inter', sans-serif;
          background: #f1f5f9 !important;
        }

        /* ── Toolbar (no-print) ───────────────────────────────── */
        .rpt-toolbar {
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          background: rgba(255,255,255,0.7); backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255,255,255,0.5);
          padding: 16px 32px; display: flex; align-items: center; gap: 16px;
          box-shadow: 0 4px 30px rgba(0, 0, 0, 0.05);
        }
        .rpt-toolbar-title { font-weight: 700; color: #0f172a; flex: 1; font-size: 15px; display: flex; items-center; gap: 8px;}
        .rpt-btn {
          display: flex; align-items: center; gap: 8px; padding: 10px 20px;
          border-radius: 12px; font-size: 14px; font-weight: 600; cursor: pointer;
          border: none; transition: all 0.2s;
        }
        .rpt-btn-back { background: rgba(255,255,255,0.8); color: #334155; border: 1px solid rgba(0,0,0,0.05); }
        .rpt-btn-back:hover { background: rgba(255,255,255,1); }
        .rpt-btn-print {
          background: var(--brand); color: white;
          box-shadow: 0 4px 12px rgba(79,70,229,0.25);
        }
        .rpt-btn-print:hover { transform: translateY(-1px); background: var(--brand-light); }
        
        .rpt-session-select {
          border: 1px solid rgba(0,0,0,0.1); border-radius: 10px;
          padding: 8px 16px; font-size: 13px; color: #334155;
          background: rgba(255,255,255,0.8); cursor: pointer; backdrop-filter: blur(10px);
          outline: none;
        }

        /* ── Report Canvas ───────────────────────────────────── */
        .rpt-canvas {
          max-width: 1100px; margin: 0 auto; padding: 120px 32px 80px;
          font-family: 'Inter', sans-serif;
        }

        /* ── Cover / Hero ────────────────────────────────────── */
        .rpt-cover {
          background: rgba(255, 255, 255, 0.6);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255, 255, 255, 0.8);
          border-radius: 28px; padding: 48px; color: #0f172a; margin-bottom: 32px;
          position: relative; overflow: hidden;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.03);
        }
        .rpt-cover-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; position: relative; z-index: 1; }
        .rpt-brand { display: flex; align-items: center; gap: 16px; }
        .rpt-brand-logo {
          width: 52px; height: 52px; background: linear-gradient(135deg, var(--brand), var(--brand-light));
          border-radius: 16px; display: flex; align-items: center; justify-content: center;
          color: white; box-shadow: 0 8px 24px rgba(79,70,229,0.2);
        }
        .rpt-brand-name { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; color: #0f172a; }
        .rpt-brand-sub { font-size: 12px; color: #64748b; letter-spacing: 0.5px; text-transform: uppercase; margin-top: 2px; font-weight: 600; }
        .rpt-cover-badge {
          background: rgba(79,70,229,0.08); border: 1px solid rgba(79,70,229,0.2); color: var(--brand-dark);
          border-radius: 100px; padding: 8px 20px; font-size: 13px; font-weight: 600;
          display: flex; align-items: center; gap: 8px;
        }
        .rpt-cover-body { display: flex; gap: 40px; align-items: center; position: relative; z-index: 1; }
        
        .rpt-patient-avatar {
          width: 110px; height: 110px; border-radius: 50%;
          border: 4px solid white;
          background: #e2e8f0; object-fit: cover;
          display: flex; align-items: center; justify-content: center;
          color: #94a3b8; flex-shrink: 0;
          box-shadow: 0 8px 24px rgba(0,0,0,0.08);
          overflow: hidden;
        }
        .rpt-patient-avatar img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; }
        
        .rpt-cover-info h1 { font-size: 40px; font-weight: 900; letter-spacing: -1px; line-height: 1.15; color: #0f172a; }
        .rpt-cover-info h1 span { color: var(--brand); }
        .rpt-cover-info-sub { font-size: 16px; color: #475569; margin-top: 12px; font-weight: 500; }
        
        .rpt-cover-meta { display: flex; gap: 16px; margin-top: 24px; flex-wrap: wrap; }
        .rpt-meta-chip {
          background: white; border: 1px solid rgba(0,0,0,0.06);
          border-radius: 12px; padding: 12px 20px; font-size: 13px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.02); color: #64748b;
        }
        .rpt-meta-chip strong { display: block; font-size: 14px; font-weight: 700; margin-bottom: 4px; color: #0f172a;}
        
        .rpt-grade-badge {
          margin-left: auto; background: white; border: 1px solid rgba(0,0,0,0.06);
          border-radius: 24px; padding: 24px 32px; text-align: center; flex-shrink: 0;
          box-shadow: 0 12px 32px rgba(0,0,0,0.05);
        }
        .rpt-grade-letter { font-size: 64px; font-weight: 900; line-height: 1; }
        .rpt-grade-label { font-size: 14px; font-weight: 700; margin-top: 8px; color: #334155; }
        .rpt-grade-desc { font-size: 12px; color: #64748b; margin-top: 4px; max-width: 140px; line-height: 1.5; }

        /* ── Section headings ─────────────────────────────────── */
        .rpt-section { margin-bottom: 40px; }
        .rpt-section-title {
          display: flex; align-items: center; gap: 14px;
          font-size: 20px; font-weight: 800; color: #0f172a;
          margin-bottom: 24px; padding-bottom: 16px;
          border-bottom: 2px solid rgba(0,0,0,0.05);
        }
        .rpt-section-icon {
          width: 40px; height: 40px; border-radius: 12px;
          background: rgba(79,70,229,0.1);
          display: flex; align-items: center; justify-content: center;
          color: var(--brand); 
        }

        /* ── Patient Note ─────────────────────────────────────── */
        .rpt-patient-note {
          background: rgba(255, 255, 255, 0.6); backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.8); border-radius: 20px;
          padding: 24px; color: #475569; font-size: 14px; line-height: 1.7;
          box-shadow: 0 8px 24px rgba(0,0,0,0.02);
        }
        .rpt-patient-note strong {
          display: flex; align-items: center; gap: 8px; color: #0f172a; font-size: 15px; margin-bottom: 8px;
        }

        /* ── Risk Summary bar ─────────────────────────────────── */
        .rpt-risk-summary {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 24px;
        }
        .rpt-risk-card {
          border-radius: 20px; padding: 24px;
          background: rgba(255,255,255,0.6); backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.8); display: flex; align-items: center; gap: 20px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.02);
        }
        .rpt-risk-card.red { border-left: 6px solid #ef4444; }
        .rpt-risk-card.orange { border-left: 6px solid #f97316; }
        .rpt-risk-card.green { border-left: 6px solid #22c55e; }
        
        .rpt-risk-count { font-size: 48px; font-weight: 900; line-height: 1; }
        .rpt-risk-count.red { color: #ef4444; }
        .rpt-risk-count.orange { color: #f97316; }
        .rpt-risk-count.green { color: #22c55e; }
        
        .rpt-risk-card-text h4 { font-size: 15px; font-weight: 700; color: #0f172a; }
        .rpt-risk-card-text p { font-size: 13px; color: #64748b; margin-top: 4px; }

        /* ── Insights Grid ────────────────────────────────────── */
        .rpt-insights-grid {
          display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;
        }
        .rpt-insight-card {
          border-radius: 20px; padding: 20px 24px;
          background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.8);
          display: flex; align-items: center; gap: 20px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.03);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .rpt-insight-card:hover { transform: translateY(-2px); box-shadow: 0 10px 30px rgba(0,0,0,0.06); }
        .rpt-insight-ring { position: relative; flex-shrink: 0; }
        .rpt-insight-ring-score {
          position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
          font-size: 11px; font-weight: 800; text-align: center; line-height: 1.2;
        }
        .rpt-insight-icon {
          position: absolute; top: -6px; right: -6px;
          width: 24px; height: 24px; border-radius: 50%;
          background: white; display: flex; align-items: center; justify-content: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1); color: #64748b;
        }
        .rpt-insight-body h4 { font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 6px; }
        .rpt-insight-body p { font-size: 12px; color: #475569; line-height: 1.6; }

        /* ── Test Results ─────────────────────────────────────── */
        .rpt-test-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; }
        .rpt-test-card {
          border-radius: 24px; border: 1px solid rgba(0,0,0,0.05); overflow: hidden;
          background: rgba(255,255,255,0.7); backdrop-filter: blur(20px);
          box-shadow: 0 8px 32px rgba(0,0,0,0.03);
          display: flex; flex-direction: column;
        }
        .rpt-test-header {
          padding: 16px 20px; border-bottom: 1px solid rgba(0,0,0,0.05);
          display: flex; justify-content: space-between; align-items: center;
          background: rgba(255,255,255,0.8);
        }
        .rpt-test-header h4 { font-size: 15px; font-weight: 700; color: #0f172a; }
        
        .rpt-test-content {
          display: flex; flex-direction: row; flex: 1;
        }
        .rpt-test-snapshot-wrap {
          width: 40%; background: #f8fafc; border-right: 1px solid rgba(0,0,0,0.05);
          display: flex; align-items: center; justify-content: center;
          color: #cbd5e1;
        }
        .rpt-test-snapshot {
          width: 100%; height: 100%; object-fit: contain; display: block;
          max-height: 280px;
        }
        .rpt-test-body { width: 60%; padding: 20px 24px; display: flex; flex-direction: column; justify-content: center; }
        .rpt-metric-row {
          display: flex; justify-content: space-between; align-items: center;
          padding: 10px 0; border-bottom: 1px solid rgba(0,0,0,0.05);
        }
        .rpt-metric-row:last-child { border-bottom: none; }
        .rpt-metric-name { font-size: 13px; color: #475569; font-weight: 500; }
        .rpt-metric-right { display: flex; align-items: center; gap: 10px; }
        .rpt-metric-value { font-size: 14px; font-weight: 700; color: #0f172a; }
        .rpt-metric-dot { width: 8px; height: 8px; border-radius: 50%; }
        .rpt-metric-dot.bad { background: #ef4444; }
        .rpt-metric-dot.ok { background: #22c55e; }

        /* ── Quality badges ───────────────────────────────────── */
        .qual-badge {
          font-size: 12px; font-weight: 700; padding: 6px 12px;
          border-radius: 100px;
        }
        .qual-excellent { background: rgba(34,197,94,0.1); color: #15803d; }
        .qual-good { background: rgba(59,130,246,0.1); color: #1d4ed8; }
        .qual-acceptable { background: rgba(234,179,8,0.1); color: #a16207; }
        .qual-poor { background: rgba(249,115,22,0.1); color: #c2410c; }
        .qual-invalid { background: rgba(239,68,68,0.1); color: #b91c1c; }

        /* ── Clinical Notes ───────────────────────────────────── */
        .rpt-clinical-box {
          background: rgba(241, 245, 249, 0.6);
          border: 1px solid rgba(0,0,0,0.05); border-radius: 20px; padding: 28px;
          backdrop-filter: blur(12px);
        }
        .rpt-clinical-box p { font-size: 15px; color: #334155; line-height: 1.8; white-space: pre-wrap; word-break: break-word; overflow-wrap: break-word; }

        /* ── Recommendations ────────────────────────────────────── */
        .rpt-rec-grid {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px;
        }
        .rpt-rec-card {
          background: rgba(255,255,255,0.7); backdrop-filter: blur(20px);
          border: 1px solid rgba(0,0,0,0.05); border-radius: 20px;
          padding: 24px; box-shadow: 0 4px 20px rgba(0,0,0,0.02);
        }
        .rpt-rec-icon {
          margin-bottom: 16px; color: var(--brand); background: rgba(79,70,229,0.1);
          width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; border-radius: 14px;
        }
        .rpt-rec-title { font-weight: 700; font-size: 15px; color: #0f172a; margin-bottom: 8px; }
        .rpt-rec-text { font-size: 13px; color: #64748b; line-height: 1.7; }

        /* ── Contact Info ───────────────────────────────────────── */
        .rpt-contact-card {
          margin-top: 24px; background: rgba(255,255,255,0.7); backdrop-filter: blur(20px);
          border: 1px solid rgba(0,0,0,0.05); border-radius: 12px; padding: 12px 16px;
          display: flex; justify-content: space-between; align-items: center;
          border-left: 4px solid var(--brand);
        }
        .rpt-contact-title { font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 2px; }
        .rpt-contact-text { font-size: 11px; color: #64748b; line-height: 1.5; }

        /* ── Footer & Disclaimer ────────────────────────────────── */
        .rpt-footer {
          margin-top: 48px; padding-top: 24px;
          border-top: 1px solid rgba(0,0,0,0.1);
          display: flex; justify-content: space-between; align-items: center;
        }
        .rpt-footer-brand { font-size: 16px; font-weight: 800; color: var(--brand); }
        .rpt-footer-note { font-size: 12px; color: #64748b; text-align: right; line-height: 1.6; }
        
        .rpt-disclaimer {
          margin-top: 24px; background: rgba(255,255,255,0.5); border-radius: 12px;
          padding: 16px 20px; font-size: 12px; color: #64748b; line-height: 1.6;
          border: 1px solid rgba(0,0,0,0.05); display: flex; gap: 12px; align-items: flex-start;
        }

        /* ── Print styles (Clean Zoom & Auto Pagination) ─────────────────────── */
        @media print {
          @page { size: A4 portrait; margin: 10mm; }
          html, body, .min-h-screen, .rpt-canvas { 
            background: white !important; min-height: 0 !important; height: auto !important; display: block !important;
            -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;
          }
          .rpt-toolbar { display: none !important; }
          
          /* AGGRESSIVE SHRINKING */
          .rpt-canvas { padding: 0 !important; max-width: 100% !important; zoom: 0.55 !important; }
          
          /* Strip heavy effects for crisp printing */
          .rpt-cover, .rpt-risk-card, .rpt-insight-card, .rpt-test-card, .rpt-clinical-box, .rpt-patient-note, .rpt-disclaimer, .rpt-rec-card, .rpt-contact-card {
            background: white !important; box-shadow: none !important; border: 1px solid #cbd5e1 !important;
            backdrop-filter: none !important; -webkit-backdrop-filter: none !important;
            break-inside: avoid !important; page-break-inside: avoid !important;
          }
          
          /* Layouts enforced in print */
          .rpt-insights-grid, .rpt-rec-grid {
            display: grid !important; grid-template-columns: repeat(3, 1fr) !important;
          }
          .rpt-test-grid {
            display: grid !important; grid-template-columns: repeat(2, 1fr) !important;
          }
          
          /* Keep sections together */
          .rpt-section { break-inside: avoid !important; page-break-inside: avoid !important; }
        }
      `}</style>

      {/* ── Toolbar ─────────────────────────────────────────────────── */}
      <div className="rpt-toolbar">
        <button className="rpt-btn rpt-btn-back" onClick={() => router.push(`/patients/${userId}/posture`)}>
          <ArrowLeft size={16} /> Geri
        </button>
        <span className="rpt-toolbar-title">
          <ClipboardList size={18} className="text-indigo-600" /> 
          Postür Analiz Raporu — <strong className="text-indigo-900">{patient.name}</strong>
        </span>

        {data.sessions.length > 1 && (
          <select
            className="rpt-session-select"
            value={selectedSessionIdx}
            onChange={e => setSelectedSessionIdx(Number(e.target.value))}
          >
            {data.sessions.map((s, i) => (
              <option key={s.id} value={i}>
                {new Date(s.createdAt).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" })}
              </option>
            ))}
          </select>
        )}

        <button className="rpt-btn rpt-btn-print" onClick={handlePrint}>
          <Download size={16} />
          PDF İndir
        </button>
      </div>

      {/* ── Report Canvas ─────────────────────────────────────────────── */}
      <div className="rpt-canvas" ref={printRef}>

        {/* ═══════════════════════════════════════════════════════════════
            COVER / HERO
        ════════════════════════════════════════════════════════════════ */}
        <div className="rpt-cover">
          <div className="rpt-cover-top">
            <div className="rpt-brand">
              <div className="rpt-brand-logo" style={{ background: "transparent", boxShadow: "none" }}>
                <img src="/logo.png" alt="MY FizioAI Logo" style={{ width: "40px", height: "40px", objectFit: "contain", borderRadius: "8px" }} />
              </div>
              <div>
                <div className="rpt-brand-name">MY FizioAI</div>
                <div className="rpt-brand-sub">Biyomekanik Değerlendirme Platformu</div>
              </div>
            </div>
            <div className="rpt-cover-badge">
              <CheckCircle2 size={16} /> Rapor Tarihi: {reportDate}
            </div>
          </div>

          <div className="rpt-cover-body">
            {/* Avatar */}
            <div className="rpt-patient-avatar">
              {patient.profile?.photo ? (
                <img 
                  src={patient.profile.photo.startsWith('http') || patient.profile.photo.startsWith('/') ? patient.profile.photo : `/${patient.profile.photo}`} 
                  alt={patient.name} 
                  onError={(e) => {
                    // Resim yüklenemezse placeholder'ı göster
                    e.currentTarget.style.display = 'none';
                    if (e.currentTarget.nextElementSibling) {
                      (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'block';
                    }
                  }}
                />
              ) : null}
              <svg 
                viewBox="0 0 110 110" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg" 
                width="110" 
                height="110" 
                style={{ display: patient.profile?.photo ? "none" : "block" }}
              >
                <rect width="110" height="110" fill="#e2e8f0"/>
                <circle cx="55" cy="40" r="20" fill="#94a3b8"/>
                <ellipse cx="55" cy="95" rx="34" ry="26" fill="#94a3b8"/>
                <ellipse cx="55" cy="76" rx="11" ry="9" fill="#e2e8f0"/>
              </svg>
            </div>

            {/* Patient info */}
            <div className="rpt-cover-info" style={{ flex: 1 }}>
              <h1>
                Postür Analiz<br />
                <span>Raporu</span>
              </h1>
              <div className="rpt-cover-info-sub">
                {patient.name} &nbsp;·&nbsp;
                {patient.profile?.age ? `${patient.profile.age} Yaş` : "Yaş belirtilmemiş"} &nbsp;·&nbsp;
                {patient.profile?.gender === "male" ? "Erkek" : patient.profile?.gender === "female" ? "Kadın" : "Cinsiyet belirtilmemiş"}
              </div>
              <div className="rpt-cover-meta">
                <div className="rpt-meta-chip">
                  <strong>Ölçüm Tarihi</strong>
                  {sessionDate}
                </div>
                {patient.profile?.responsibleAdmin && (
                  <div className="rpt-meta-chip">
                    <strong>Sorumlu Terapist</strong>
                    {patient.profile.responsibleAdmin.name}
                  </div>
                )}
                {patient.profile?.phone && (
                  <div className="rpt-meta-chip">
                    <strong>Telefon</strong>
                    {patient.profile.phone}
                  </div>
                )}
                <div className="rpt-meta-chip">
                  <strong>Modül Sayısı</strong>
                  {session.testResults.length} Test Tamamlandı
                </div>
              </div>
            </div>

            {/* Grade badge */}
            <div className="rpt-grade-badge">
              <div className="rpt-grade-letter" style={{ color: grade.color }}>{grade.grade}</div>
              <div className="rpt-grade-label">{grade.label}</div>
              <div className="rpt-grade-desc">{grade.desc}</div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            KLİNİSYEN GÖRÜŞÜ
        ════════════════════════════════════════════════════════════════ */}
        {session.clinicalOpinion && (
          <div className="rpt-section">
            <div className="rpt-section-title">
              <div className="rpt-section-icon"><Stethoscope size={20} /></div>
              Klinisyen Görüşü & Tedavi Notları
            </div>
            <div className="rpt-clinical-box">
              <p>{session.clinicalOpinion}</p>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            ÖZET — RİSK DAĞILIMI
        ════════════════════════════════════════════════════════════════ */}
        <div className="rpt-section">
          <div className="rpt-section-title">
            <div className="rpt-section-icon"><Target size={20} /></div>
            Risk Dağılımı Özeti
          </div>

          <div className="rpt-risk-summary">
            <div className="rpt-risk-card red">
              <div className="rpt-risk-count red">{highRisk.length}</div>
              <div className="rpt-risk-card-text">
                <h4>Yüksek Risk</h4>
                <p>Öncelikli değerlendirme alanları</p>
              </div>
            </div>
            <div className="rpt-risk-card orange">
              <div className="rpt-risk-count orange">{medRisk.length}</div>
              <div className="rpt-risk-card-text">
                <h4>Orta Risk</h4>
                <p>Takip ve erken müdahale önerilir</p>
              </div>
            </div>
            <div className="rpt-risk-card green">
              <div className="rpt-risk-count green">{okRisk.length}</div>
              <div className="rpt-risk-card-text">
                <h4>Normal Aralık</h4>
                <p>Koruyucu yaklaşım yeterli</p>
              </div>
            </div>
          </div>

          {/* Short desc */}
          {patient.profile?.shortDescription && (
            <div className="rpt-patient-note">
              <strong><Info size={16} style={{ color: "var(--brand)" }} /> Hasta Notu:</strong> 
              <p>{patient.profile.shortDescription}</p>
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            YAPAY ZEKA RİSK ANALİZİ
        ════════════════════════════════════════════════════════════════ */}
        <div className="rpt-section">
          <div className="rpt-section-title">
            <div className="rpt-section-icon"><Activity size={20} /></div>
            Yapay Zeka Risk Analizi — 14 Kondisyon
          </div>

          <div className="rpt-insights-grid">
            {insights.map((insight, idx) => {
              const col = riskColor(insight.color);
              const Icon = insight.icon;
              return (
                <div key={idx} className="rpt-insight-card">
                  <div className="rpt-insight-ring">
                    <RingChart score={insight.riskScore} color={col.stroke} size={72} />
                    <div className="rpt-insight-ring-score" style={{ color: col.text }}>
                      <div style={{ fontSize: "14px", fontWeight: 900 }}>{insight.riskScore}</div>
                      <div style={{ fontSize: "9px", opacity: 0.8 }}>/ 100</div>
                    </div>
                    <div className="rpt-insight-icon"><Icon size={12} strokeWidth={3} /></div>
                  </div>
                  <div className="rpt-insight-body">
                    <h4>{insight.title}</h4>
                    <p>{insight.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            TEST MODÜL DETAYLARI (fotoğraf + ölçümler)
        ════════════════════════════════════════════════════════════════ */}
        <div className="rpt-section">
          <div className="rpt-section-title">
            <div className="rpt-section-icon"><Move size={20} /></div>
            Ölçüm Modülü Detayları & Kritik An Fotoğrafları
          </div>

          <div className="rpt-test-grid">
            {session.testResults.map((test) => {
              const ql = qualityLabel(test.overallQuality);
              return (
                <div key={test.id} className="rpt-test-card">
                  <div className="rpt-test-header">
                    <h4>{TEST_TYPE_MAP[test.testType] || test.testType}</h4>
                    <span className={`qual-badge ${ql.cls}`}>{ql.text}</span>
                  </div>

                  {/* Fotoğraf */}
                  <div className="rpt-test-snapshot-wrap">
                    {test.snapshotUrl ? (
                      <>
                        <img
                          src={test.snapshotUrl.startsWith('http') ? test.snapshotUrl : `/${test.snapshotUrl}`}
                          alt={TEST_TYPE_MAP[test.testType] || test.testType}
                          className="rpt-test-snapshot"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            if (e.currentTarget.nextElementSibling) {
                              (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
                            }
                          }}
                        />
                        <div className="flex-col items-center gap-3" style={{ display: 'none' }}>
                          <ImageIcon size={40} className="opacity-40" />
                          <span className="text-sm font-medium opacity-60">Görsel Kaydı Yok</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-3">
                        <ImageIcon size={40} className="opacity-40" />
                        <span className="text-sm font-medium opacity-60">Görsel Kaydı Yok</span>
                      </div>
                    )}
                  </div>

                  {/* Metrikler */}
                  <div className="rpt-test-body">
                    {/* Confidence bar */}
                    <div style={{ marginBottom: "18px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#64748b", marginBottom: "8px", fontWeight: 500 }}>
                        <span>AI Güven Skoru</span>
                        <strong>{(test.avgConfidence * 100).toFixed(0)}%</strong>
                      </div>
                      <div style={{ height: "6px", background: "rgba(0,0,0,0.05)", borderRadius: "100px", overflow: "hidden" }}>
                        <div style={{
                          height: "100%", borderRadius: "100px",
                          width: `${(test.avgConfidence * 100).toFixed(0)}%`,
                          background: test.avgConfidence > 0.8 ? "#22c55e" : test.avgConfidence > 0.6 ? "#eab308" : "#ef4444"
                        }} />
                      </div>
                    </div>

                    {/* Measurement rows */}
                    {test.measurements.map((m) => {
                      const isOk = m.quality === "acceptable" || m.quality === "good" || m.quality === "excellent";
                      const threshold = QUALITY_THRESHOLDS[m.metricKey];
                      return (
                        <div key={m.id} className="rpt-metric-row">
                          <div>
                            <div className="rpt-metric-name">{METRIC_NAME_MAP[m.metricKey] || m.metricKey}</div>
                            {threshold && <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>{threshold.label}</div>}
                          </div>
                          <div className="rpt-metric-right">
                            <span className="rpt-metric-value">
                              {m.value.toFixed(1)}{m.unit ? ` ${m.unit}` : ""}
                            </span>
                            <div className={`rpt-metric-dot ${isOk ? "ok" : "bad"}`} />
                          </div>
                        </div>
                      );
                    })}
                    {test.measurements.length === 0 && (
                      <p style={{ fontSize: "13px", color: "#94a3b8", fontStyle: "italic", textAlign: "center", padding: "10px 0" }}>Ölçüm verisi çıkarılamadı.</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>


        {/* ═══════════════════════════════════════════════════════════════
            TAVSİYE / ÖNERİLER
        ════════════════════════════════════════════════════════════════ */}
        <div className="rpt-section">
          <div className="rpt-section-title">
            <div className="rpt-section-icon"><Navigation size={20} /></div>
            Genel Öneriler
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px" }}>
            {[
              { icon: Activity, title: "Egzersiz", text: "Günlük postür egzersizleri ve esneme hareketleri ağrı riskini %40 oranında azaltır." },
              { icon: ShieldAlert, title: "Ergonomi", text: "Masa başı çalışmada monitör yüksekliği ve sandalye ayarı iyileşme için kritik öneme sahiptir." },
              { icon: RotateCw, title: "Takip", text: "3-6 ay aralıklarla tekrarlanan ölçümler ilerlemenin ve tedavinin takibini sağlar." },
            ].map((tip, i) => {
              const TipIcon = tip.icon;
              return (
                <div key={i} style={{ background: "rgba(255,255,255,0.7)", backdropFilter: "blur(20px)", border: "1px solid rgba(0,0,0,0.05)", borderRadius: "20px", padding: "24px", boxShadow: "0 4px 20px rgba(0,0,0,0.02)" }}>
                  <div style={{ marginBottom: "16px", color: "var(--brand)", background: "rgba(79,70,229,0.1)", width: "48px", height: "48px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "14px" }}>
                    <TipIcon size={24} />
                  </div>
                  <h4 style={{ fontWeight: "700", fontSize: "15px", color: "#0f172a", marginBottom: "8px" }}>{tip.title}</h4>
                  <p style={{ fontSize: "13px", color: "#64748b", lineHeight: "1.7" }}>{tip.text}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            FOOTER
        ════════════════════════════════════════════════════════════════ */}
        <div className="rpt-footer">
          <div>
            <div className="rpt-footer-brand flex items-center gap-2">
              <Activity size={18} /> MY FizioAI Platform
            </div>
            <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>
              AI Destekli Biyomekanik Değerlendirme
            </div>
          </div>
          <div className="rpt-footer-note">
            Rapor No: {session.id.slice(-8).toUpperCase()}<br />
            Oluşturulma: {reportDate}
          </div>
        </div>

        <div className="rpt-disclaimer">
          <ShieldAlert size={20} className="text-slate-400 shrink-0" />
          <div>
            <strong className="text-slate-700">Önemli Not:</strong> Bu rapor, yapay zeka destekli biyomekanik ölçüm verileri temel alınarak oluşturulmuştur ve
            tanısal amaç taşımamaktadır. Kesin tanı ve tedavi planlaması için lisanslı bir fizyoterapist veya ortopedi uzmanına başvurulması
            zorunludur. Bu rapor, MY FizioAI platformunun özel kullanımı içindir; izin alınmadan çoğaltılamaz.
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            İLETİŞİM BİLGİLERİ
        ════════════════════════════════════════════════════════════════ */}
        <div className="rpt-contact-card">
          <div>
            <div className="rpt-contact-title">My FizyoPilates: Gaziantep Fizyoterapi ve Rehabilitasyon</div>
            <div className="rpt-contact-text" style={{ display: "flex", flexWrap: "wrap", gap: "4px 12px", alignItems: "center" }}>
              <span style={{ whiteSpace: "nowrap" }}>📍 <strong>Adres:</strong> Atatürk, Duisburg Blv. ALEYNA APT NO: 19/B, 27560 Şehitkamil/Gaziantep</span>
              <span style={{ color: "#cbd5e1" }}>|</span>
              <span style={{ whiteSpace: "nowrap" }}>📞 <strong>Telefon:</strong> (0342) 341 10 00</span>
              <span style={{ color: "#cbd5e1" }}>|</span>
              <span style={{ whiteSpace: "nowrap" }}>✉️ <strong>E-posta:</strong> info@myfizyo.com</span>
            </div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0, opacity: 0.9 }}>
             <img src="/logo.png" alt="MyFizyoTerapi" style={{ width: "36px", height: "36px", objectFit: "contain", borderRadius: "6px" }} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PostureReportPage() {
  return (
    <Suspense fallback={
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: "16px", flexDirection: "column", fontFamily: "Inter, sans-serif", color: "#64748b" }}>
        <div style={{ width: 48, height: 48, border: "4px solid #4f46e5", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <p>Rapor hazırlanıyor...</p>
      </div>
    }>
      <ReportInner />
    </Suspense>
  );
}
