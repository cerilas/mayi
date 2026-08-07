"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface Measurement {
  id: string;
  metricKey: string;
  value: number;
  unit: string;
  quality: string;
}

interface TestResult {
  id: string;
  testType: string;
  overallQuality: string;
  avgConfidence: number;
  measurements: Measurement[];
}

interface Session {
  id: string;
  deviceInfo: string;
  createdAt: string;
  testResults: TestResult[];
}

interface Insight {
  title: string;
  description: string;
  riskScore: number; // 0-100
  color: "red" | "orange" | "yellow" | "green";
}

export default function PostureReportsPage() {
  const { id: userId } = useParams();
  const router = useRouter();
  
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchSessions() {
      try {
        const res = await fetch(`/api/posture/sessions?userId=${userId}`);
        if (!res.ok) throw new Error("Veriler alınamadı");
        const data = await res.json();
        setSessions(data);
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
      "squat": "Squat Analizi",
      "shoulder_flexion": "Omuz Fleksiyonu",
      "shoulder_abduction": "Omuz Abdüksiyonu"
    };
    return map[type] || type;
  };

  const formatQuality = (quality: string) => {
    switch (quality) {
      case "excellent": return <span className="text-green-600 bg-green-50 px-2 py-0.5 rounded text-xs font-medium border border-green-200">Mükemmel</span>;
      case "good": return <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded text-xs font-medium border border-blue-200">İyi</span>;
      case "acceptable": return <span className="text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded text-xs font-medium border border-yellow-200">Kabul Edilebilir</span>;
      case "poor": return <span className="text-red-600 bg-red-50 px-2 py-0.5 rounded text-xs font-medium border border-red-200">Zayıf</span>;
      default: return <span className="text-gray-600 bg-gray-50 px-2 py-0.5 rounded text-xs font-medium border border-gray-200">{quality}</span>;
    }
  };

  const formatMetricName = (key: string) => {
    const map: Record<string, string> = {
      "shoulderLevelAngle": "Omuz Denge Açısı",
      "hipLevelAngle": "Kalça Denge Açısı",
      "trunkSwayAngle": "Gövde Yana Eğilim",
      "forwardHeadAngle": "İleri Baş Açısı (FHP)",
      "sagittalTrunkLean": "Gövde Öne Eğilim",
      "kneeFlexionAngle": "Diz Fleksiyonu",
      "repsCompleted": "Tamamlanan Tekrar",
      "leftShoulderROM": "Sol Omuz ROM",
      "rightShoulderROM": "Sağ Omuz ROM",
    };
    return map[key] || key;
  };

  const generateInsights = (session: Session): Insight[] => {
    const insights: Insight[] = [];
    let shoulderLevel = 0;
    let hipLevel = 0;
    let fhp = 0;
    let trunkLean = 0;
    let minRom = 180;
    let squatReps = 5;

    // Extract all metrics from this session
    session.testResults.forEach(test => {
      test.measurements.forEach(m => {
        if (m.metricKey === "shoulderLevelAngle") shoulderLevel = m.value;
        if (m.metricKey === "hipLevelAngle") hipLevel = m.value;
        if (m.metricKey === "forwardHeadAngle") fhp = m.value;
        if (m.metricKey === "sagittalTrunkLean") trunkLean = m.value;
        if (m.metricKey === "leftShoulderROM" || m.metricKey === "rightShoulderROM") {
          minRom = Math.min(minRom, m.value);
        }
        if (m.metricKey === "repsCompleted") squatReps = m.value;
      });
    });

    // 1. Scoliosis Risk
    if (shoulderLevel > 2 || hipLevel > 2) {
      let score = Math.min(95, (shoulderLevel + hipLevel) * 9);
      insights.push({
        title: "Skolyoz / Asimetri Şüphesi",
        description: `Omuz (${shoulderLevel.toFixed(1)}°) ve kalça (${hipLevel.toFixed(1)}°) seviyelerinde asimetri tespit edildi.`,
        riskScore: Math.round(score),
        color: score > 70 ? "red" : "orange"
      });
    }

    // 2. FHP (Forward Head Posture)
    if (fhp > 12) {
      let score = Math.min(95, (fhp - 10) * 4);
      insights.push({
        title: "İleri Baş Postürü (Boyun Düzleşmesi)",
        description: `Baş normal dikey eksenden ${fhp.toFixed(1)}° ileride duruyor.`,
        riskScore: Math.round(score),
        color: score > 60 ? "red" : (score > 40 ? "orange" : "yellow")
      });
    }

    // 3. Kyphosis (Trunk Lean)
    if (trunkLean > 6) {
      let score = Math.min(90, trunkLean * 6);
      insights.push({
        title: "Gövde Öne Eğilim (Kifoz Riski)",
        description: `Gövde dikey eksenden ${trunkLean.toFixed(1)}° öne eğik pozisyonda.`,
        riskScore: Math.round(score),
        color: score > 60 ? "red" : "orange"
      });
    }

    // 4. Mobility
    if (minRom < 160) {
      let score = Math.min(90, (180 - minRom) * 1.5);
      insights.push({
        title: "Omuz Mobilite Kısıtlılığı",
        description: `Omuz eklem açıklığı maksimum ${minRom.toFixed(1)}° seviyesinde kaldı.`,
        riskScore: Math.round(score),
        color: score > 60 ? "red" : "orange"
      });
    }

    // Fill with good news if empty
    if (insights.length === 0) {
      insights.push({
        title: "Genel Postür Sağlıklı",
        description: "Temel testlerde belirgin bir duruş bozukluğu veya kısıtlılık saptanmadı.",
        riskScore: 10,
        color: "green"
      });
    }

    return insights;
  };

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto min-h-screen">
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        </button>
        <div>
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
                <div className="text-xs text-gray-400 bg-white px-2 py-1 border border-gray-200 rounded">
                  {session.deviceInfo || "Cihaz Bilgisi Yok"}
                </div>
              </div>
              
              {/* AI Insights Section */}
              <div className="px-6 py-5 bg-gradient-to-br from-indigo-50 to-blue-50 border-b border-indigo-100">
                <div className="flex items-center gap-2 mb-4">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  <h3 className="font-bold text-indigo-900 text-sm">Yapay Zeka Değerlendirmesi</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {generateInsights(session).map((insight, idx) => (
                    <div key={idx} className="bg-white p-4 rounded-xl shadow-sm border border-indigo-50/50">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-gray-800 text-sm">{insight.title}</h4>
                        <span className={`text-xs font-bold px-2 py-1 rounded-md ${
                          insight.color === 'red' ? 'bg-red-100 text-red-700' :
                          insight.color === 'orange' ? 'bg-orange-100 text-orange-700' :
                          insight.color === 'yellow' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          % {insight.riskScore} Risk
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mb-3">{insight.description}</p>
                      
                      {/* Progress Bar */}
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div 
                          className={`h-1.5 rounded-full ${
                            insight.color === 'red' ? 'bg-red-500' :
                            insight.color === 'orange' ? 'bg-orange-400' :
                            insight.color === 'yellow' ? 'bg-yellow-400' :
                            'bg-green-500'
                          }`} 
                          style={{ width: `${insight.riskScore}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
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
                      
                      <div className="p-4 space-y-3">
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
  );
}
