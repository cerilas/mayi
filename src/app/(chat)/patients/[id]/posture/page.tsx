"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  generateInsights,
  applyInsightOverrides,
  colorFromScore,
  type InsightColor,
} from "@/lib/posture-report-data";

interface Measurement {
  id: string;
  metricKey: string;
  value: number;
  unit: string;
  quality: string;
  confidence?: number;
}

interface TestResult {
  id: string;
  testType: string;
  overallQuality: string;
  avgConfidence: number;
  snapshotUrl?: string;
  measurements: Measurement[];
}

interface Session {
  id: string;
  deviceInfo: string;
  createdAt: string;
  clinicalOpinion?: string;
  testResults: TestResult[];
  insightOverrides?: Array<{
    insightKey: string;
    aiScore: number;
    clinicianScore: number;
  }>;
}

export default function PostureReportsPage() {
  const { id: userId } = useParams();
  const router = useRouter();
  
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [opinions, setOpinions] = useState<Record<string, string>>({});
  const [clinicianScores, setClinicianScores] = useState<Record<string, Record<string, number>>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saveStatus, setSaveStatus] = useState<Record<string, { type: "success" | "error", message: string } | null>>({});

  const handleSaveOpinion = async (sessionId: string) => {
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) return;
    setSaving(prev => ({ ...prev, [sessionId]: true }));
    setSaveStatus(prev => ({ ...prev, [sessionId]: null }));
    try {
      const aiInsights = generateInsights(session);
      const insightOverrides = aiInsights.map((insight) => ({
        insightKey: insight.key,
        aiScore: insight.aiScore,
        clinicianScore: clinicianScores[sessionId]?.[insight.key] ?? insight.aiScore,
      }));
      const res = await fetch(`/api/posture/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clinicalOpinion: opinions[sessionId] || "",
          insightOverrides,
        })
      });
      if (!res.ok) throw new Error("Kayıt başarısız, tekrar deneyin.");
      setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, clinicalOpinion: opinions[sessionId], insightOverrides } : s));
      setSaveStatus(prev => ({ ...prev, [sessionId]: { type: "success", message: "Görüş ve risk yüzdeleri kaydedildi!" } }));
      
      setTimeout(() => {
        setSaveStatus(prev => ({ ...prev, [sessionId]: null }));
      }, 3000);
    } catch (e: any) {
      setSaveStatus(prev => ({ ...prev, [sessionId]: { type: "error", message: e.message } }));
    } finally {
      setSaving(prev => ({ ...prev, [sessionId]: false }));
    }
  };

  useEffect(() => {
    async function fetchSessions() {
      try {
        const res = await fetch(`/api/posture/sessions?userId=${userId}`);
        if (!res.ok) throw new Error("Veriler alınamadı");
        const data = await res.json();
        setSessions(data);
        const initialOpinions: Record<string, string> = {};
        const initialScores: Record<string, Record<string, number>> = {};
        data.forEach((s: Session) => {
          if (s.clinicalOpinion) initialOpinions[s.id] = s.clinicalOpinion;
          const applied = applyInsightOverrides(generateInsights(s), s.insightOverrides);
          initialScores[s.id] = Object.fromEntries(
            applied.map((i) => [i.key, i.clinicianScore ?? i.aiScore])
          );
        });
        setOpinions(initialOpinions);
        setClinicianScores(initialScores);
      } catch (err: any) {
        setError(err.message || "Bir hata oluştu");
      } finally {
        setLoading(false);
      }
    }
    
    if (userId) fetchSessions();
  }, [userId]);

  const formatTestType = (type: string) => {
    const map: Record<string, string> = {
      "front_static_posture": "Ön Postür Analizi",
      "side_static_posture": "Yan Postür Analizi",
      "squat_5_reps": "Squat Analizi (5 Tekrar)",
      "shoulder_flexion": "Omuz Fleksiyonu",
      "shoulder_abduction": "Omuz Abdüksiyonu"
    };
    return map[type] || type;
  };

  const formatQuality = (quality: string) => {
    switch (quality.toLowerCase()) {
      case "high": 
      case "excellent": return <span className="text-green-600 bg-green-50 px-2 py-0.5 rounded text-xs font-medium border border-green-200">Yüksek / Mükemmel</span>;
      case "good": return <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded text-xs font-medium border border-blue-200">İyi</span>;
      case "acceptable": return <span className="text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded text-xs font-medium border border-yellow-200">Kabul Edilebilir</span>;
      case "low":
      case "poor": return <span className="text-orange-600 bg-orange-50 px-2 py-0.5 rounded text-xs font-medium border border-orange-200">Düşük Kalite</span>;
      case "invalid": return <span className="text-red-600 bg-red-50 px-2 py-0.5 rounded text-xs font-medium border border-red-200">Geçersiz / Hatalı Ölçüm</span>;
      default: return <span className="text-gray-600 bg-gray-50 px-2 py-0.5 rounded text-xs font-medium border border-gray-200">{quality}</span>;
    }
  };

  const formatMetricName = (key: string) => {
    const map: Record<string, string> = {
      "shoulderLevelAngle": "Omuz Denge Açısı",
      "pelvicLevelAngle": "Kalça (Pelvis) Denge Açısı",
      "trunkLateralLean": "Gövde Yana Eğilim",
      "forwardHeadAngle": "İleri Baş Açısı (FHP)",
      "sagittalTrunkLean": "Gövde Öne Eğilim",
      "completedRepetitions": "Tamamlanan Tekrar",
      "maxLeftKneeFlexion": "Maks. Sol Diz Fleksiyonu",
      "maxRightKneeFlexion": "Maks. Sağ Diz Fleksiyonu",
      "maxTrunkShift": "Gövde Yanal Kayması",
      "leftShoulderROM": "Sol Omuz ROM",
      "rightShoulderROM": "Sağ Omuz ROM",
      "difference": "Sağ/Sol Farkı"
    };
    return map[key] || key;
  };

  return (
    <div className="flex-1 h-full overflow-y-auto bg-gray-50">
      <div className="p-4 sm:p-8 w-full max-w-[1600px] mx-auto pb-24">
        <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Postür Analizi Raporları</h1>
          <p className="text-sm text-gray-500 mt-1">Hastanın mobil cihaz ile yapılan değerlendirme sonuçları</p>
        </div>
      </div>


      {loading ? (
        <div className="flex justify-center items-center h-64">
          <span className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl">{error}</div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-20 bg-white border border-gray-200 rounded-2xl">
          <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Henüz Rapor Yok</h3>
          <p className="text-gray-500">Bu hasta için kaydedilmiş bir postür analizi bulunmuyor.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {sessions.map((session) => (
            <div key={session.id} className="bg-white border border-gray-200 shadow-sm rounded-2xl overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Oturum: {new Date(session.createdAt).toLocaleDateString("tr-TR", { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</h2>
                  <p className="text-xs text-gray-500 mt-1 font-mono">{session.id}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-xs text-gray-400 bg-white px-2 py-1 border border-gray-200 rounded">
                    {session.deviceInfo || "Cihaz Bilgisi Yok"}
                  </div>
                  {session.clinicalOpinion ? (
                    <a
                      href={`/posture-report/${userId}?sessionId=${session.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:-translate-y-0.5"
                      style={{ background: "linear-gradient(135deg, #4f46e5, #6366f1)", boxShadow: "0 2px 8px rgba(79,70,229,0.25)" }}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                      </svg>
                      PDF Oluştur
                    </a>
                  ) : (
                    <div 
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-400 bg-gray-100 border border-gray-200 cursor-not-allowed"
                      title="PDF oluşturmak için önce Klinik Görüş eklemelisiniz"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      PDF Oluştur
                    </div>
                  )}
                </div>
              </div>
              
              {/* AI + clinician risk scores */}
              <div className="px-6 py-5 bg-gradient-to-br from-indigo-50 to-blue-50 border-b border-indigo-100">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    <h3 className="font-bold text-indigo-900 text-sm">Risk Analizi (14 Kondisyon)</h3>
                  </div>
                  <p className="text-[11px] text-indigo-700/80">
                    Çubuğu kaydırarak klinisyen yüzdesini değiştirin. Dikey çizgi yapay zeka skorudur. PDF klinisyen değerini kullanır.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
                  {generateInsights(session).map((insight) => {
                    const clinic = clinicianScores[session.id]?.[insight.key] ?? insight.aiScore;
                    const tone = colorFromScore(clinic);
                    return (
                      <div key={insight.key} className="bg-white p-3.5 rounded-xl shadow-sm border border-indigo-50/50">
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <h4 className="font-semibold text-gray-800 text-sm leading-snug" title={insight.title}>{insight.title}</h4>
                          <span className={`shrink-0 text-xs font-bold ${scoreTextClass(tone)}`}>%{clinic}</span>
                        </div>
                        <p className="text-[11px] text-gray-500 leading-snug line-clamp-2 mb-2.5" title={insight.description}>{insight.description}</p>
                        <DualRiskBar
                          aiScore={insight.aiScore}
                          clinicianScore={clinic}
                          tone={tone}
                          onChange={(value) =>
                            setClinicianScores((prev) => ({
                              ...prev,
                              [session.id]: { ...(prev[session.id] || {}), [insight.key]: value },
                            }))
                          }
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ═══════════════════════════════════════════════════════════════
                  KLİNİK GÖRÜŞ ALANI 
              ════════════════════════════════════════════════════════════════ */}
              <div className="px-6 py-5 bg-white border-b border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    <h3 className="font-semibold text-gray-800 text-sm">Klinisyen Görüşü ve Notlar</h3>
                  </div>
                  {!session.clinicalOpinion && (
                    <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-md border border-amber-200">PDF oluşturmak için gerekli</span>
                  )}
                </div>
                <div className="flex flex-col gap-3">
                  <textarea 
                    value={opinions[session.id] ?? ""}
                    onChange={(e) => setOpinions(prev => ({ ...prev, [session.id]: e.target.value }))}
                    placeholder="Bu oturum için hasta değerlendirmenizi, öne çıkan bulguları ve tedavi önerilerinizi yazın..."
                    className="w-full text-sm p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent min-h-[100px] resize-y bg-gray-50/50"
                  />
                  <div className="flex justify-between items-center mt-1">
                    <div className="text-sm flex-1">
                      {saveStatus[session.id] && (
                        <div className={`flex items-center gap-2 ${saveStatus[session.id]?.type === 'error' ? 'text-red-600' : 'text-emerald-600'}`}>
                          {saveStatus[session.id]?.type === 'error' ? (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                          )}
                          <span className="font-medium animate-in fade-in slide-in-from-bottom-1">{saveStatus[session.id]?.message}</span>
                        </div>
                      )}
                    </div>
                    <button 
                      onClick={() => handleSaveOpinion(session.id)}
                      disabled={saving[session.id]}
                      className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shrink-0"
                    >
                      {saving[session.id] ? (
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      )}
                      {saving[session.id] ? "Kaydediliyor..." : "Görüş ve yüzdeleri kaydet"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {session.testResults.map((test) => (
                    <div key={test.id} className="border border-gray-100 rounded-xl bg-gray-50/50 overflow-hidden">
                      <div className="px-4 py-3 bg-white border-b border-gray-100 flex justify-between items-center">
                        <h3 className="font-semibold text-gray-800">{formatTestType(test.testType)}</h3>
                        {formatQuality(test.overallQuality)}
                      </div>
                      
                      <div className="flex flex-col sm:flex-row p-4 gap-4">
                        {test.snapshotUrl && (
                          <div className="w-full sm:w-2/5 bg-gray-50 rounded-lg p-2 border border-gray-100 flex justify-center h-[280px]">
                            <img 
                              src={test.snapshotUrl.startsWith('http') ? test.snapshotUrl : (test.snapshotUrl.startsWith('uploads/') ? `/api/${test.snapshotUrl}` : `/${test.snapshotUrl}`)} 
                              alt={formatTestType(test.testType)} 
                              className="w-full h-full object-contain" 
                            />
                          </div>
                        )}
                        <div className="w-full sm:w-3/5 flex flex-col justify-center space-y-3">
                        {test.measurements.map((m) => (
                          <div key={m.id} className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-600">{formatMetricName(m.metricKey)}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-bold text-indigo-900">
                                {m.value.toFixed(1)} {m.unit}
                              </span>
                              {m.quality !== "acceptable" && m.quality !== "good" && m.quality !== "excellent" && (
                                <span className="w-2 h-2 rounded-full bg-red-400" title="Dikkat Gerektirir"></span>
                              )}
                            </div>
                          </div>
                        ))}
                        {test.measurements.length === 0 && (
                          <p className="text-sm text-gray-400 italic">Ölçüm verisi yok.</p>
                        )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {session.testResults.length === 0 && (
                    <div className="col-span-full text-center py-6 text-gray-500">Bu oturumda modül sonucu bulunamadı.</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}

function scoreTextClass(tone: InsightColor) {
  if (tone === "red") return "text-red-700";
  if (tone === "orange") return "text-orange-700";
  if (tone === "yellow") return "text-yellow-700";
  return "text-emerald-700";
}

function DualRiskBar({
  aiScore,
  clinicianScore,
  tone,
  onChange,
}: {
  aiScore: number;
  clinicianScore: number;
  tone: InsightColor;
  onChange: (value: number) => void;
}) {
  const fill =
    tone === "red"
      ? "bg-red-500"
      : tone === "orange"
        ? "bg-orange-400"
        : tone === "yellow"
          ? "bg-yellow-400"
          : "bg-emerald-500";
  const ai = Math.max(0, Math.min(100, aiScore));
  const clinic = Math.max(0, Math.min(100, clinicianScore));

  return (
    <div>
      <div className="relative h-3 rounded-full bg-slate-100">
        <div
          className={`absolute inset-y-0 left-0 rounded-full ${fill}`}
          style={{ width: `${clinic}%` }}
        />
        <div
          className="absolute top-1/2 z-10 h-4 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-800"
          style={{ left: `${ai}%` }}
          title={`Yapay zeka: %${ai}`}
        />
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={clinic}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 z-20 w-full cursor-pointer opacity-0"
          aria-label="Klinisyen risk yüzdesi"
        />
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[10px] font-medium text-slate-500">
        <span>
          AI <strong className="text-slate-800">%{ai}</strong>
        </span>
        <span>
          Klinisyen <strong className="text-slate-800">%{clinic}</strong>
        </span>
      </div>
    </div>
  );
}
