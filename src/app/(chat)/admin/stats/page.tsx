"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type StatsData = {
  totalPatients: number;
  activeConversations: number;
  totalMessages: number;
  aiMessages: number;
  aiErrors: number;
  activeAdmins: number;
  avgAge: number;
  genderCounts: Record<string, number>;
  topUsers: { name: string; messageCount: number }[];
  adminsStats: { name: string; patientCount: number }[];
};

export default function AdminStatsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState("all");
  
  // Email Settings
  const [reportEmails, setReportEmails] = useState("");
  const [savingEmails, setSavingEmails] = useState(false);
  const [emailSaveSuccess, setEmailSaveSuccess] = useState(false);

  // SMS Settings
  const [reportPhones, setReportPhones] = useState("");
  const [savingPhones, setSavingPhones] = useState(false);
  const [phoneSaveSuccess, setPhoneSaveSuccess] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated" || session?.user?.role !== "admin") {
      router.push("/chat");
      return;
    }
    
    fetchStats(period);
    fetchSettings();
  }, [status, session, router, period]);

  async function fetchSettings() {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        if (data.daily_report_emails) {
          setReportEmails(data.daily_report_emails);
        }
        if (data.daily_report_phones) {
          setReportPhones(data.daily_report_phones);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function saveEmails() {
    setSavingEmails(true);
    setEmailSaveSuccess(false);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "daily_report_emails", value: reportEmails })
      });
      if (res.ok) {
        setEmailSaveSuccess(true);
        setTimeout(() => setEmailSaveSuccess(false), 3000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingEmails(false);
    }
  }

  async function savePhones() {
    setSavingPhones(true);
    setPhoneSaveSuccess(false);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "daily_report_phones", value: reportPhones })
      });
      if (res.ok) {
        setPhoneSaveSuccess(true);
        setTimeout(() => setPhoneSaveSuccess(false), 3000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingPhones(false);
    }
  }

  async function fetchStats(selectedPeriod: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/stats?period=${selectedPeriod}`);
      if (!res.ok) throw new Error("İstatistikler alınamadı.");
      const data = await res.json();
      setStats(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (status === "loading" || (loading && !stats)) {
    return (
      <div className="flex-1 h-full overflow-y-auto bg-gray-50 dark:bg-[#111] p-4 sm:p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header Skeleton */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl animate-pulse" />
              <div>
                <div className="h-6 w-48 bg-gray-200 dark:bg-gray-800 rounded mb-2 animate-pulse" />
                <div className="h-4 w-64 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
              </div>
            </div>
          </div>
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex-1 p-8 bg-[var(--bg-primary)]">
        <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-200">
          {error || "Veriler yüklenemedi."}
        </div>
      </div>
    );
  }

  const totalGender = Object.values(stats.genderCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="flex-1 h-full overflow-y-auto bg-gray-50 dark:bg-[#111] p-4 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">Sistem İstatistikleri</h1>
              <p className="text-sm text-[var(--text-secondary)]">Platform kullanım verileri ve kullanıcı analizleri</p>
            </div>
          </div>
          
          {/* Time Filter - Segmented Control */}
          <div className="bg-gray-100 dark:bg-[#1a1a1a] border border-[var(--border-secondary)] rounded-xl p-1 flex items-center shadow-inner overflow-x-auto max-w-full">
            {[
              { id: "all", label: "Tüm Zamanlar" },
              { id: "this_month", label: "Bu Ay" },
              { id: "30d", label: "Son 30 Gün" },
              { id: "7d", label: "Son 7 Gün" },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={`px-4 py-2 text-sm font-bold rounded-lg transition-all whitespace-nowrap ${
                  period === p.id 
                    ? "bg-[var(--bg-primary)] text-indigo-600 dark:text-indigo-400 shadow-sm border border-[var(--border-secondary)]" 
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-gray-200 dark:hover:bg-[#252525] border border-transparent"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Email Notification Settings */}
        <div className="bg-[var(--bg-primary)] border border-[var(--border-secondary)] rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              Günlük E-posta Raporu
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mt-1">Her gün saat 21:00'da son 24 saatlik istatistikler bu adreslere gönderilir.</p>
          </div>
          <div className="w-full sm:w-auto flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <input 
              type="text" 
              value={reportEmails}
              onChange={(e) => setReportEmails(e.target.value)}
              placeholder="admin@mail.com, yonetici@mail.com" 
              className="w-full sm:w-64 text-sm px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-[var(--text-primary)] placeholder-gray-400 dark:placeholder-gray-500 transition-colors"
            />
            <button 
              onClick={saveEmails}
              disabled={savingEmails}
              className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {savingEmails ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : emailSaveSuccess ? (
                "Kaydedildi ✓"
              ) : (
                "Kaydet"
              )}
            </button>
          </div>
        </div>

        {/* SMS Notification Settings */}
        <div className="bg-[var(--bg-primary)] border border-[var(--border-secondary)] rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-4">
          <div>
            <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
              Günlük SMS Raporu
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mt-1">Her gün saat 21:00'da raporun hazır olduğuna dair bu numaralara SMS gönderilir.</p>
          </div>
          <div className="w-full sm:w-auto flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <input 
              type="text" 
              value={reportPhones}
              onChange={(e) => setReportPhones(e.target.value)}
              placeholder="5XX XXX XX XX, 5YY YYY YY YY" 
              className="w-full sm:w-64 text-sm px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-xl focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 text-[var(--text-primary)] placeholder-gray-400 dark:placeholder-gray-500 transition-colors"
            />
            <button 
              onClick={savePhones}
              disabled={savingPhones}
              className="w-full sm:w-auto px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {savingPhones ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : phoneSaveSuccess ? (
                "Kaydedildi ✓"
              ) : (
                "Kaydet"
              )}
            </button>
          </div>
        </div>

        {/* Stats Content Area (Fades while loading) */}
        <div className={`space-y-8 transition-opacity duration-300 ${loading ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
          {/* Top KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Kayıtlı Hasta" value={stats.totalPatients} icon="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" color="blue" />
          <StatCard title="Aktif Admin" value={stats.activeAdmins} icon="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" color="purple" />
          <StatCard title="Aktif Sohbet" value={stats.activeConversations} icon="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" color="green" />
          <StatCard title="Yaş Ortalaması" value={stats.avgAge} icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" color="orange" />
        </div>

        {/* Message Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[var(--bg-primary)] border border-[var(--border-secondary)] rounded-2xl p-6 shadow-sm flex flex-col justify-center items-center text-center">
            <div className="text-[var(--text-secondary)] text-sm font-bold uppercase tracking-wider mb-2">Toplam Mesaj</div>
            <div className="text-4xl font-extrabold text-[var(--text-primary)]">{stats.totalMessages}</div>
          </div>
          <div className="bg-[var(--bg-primary)] border border-[var(--border-secondary)] rounded-2xl p-6 shadow-sm flex flex-col justify-center items-center text-center">
            <div className="text-[var(--text-secondary)] text-sm font-bold uppercase tracking-wider mb-2">Yapay Zeka Yanıtı</div>
            <div className="text-4xl font-extrabold text-indigo-600 dark:text-indigo-400">{stats.aiMessages}</div>
          </div>
          <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-2xl p-6 shadow-sm flex flex-col justify-center items-center text-center">
            <div className="text-red-800 dark:text-red-400 text-sm font-bold uppercase tracking-wider mb-2">Yapay Zeka Hatası</div>
            <div className="text-4xl font-extrabold text-red-600 dark:text-red-500">{stats.aiErrors}</div>
            <div className="text-xs text-red-600/70 dark:text-red-400/70 mt-2 font-medium">Başarısız istekler</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Left Column: Users & Demographics */}
          <div className="space-y-8">
            {/* Top 5 Users */}
            <div className="bg-[var(--bg-primary)] border border-[var(--border-secondary)] rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-[var(--border-secondary)] bg-[var(--bg-secondary)] flex items-center justify-between">
                <h3 className="font-bold text-[var(--text-primary)]">En Çok Mesajlaşan 5 Hasta</h3>
                <span className="text-xs font-medium bg-[var(--bg-primary)] border border-[var(--border-primary)] px-2 py-1 rounded-md text-[var(--text-secondary)]">Sistem Geneli</span>
              </div>
              <div className="divide-y divide-[var(--border-secondary)]">
                {stats.topUsers.length === 0 && <div className="p-6 text-center text-[var(--text-secondary)] text-sm">Henüz mesajlaşan hasta yok.</div>}
                {stats.topUsers.map((user, idx) => (
                  <div key={idx} className="px-6 py-4 flex items-center justify-between hover:bg-[var(--bg-secondary)] transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${idx === 0 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-500' : idx === 1 ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' : idx === 2 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-500' : 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'}`}>
                        #{idx + 1}
                      </div>
                      <span className="font-medium text-[var(--text-primary)]">{user.name}</span>
                    </div>
                    <div className="text-sm font-bold text-[var(--text-secondary)] bg-[var(--bg-secondary)] px-3 py-1 rounded-lg">
                      {user.messageCount} mesaj
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Gender Distribution */}
            <div className="bg-[var(--bg-primary)] border border-[var(--border-secondary)] rounded-2xl shadow-sm p-6">
              <h3 className="font-bold text-[var(--text-primary)] mb-6">Cinsiyet Dağılımı</h3>
              {totalGender === 0 ? (
                <div className="text-center text-[var(--text-secondary)] text-sm">Veri yok.</div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(stats.genderCounts).sort((a, b) => b[1] - a[1]).map(([gender, count]) => {
                    if (count === 0) return null;
                    const percent = Math.round((count / totalGender) * 100);
                    return (
                      <div key={gender}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-[var(--text-primary)]">{gender}</span>
                          <span className="text-[var(--text-secondary)]">{count} hasta (%{percent})</span>
                        </div>
                        <div className="w-full bg-[var(--bg-secondary)] rounded-full h-2.5 overflow-hidden">
                          <div 
                            className={`h-2.5 rounded-full ${gender === 'Kadın' || gender === 'Kadin' ? 'bg-pink-500' : gender === 'Erkek' ? 'bg-blue-500' : 'bg-gray-400'}`} 
                            style={{ width: `${percent}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Admins */}
          <div className="space-y-8">
            <div className="bg-[var(--bg-primary)] border border-[var(--border-secondary)] rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-[var(--border-secondary)] bg-[var(--bg-secondary)]">
                <h3 className="font-bold text-[var(--text-primary)]">Uzmanlara Göre Hasta Dağılımı</h3>
                <p className="text-xs text-[var(--text-secondary)] mt-1">Hangi adminin kaç hastadan sorumlu olduğunu gösterir.</p>
              </div>
              <div className="divide-y divide-[var(--border-secondary)]">
                {stats.adminsStats.length === 0 && <div className="p-6 text-center text-[var(--text-secondary)] text-sm">Kayıtlı uzman yok.</div>}
                {stats.adminsStats.map((admin, idx) => (
                  <div key={idx} className="px-6 py-4 flex flex-col gap-3 hover:bg-[var(--bg-secondary)] transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                          {admin.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-[var(--text-primary)]">{admin.name}</span>
                      </div>
                      <div className="text-sm font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 px-3 py-1 rounded-lg">
                        {admin.patientCount} Hasta
                      </div>
                    </div>
                    {/* Visual Bar */}
                    <div className="w-full bg-[var(--bg-secondary)] rounded-full h-1.5 overflow-hidden">
                      <div 
                        className="h-1.5 rounded-full bg-purple-500" 
                        style={{ width: `${stats.totalPatients > 0 ? (admin.patientCount / stats.totalPatients) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }: { title: string, value: number, icon: string, color: 'blue' | 'purple' | 'green' | 'orange' }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
    green: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400',
    orange: 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400',
  };

  return (
    <div className="bg-[var(--bg-primary)] border border-[var(--border-secondary)] rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${colors[color]}`}>
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
        </svg>
      </div>
      <div className="text-3xl font-extrabold text-[var(--text-primary)] mb-1">{value}</div>
      <div className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">{title}</div>
    </div>
  );
}
