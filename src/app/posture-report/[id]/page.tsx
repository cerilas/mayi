"use client";

import { useEffect, useState, Suspense, type ReactNode } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Download,
  Activity,
  Target,
  Stethoscope,
  ClipboardList,
  CheckCircle2,
  ShieldAlert,
  Info,
  Loader2,
  Video,
  Camera,
  CameraOff,
} from "lucide-react";
import {
  type ReportData,
  generateInsights,
  applyInsightOverrides,
  overallRiskGrade,
  qualityLabel,
  genderLabel,
  formatTrDate,
  resolveAssetUrl,
  TEST_TYPE_MAP,
  METRIC_NAME_MAP,
  MODULE_REF_IMAGES,
  assessMetric,
  severityPalette,
  posturalIndex,
  posturalIndexBand,
  symmetryIndex,
  riskSeverity,
} from "@/lib/posture-report-data";
import { generateAndDownloadPosturePdf } from "@/lib/posture-pdf";
import { BodyRiskHeatmap } from "@/components/posture/BodyRiskHeatmap";

function ReportInner() {
  const { id: userId } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get("sessionId") ?? undefined;

  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedSessionIdx, setSelectedSessionIdx] = useState(0);
  const [includePatientPhotos, setIncludePatientPhotos] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const params = new URLSearchParams({ userId });
        if (sessionId) params.set("sessionId", sessionId);
        const res = await fetch(`/api/posture/report?${params}`);
        if (!res.ok) throw new Error("Veriler alınamadı");
        setData(await res.json());
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Hata");
      } finally {
        setLoading(false);
      }
    }
    if (userId) load();
  }, [userId, sessionId]);

  const handleDownloadPdf = async () => {
    if (!data) return;
    const session = data.sessions[selectedSessionIdx];
    if (!session) return;
    setExporting(true);
    setExportError("");
    try {
      await generateAndDownloadPosturePdf({
        patient: data.patient,
        session,
        includePatientPhotos,
      });
    } catch (e: unknown) {
      console.error("[posture-pdf]", e);
      setExportError(
        e instanceof Error ? e.message : "PDF oluşturulamadı. Lütfen tekrar deneyin."
      );
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 gap-4 text-slate-500">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p>Rapor hazırlanıyor...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-10 text-center text-red-500 min-h-screen bg-slate-50">
        {error}
      </div>
    );
  }

  if (!data || data.sessions.length === 0) {
    return (
      <div className="p-10 text-center text-slate-500 min-h-screen bg-slate-50">
        Bu hasta için rapor verisi bulunamadı.
      </div>
    );
  }

  const session = data.sessions[selectedSessionIdx];
  const patient = data.patient;
  const insights = applyInsightOverrides(
    generateInsights(session),
    session.insightOverrides
  );
  const grade = overallRiskGrade(insights);
  const reportDate = formatTrDate(new Date());
  const sessionDate = formatTrDate(session.createdAt, true);
  const highRisk = insights.filter((i) => i.color === "red");
  const medRisk = insights.filter((i) => i.color === "orange");
  const okRisk = insights.filter((i) => i.color === "green");
  const pIndex = posturalIndex(insights);
  const pBand = posturalIndexBand(pIndex);
  const symIndex = symmetryIndex(session);
  const totalMetrics = session.testResults.reduce((s, t) => s + t.measurements.length, 0);

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900">
      {/* Toolbar */}
      <div className="sticky top-0 z-50 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur-md sm:px-8">
        <button
          type="button"
          onClick={() => router.push(`/patients/${userId}/posture`)}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <ArrowLeft size={16} /> Geri
        </button>
        <span className="flex flex-1 items-center gap-2 text-sm font-semibold text-slate-800">
          <ClipboardList size={18} className="text-indigo-600" />
          Postür Analiz Raporu —{" "}
          <strong className="text-indigo-950">{patient.name}</strong>
        </span>

        {data.sessions.length > 1 && (
          <select
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
            value={selectedSessionIdx}
            onChange={(e) => setSelectedSessionIdx(Number(e.target.value))}
          >
            {data.sessions.map((s, i) => (
              <option key={s.id} value={i}>
                {new Date(s.createdAt).toLocaleDateString("tr-TR", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </option>
            ))}
          </select>
        )}

        <label
          className="inline-flex items-center gap-2 cursor-pointer select-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
          title="PDF raporunda gerçek hasta fotoğraflarına yer verilsin mi?"
        >
          <input
            type="checkbox"
            checked={includePatientPhotos}
            onChange={(e) => setIncludePatientPhotos(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
          />
          <span className="flex items-center gap-1.5">
            {includePatientPhotos ? (
              <Camera size={15} className="text-indigo-600" />
            ) : (
              <CameraOff size={15} className="text-slate-400" />
            )}
            <span>Gerçek Hasta Fotoğrafları</span>
          </span>
          <span
            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
              includePatientPhotos
                ? "bg-indigo-50 text-indigo-700 border border-indigo-100"
                : "bg-amber-50 text-amber-700 border border-amber-100"
            }`}
          >
            {includePatientPhotos ? "Fotoğraflı" : "Temsili Görsel"}
          </span>
        </label>

        <button
          type="button"
          onClick={handleDownloadPdf}
          disabled={exporting}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-60"
        >
          {exporting ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Download size={16} />
          )}
          {exporting ? "PDF hazırlanıyor..." : "PDF İndir"}
        </button>
      </div>

      {exportError && (
        <div className="mx-auto max-w-5xl px-4 pt-4 sm:px-8">
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {exportError}
          </div>
        </div>
      )}

      <div className="mx-auto max-w-5xl px-4 pt-4 sm:px-8 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500">
        <p>
          PDF çıktısı sabit A4 (maks. 2 sayfa) olarak üretilir; ekran boyutu veya cihazdan etkilenmez.
        </p>
        <span className="inline-flex items-center gap-1.5 font-medium text-slate-600 bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
          Fotoğraf Seçeneği:{" "}
          <strong className={includePatientPhotos ? "text-indigo-600" : "text-amber-600"}>
            {includePatientPhotos
              ? "Gerçek hasta fotoğrafları aktif"
              : "Temsili şablon görselleri aktif (Gizlilik / Placeholder)"}
          </strong>
        </span>
      </div>

      {/* Screen preview (not used for PDF) */}
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-8">
        {/* Cover */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <img
                src="/logo.png"
                alt="MY FizioAI"
                className="h-11 w-11 rounded-lg object-contain"
              />
              <div>
                <div className="text-lg font-extrabold tracking-tight">
                  MY FizioAI
                </div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Biyomekanik Değerlendirme Platformu
                </div>
              </div>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2 text-xs font-semibold text-indigo-800">
              <CheckCircle2 size={14} /> Rapor Tarihi: {reportDate}
            </div>
          </div>

          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="flex-1">
              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
                Postür Analiz <span className="text-indigo-600">Raporu</span>
              </h1>
              <p className="mt-2 text-sm font-medium text-slate-600">
                {patient.name} ·{" "}
                {patient.profile?.age != null
                  ? `${patient.profile.age} Yaş`
                  : "Yaş belirtilmemiş"}{" "}
                · {genderLabel(patient.profile?.gender)}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <MetaChip label="Ölçüm Tarihi" value={sessionDate} />
                {patient.profile?.responsibleAdmin && (
                  <MetaChip
                    label="Sorumlu Terapist"
                    value={patient.profile.responsibleAdmin.name}
                  />
                )}
                {patient.profile?.phone && (
                  <MetaChip label="Telefon" value={patient.profile.phone} />
                )}
                <MetaChip
                  label="Modül / Parametre"
                  value={`${session.testResults.length} test · ${totalMetrics} parametre`}
                />
              </div>
            </div>
            <div className="shrink-0 rounded-2xl border border-slate-200 bg-slate-50 px-8 py-5 text-center">
              <div
                className="text-5xl font-black leading-none"
                style={{ color: grade.color }}
              >
                {grade.grade}
              </div>
              <div className="mt-2 text-sm font-bold text-slate-700">
                {grade.label}
              </div>
              <div className="mt-1 max-w-[140px] text-xs text-slate-500">
                {grade.desc}
              </div>
            </div>
          </div>
        </section>

        <Section icon={<Target size={18} />} title="Klinik Özet">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Genel değerlendirme
              </div>
              <div className="mt-1 text-3xl font-black" style={{ color: grade.color }}>
                {grade.grade}
              </div>
              <div className="text-sm font-semibold text-slate-800">{grade.label}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Postüral indeks
              </div>
              <div className="mt-1 text-3xl font-black" style={{ color: pBand.color }}>
                {pIndex}
                <span className="ml-1 text-sm font-semibold text-slate-400">/100</span>
              </div>
              <div className="text-sm font-semibold" style={{ color: pBand.color }}>
                {pBand.label}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Risk dağılımı
              </div>
              <div className="mt-2 space-y-1 text-sm">
                <div className="flex justify-between text-red-600">
                  <span>Yüksek</span><strong>{highRisk.length}</strong>
                </div>
                <div className="flex justify-between text-orange-600">
                  <span>Orta</span><strong>{medRisk.length}</strong>
                </div>
                <div className="flex justify-between text-emerald-600">
                  <span>Normal</span><strong>{okRisk.length}</strong>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Simetri indeksi
              </div>
              {symIndex != null ? (
                <>
                  <div className="mt-1 text-3xl font-black text-slate-900">
                    {symIndex}
                    <span className="ml-1 text-sm font-semibold text-slate-400">%</span>
                  </div>
                  <div className="text-xs text-slate-500">Sağ/sol omuz ROM dengesi</div>
                </>
              ) : (
                <div className="mt-3 text-sm text-slate-400">Bilateral ROM verisi yok</div>
              )}
            </div>
          </div>
        </Section>

        {session.clinicalOpinion && (
          <Section
            icon={<Stethoscope size={18} />}
            title="Klinisyen Görüşü & Tedavi Notları"
          >
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
              {session.clinicalOpinion}
            </div>
          </Section>
        )}

        {patient.profile?.shortDescription && (
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
            <strong className="mb-1 flex items-center gap-2 text-slate-800">
              <Info size={14} className="text-indigo-600" /> Hasta Notu
            </strong>
            {patient.profile.shortDescription}
          </div>
        )}

        <Section
          icon={<Activity size={18} />}
          title="Yapay Zeka Risk Stratifikasyonu"
        >
          <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_200px]">
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="hidden grid-cols-[1.4fr_80px_90px_2fr] bg-slate-800 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-white sm:grid">
                <span>Kondisyon</span>
                <span>Risk</span>
                <span>Şiddet</span>
                <span>Klinik bulgu</span>
              </div>
              {insights.map((insight, idx) => {
                const sev = riskSeverity(insight.color);
                const pal = severityPalette(sev);
                return (
                  <div
                    key={idx}
                    className={`grid gap-2 px-4 py-2.5 text-sm sm:grid-cols-[1.4fr_80px_90px_2fr] ${
                      idx % 2 ? "bg-slate-50" : "bg-white"
                    }`}
                  >
                    <div className="font-semibold text-slate-900">{insight.title}</div>
                    <div className="font-bold" style={{ color: pal.color }}>
                      {insight.riskScore}
                    </div>
                    <div>
                      <span
                        className="inline-block rounded-full px-2 py-0.5 text-[11px] font-bold"
                        style={{ color: pal.color, background: pal.bgSoft }}
                      >
                        {pal.label}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">{insight.description}</div>
                  </div>
                );
              })}
            </div>
            <div className="lg:sticky lg:top-20">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Bölgesel risk haritası
              </div>
              <BodyRiskHeatmap insights={insights} />
              <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                Renk ve sayı, o vücut bölgesindeki güncel risk yüzdesini gösterir
                (klinisyen düzeltmesi varsa o kullanılır).
              </p>
            </div>
          </div>
        </Section>

        {session.videoUrl && (
          <Section icon={<Video size={18} />} title="Randevu Değerlendirme Videosu">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="w-full md:w-3/5 bg-slate-950 rounded-xl overflow-hidden shadow-inner flex items-center justify-center aspect-video">
                  <video
                    src={resolveAssetUrl(session.videoUrl) || undefined}
                    controls
                    playsInline
                    preload="metadata"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex-1 space-y-3 w-full">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold">
                    <Video size={14} />
                    <span>Kesintisiz Oturum Kaydı</span>
                  </div>
                  <h4 className="text-base font-bold text-slate-900">
                    Tüm Değerlendirme Videosu
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Bu kayıt, randevu boyunca tüm pozisyon testlerini kesintisiz olarak içermektedir. İncelemek veya arşivlemek için tek tıkla cihazınıza indirebilirsiniz.
                  </p>
                  <a
                    href={resolveAssetUrl(session.videoUrl) || "#"}
                    download={`postur_videosu_${patient.name.replace(/\s+/g, "_")}_${session.createdAt.slice(0, 10)}.mp4`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
                  >
                    <Download size={16} />
                    <span>Videoyu İndir</span>
                  </a>
                </div>
              </div>
            </div>
          </Section>
        )}

        <Section icon={<Activity size={18} />} title="Ölçüm Modülü Detayları">
          <div className="grid gap-4 lg:grid-cols-2">
            {session.testResults.map((test) => {
              const ql = qualityLabel(test.overallQuality);
              const realSnap = resolveAssetUrl(test.snapshotUrl);
              const placeholderSnap = MODULE_REF_IMAGES[test.testType] || null;
              const snap = includePatientPhotos ? realSnap : (placeholderSnap || realSnap);
              const isUsingPlaceholder = !includePatientPhotos && !!placeholderSnap;
              const video = resolveAssetUrl(test.videoUrl);
              return (
                <div
                  key={test.id}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                    <h4 className="text-sm font-bold">
                      {TEST_TYPE_MAP[test.testType] || test.testType}
                    </h4>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                        ql.ok
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {ql.text}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row">
                    <div className="flex flex-col gap-2 min-h-[140px] items-center justify-center bg-slate-50 sm:w-2/5 p-2 border-r border-slate-100">
                      {snap ? (
                        <div className="relative w-full flex flex-col items-center">
                          <img
                            src={snap}
                            alt=""
                            className="max-h-40 w-full object-contain rounded-md"
                          />
                          {isUsingPlaceholder && (
                            <span className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-semibold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200">
                              Temsili Görsel (Gizlilik)
                            </span>
                          )}
                        </div>
                      ) : !video ? (
                        <span className="text-xs text-slate-400">
                          Görsel yok
                        </span>
                      ) : null}
                      
                      {video && (
                        <video
                          src={video}
                          controls
                          playsInline
                          preload="metadata"
                          className="max-h-40 w-full object-contain rounded-md mt-2"
                        />
                      )}
                    </div>
                    <div className="flex-1 space-y-2 p-4">
                      <div className="mb-2 flex justify-between text-xs text-slate-500">
                        <span>AI Güven</span>
                        <strong>
                          {(test.avgConfidence * 100).toFixed(0)}%
                        </strong>
                      </div>
                      {test.measurements.map((m) => {
                        const a = assessMetric(m.metricKey, m.value, m.unit);
                        const pal = severityPalette(a.severity);
                        return (
                          <div
                            key={m.id}
                            className="flex items-center justify-between border-b border-slate-100 py-1.5 text-sm last:border-0"
                          >
                            <div>
                              <div className="font-medium text-slate-700">
                                {METRIC_NAME_MAP[m.metricKey] || m.metricKey}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {a.reference} · sapma {a.deviation}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold">
                                {m.value.toFixed(1)}
                                {m.unit ? ` ${m.unit}` : ""}
                              </span>
                              <span
                                className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                                style={{ color: pal.color, background: pal.bgSoft }}
                              >
                                {a.status}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                      {test.measurements.length === 0 && (
                        <p className="text-center text-xs italic text-slate-400">
                          Ölçüm verisi çıkarılamadı.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>

        <Section icon={<Target size={18} />} title="Klinik Öneriler">
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              {
                title: "Öncelikli",
                items: ["Postürel farkındalık eğitimi", "Ağrı odaklı klinik muayene", "Aktivite / yük modifikasyonu"],
                tone: "border-t-red-500",
              },
              {
                title: "Kısa vade (0–6 hafta)",
                items: ["Germe & eklem mobilizasyonu", "Kor stabilizasyon egzersizleri", "Ergonomik düzenleme"],
                tone: "border-t-orange-500",
              },
              {
                title: "Uzun vade (6+ hafta)",
                items: ["Progresif kuvvetlendirme", "Motor kontrol & denge", "3–6 ayda kontrol ölçümü"],
                tone: "border-t-emerald-500",
              },
            ].map((tier) => (
              <div
                key={tier.title}
                className={`rounded-xl border border-slate-200 border-t-4 bg-white p-4 ${tier.tone}`}
              >
                <h4 className="mb-2 text-sm font-bold text-slate-900">{tier.title}</h4>
                <ul className="space-y-1 text-xs text-slate-600">
                  {tier.items.map((it) => (
                    <li key={it}>· {it}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-900">
          <strong className="inline-flex items-center gap-2">
            <ShieldAlert size={14} /> Önemli Not:
          </strong>{" "}
          Bu rapor tanısal amaç taşımaz. Kesin tanı ve tedavi için lisanslı
          uzmana başvurulmalıdır.
        </div>
      </div>
    </div>
  );
}

function MetaChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
      <strong className="mb-0.5 block text-sm text-slate-900">{label}</strong>
      {value}
    </div>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2 border-b border-slate-200 pb-2 text-base font-extrabold text-slate-900">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
          {icon}
        </span>
        {title}
      </div>
      {children}
    </section>
  );
}

export default function PostureReportPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-slate-500">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          <p>Rapor hazırlanıyor...</p>
        </div>
      }
    >
      <ReportInner />
    </Suspense>
  );
}
