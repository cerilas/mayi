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

  const generateInsights = (session: Session): Insight[] => {
    const insights: Insight[] = [];
    let shoulderLevel = 0;
    let hipLevel = 0;
    let fhp = 0;
    let trunkLean = 0;
    let minRom = 180;
    let leftRom = 180;
    let rightRom = 180;
    let squatReps = 5;
    let leftKneeFlex = 0;
    let rightKneeFlex = 0;
    let trunkShiftFront = 0;
    let trunkShiftSquat = 0;

    // Extract all metrics from this session
    session.testResults.forEach(test => {
      test.measurements.forEach(m => {
        if (m.metricKey === "shoulderLevelAngle") shoulderLevel = m.value;
        if (m.metricKey === "pelvicLevelAngle") hipLevel = m.value;
        if (m.metricKey === "forwardHeadAngle") fhp = m.value;
        if (m.metricKey === "sagittalTrunkLean") trunkLean = m.value;
        
        if (m.metricKey === "leftShoulderROM") leftRom = m.value;
        if (m.metricKey === "rightShoulderROM") rightRom = m.value;
        minRom = Math.min(leftRom, rightRom);

        if (m.metricKey === "completedRepetitions") squatReps = m.value;
        if (m.metricKey === "maxLeftKneeFlexion") leftKneeFlex = m.value;
        if (m.metricKey === "maxRightKneeFlexion") rightKneeFlex = m.value;
        
        if (m.metricKey === "trunkLateralLean") trunkShiftFront = m.value;
        if (m.metricKey === "maxTrunkShift") trunkShiftSquat = m.value;
      });
    });

    // 1. Skolyoz / Asimetri Eğilimi
    let scoliosisScore = Math.min(95, (shoulderLevel + hipLevel) * 9);
    insights.push({
      title: "Skolyoz / Asimetri Eğilimi",
      description: (shoulderLevel > 2 || hipLevel > 2) 
        ? `Omuz (${shoulderLevel.toFixed(1)}°) ve kalça (${hipLevel.toFixed(1)}°) seviyelerinde asimetri tespit edildi.`
        : `Omuz ve kalça hizası normal sınırlarda.`,
      riskScore: Math.round(scoliosisScore),
      color: scoliosisScore > 70 ? "red" : (scoliosisScore > 30 ? "orange" : "green")
    });

    // 2. İleri Baş Postürü (Boyun Düzleşmesi)
    let fhpScore = Math.max(5, Math.min(95, (fhp - 5) * 4));
    insights.push({
      title: "İleri Baş Postürü / Boyun Düzleşmesi",
      description: fhp > 12 
        ? `Baş normal dikey eksenden ${fhp.toFixed(1)}° ileride duruyor.`
        : `Baş-boyun hizası dikey eksende sağlıklı görünüyor.`,
      riskScore: Math.round(fhpScore),
      color: fhpScore > 60 ? "red" : (fhpScore > 30 ? "orange" : "green")
    });

    // 3. Gövde Öne Eğilim (Kifoz Riski)
    let kyphosisScore = Math.max(5, Math.min(90, trunkLean * 6));
    insights.push({
      title: "Gövde Öne Eğilim (Kifoz / Kamburluk)",
      description: trunkLean > 6 
        ? `Gövde dikey eksenden ${trunkLean.toFixed(1)}° öne eğik pozisyonda.`
        : `Gövde dikliği normal sınırlarda.`,
      riskScore: Math.round(kyphosisScore),
      color: kyphosisScore > 60 ? "red" : (kyphosisScore > 30 ? "orange" : "green")
    });

    // 4. Bel Fıtığı Riski (Yanal Gövde Kayması + Pelvis)
    let herniatedDiscScore = Math.max(5, Math.min(95, (trunkShiftFront + hipLevel) * 10));
    insights.push({
      title: "Bel Fıtığı Riski (Kompansasyon)",
      description: herniatedDiscScore > 30 
        ? `Ağrıdan kaçınmak için gövde ağırlık merkezinin asimetrik dağıldığı tespit edildi.`
        : `Bel ve pelvis bölgesi dengeli yük taşıyor.`,
      riskScore: Math.round(herniatedDiscScore),
      color: herniatedDiscScore > 60 ? "red" : (herniatedDiscScore > 30 ? "orange" : "green")
    });

    // 5. Boyun Fıtığı Riski
    let cervicalScore = Math.max(5, Math.min(95, (fhp > 15 ? (fhp * 3) : 5) + (Math.abs(leftRom - rightRom) * 0.5)));
    insights.push({
      title: "Boyun Fıtığı Riski",
      description: cervicalScore > 30 
        ? `Şiddetli ileri baş postürü servikal sinir baskısı ve boyun fıtığı riski taşıyor.`
        : `Boyun ekseninde riskli bir baskı saptanmadı.`,
      riskScore: Math.round(cervicalScore),
      color: cervicalScore > 60 ? "red" : (cervicalScore > 30 ? "orange" : "green")
    });

    // 6. Menisküs / Ön Çapraz Bağ (Asimetrik Diz Flex)
    let kneeAsymmetry = Math.abs(leftKneeFlex - rightKneeFlex);
    let aclScore = Math.max(5, Math.min(95, kneeAsymmetry * 4));
    insights.push({
      title: "Menisküs / Çapraz Bağ Riski",
      description: kneeAsymmetry > 15 
        ? `Sağ ve sol dizin bükülme açıları arasında ciddi fark var (Kısıtlılık).`
        : `Her iki dizin bükülme açısı ve yük dağılımı dengeli.`,
      riskScore: Math.round(aclScore),
      color: aclScore > 60 ? "red" : (aclScore > 30 ? "orange" : "green")
    });

    // 7. Donuk Omuz (Frozen Shoulder)
    let frozenShoulderScore = Math.max(5, Math.min(95, (120 - minRom) * 2));
    insights.push({
      title: "Donuk Omuz Şüphesi",
      description: frozenShoulderScore > 40 
        ? `Omuz eklem açıklığı kritik seviyede (< 100°) kısıtlanmış.`
        : `Omuz kapsülünde ciddi bir donukluk belirtisi yok.`,
      riskScore: Math.round(frozenShoulderScore),
      color: frozenShoulderScore > 60 ? "red" : (frozenShoulderScore > 30 ? "orange" : "green")
    });

    // 8. Omuz Mobilite Kısıtlılığı
    let mobilityScore = Math.max(5, Math.min(90, (180 - minRom) * 1.5));
    insights.push({
      title: "Omuz Mobilite Kısıtlılığı (Genel)",
      description: minRom < 160 
        ? `Omuz eklem açıklığı ideal 180°'nin altında kaldı (${minRom.toFixed(1)}°).`
        : `Omuz hareket açıklığı mükemmel seviyede.`,
      riskScore: Math.round(mobilityScore),
      color: mobilityScore > 60 ? "red" : (mobilityScore > 30 ? "orange" : "green")
    });

    // 9. Dizde Sıvı Kaybı / Kireçlenme
    let kneeFlex = Math.max(leftKneeFlex, rightKneeFlex);
    let oaScore = Math.max(5, Math.min(95, (squatReps < 5 ? 20 : 0) + (90 - kneeFlex)));
    insights.push({
      title: "Dizde Sıvı Kaybı / Kireçlenme",
      description: oaScore > 40 
        ? `Squat derinliği ve tekrar sayısında ciddi yetersizlik mevcut.`
        : `Alt ekstremite gücü ve eklem aralığı sağlıklı.`,
      riskScore: Math.round(oaScore),
      color: oaScore > 60 ? "red" : (oaScore > 30 ? "orange" : "green")
    });

    // 10. Kulak Çınlaması (Servikojenik)
    let tinnitusScore = Math.max(5, Math.min(90, (fhp - 12) * 5));
    insights.push({
      title: "Kulak Çınlaması (Servikojenik Bağlantı)",
      description: tinnitusScore > 40 
        ? `Boyun kaslarındaki aşırı gerginlik ve boyun düzleşmesi çınlamayı tetikleyebilir.`
        : `Servikal eksende çınlamaya yol açacak gerginlik görülmüyor.`,
      riskScore: Math.round(tinnitusScore),
      color: tinnitusScore > 60 ? "red" : (tinnitusScore > 30 ? "orange" : "green")
    });

    // 11. Genel Duruş Bozukluğu (Postüral Sendrom)
    let generalPostureScore = Math.round((scoliosisScore + fhpScore + kyphosisScore) / 3);
    insights.push({
      title: "Genel Duruş Bozukluğu",
      description: generalPostureScore > 30 
        ? `Birden fazla postüral sapma bir arada görülüyor.`
        : `Genel iskelet yapısı ve duruş formu çok sağlıklı.`,
      riskScore: generalPostureScore,
      color: generalPostureScore > 60 ? "red" : (generalPostureScore > 30 ? "orange" : "green")
    });

    // 12. Fibromiyalji (Dolaylı Analiz)
    let fibroScore = Math.max(5, Math.min(60, (generalPostureScore * 0.8)));
    insights.push({
      title: "Fibromiyalji (Dolaylı)",
      description: `Bu oran duruş bozukluğunun kronik yaygın ağrı yaratma potansiyelidir (Özel klinik test gerektirir).`,
      riskScore: Math.round(fibroScore),
      color: fibroScore > 40 ? "orange" : "green"
    });

    // 13. Tenisçi/Golfçü Dirseği (Dolaylı)
    insights.push({
      title: "Tenisçi/Golfçü Dirseği (Dolaylı)",
      description: `Dirsek ve el bileği için spesifik ROM testleri gereklidir. Omuz analizi üzerinden yansıyan risk bulunamadı.`,
      riskScore: 5,
      color: "green"
    });

    // 14. Topuk Dikeni / Pelvik Taban (Dolaylı)
    insights.push({
      title: "Topuk Dikeni / Pelvik Taban",
      description: `Ayak basış analizi ve klinik palpe testi yapılması önerilir.`,
      riskScore: 5,
      color: "green"
    });

    return insights;
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
                  <h3 className="font-bold text-indigo-900 text-sm">Genişletilmiş Yapay Zeka Risk Analizi (14 Kondisyon)</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {generateInsights(session).map((insight, idx) => (
                    <div key={idx} className="bg-white p-4 rounded-xl shadow-sm border border-indigo-50/50 flex gap-4 items-center">
                      
                      {/* Circular Progress Bar */}
                      <div className="relative flex items-center justify-center w-12 h-12 shrink-0">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                          <circle cx="18" cy="18" r="15" fill="none" className="stroke-gray-100" strokeWidth="3" />
                          <circle 
                            cx="18" cy="18" r="15" fill="none" 
                            className={`transition-all duration-1000 ease-out ${
                              insight.color === 'red' ? 'stroke-red-500' :
                              insight.color === 'orange' ? 'stroke-orange-400' :
                              insight.color === 'yellow' ? 'stroke-yellow-400' :
                              'stroke-green-500'
                            }`}
                            strokeWidth="3" 
                            strokeDasharray="94.2" /* 2 * pi * r (15) = 94.2 */
                            strokeDashoffset={94.2 - (94.2 * insight.riskScore) / 100}
                            strokeLinecap="round" 
                          />
                        </svg>
                        <span className={`absolute text-[10px] font-bold ${
                          insight.color === 'red' ? 'text-red-700' :
                          insight.color === 'orange' ? 'text-orange-700' :
                          insight.color === 'yellow' ? 'text-yellow-700' :
                          'text-green-700'
                        }`}>
                          %{insight.riskScore}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-800 text-sm truncate mb-1" title={insight.title}>{insight.title}</h4>
                        <p className="text-xs text-gray-500 leading-snug line-clamp-2" title={insight.description}>{insight.description}</p>
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
    </div>
  );
}
