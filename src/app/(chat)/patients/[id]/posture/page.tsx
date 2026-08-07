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
