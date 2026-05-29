"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AdminDocsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated" || session?.user?.role !== "admin") {
      router.push("/chat");
    }
  }, [status, session, router]);

  if (!mounted || status === "loading") {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-purple-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (session?.user?.role !== "admin") return null;

  return (
    <div className="flex-1 h-full overflow-y-auto bg-[var(--bg-primary)] p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-12 pb-20">
        
        {/* Header */}
        <div className="border-b border-[var(--border-primary)] pb-8">
          <div className="w-16 h-16 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-6">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h1 className="text-4xl font-extrabold text-[var(--text-primary)] mb-4 tracking-tight">Kapsamlı Sistem Kılavuzu</h1>
          <p className="text-lg text-[var(--text-secondary)] leading-relaxed">
            MYFizyo AI platformunun tüm yeteneklerini keşfedin. Bu detaylı kılavuz, yapay zeka destekli fizyoterapi asistanının her bir özelliğini, ayarlarını, sohbet araçlarını ve hasta yönetimi süreçlerini en ince ayrıntısına kadar adım adım açıklamaktadır.
          </p>
        </div>

        {/* Section 1: Sistem Mimarisi */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            </div>
            1. Sistem Mimarisi ve Kullanıcı İzolasyonu
          </h2>
          
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-2xl p-6 md:p-8 space-y-4 text-[var(--text-secondary)] leading-relaxed">
            <p>
              Platform, veri güvenliğini ve deneyimi optimize etmek için <strong className="text-[var(--text-primary)]">Admin (Uzman)</strong> ve <strong className="text-[var(--text-primary)]">Hasta</strong> panellerini tamamen birbirinden izole eder. Her iki taraf da aynı görsel uygulamayı kullansa da, arka planda çalışan yapay zeka beyni, erişilen özellikler ve veri setleri tamamen farklıdır.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-900/10">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                  <strong className="text-blue-900 dark:text-blue-300">Uzman Arayüzü</strong>
                </div>
                <p className="text-sm text-blue-800 dark:text-blue-200/80">Sınırlandırılmamış tam yetkili erişim. Web araması, görsel üretme, dosya okuma ve sistem ayarlarına tam erişim. Global veritabanlarına ulaşarak karmaşık akademik araştırmalar veya tıbbi çeviriler yapabilir.</p>
              </div>
              <div className="p-4 rounded-xl border border-green-200 dark:border-green-900/50 bg-green-50 dark:bg-green-900/10">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  <strong className="text-green-900 dark:text-green-300">Hasta Arayüzü</strong>
                </div>
                <p className="text-sm text-green-800 dark:text-green-200/80">Sıkı sınırlandırılmış, güvenli erişim. Web araması veya görsel üretme gibi maliyetli özellikleri kullanamaz. Sadece fizyoterapistin atadığı hastalık verilerini okuyabilir ve asla kendi başına yeni tıbbi teşhis koymaz.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Sohbet Özellikleri */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
            </div>
            2. Gelişmiş Sohbet ve Asistan Özellikleri
          </h2>
          
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-2xl p-6 md:p-8 space-y-8 text-[var(--text-secondary)] leading-relaxed">
            <p>
              Sohbet (Chat) modülü, sıradan bir mesajlaşma alanından öte, tam donanımlı bir asistan olarak tasarlanmıştır. Aşağıdaki özelliklerin tamamını Sohbet sayfasında kullanabilirsiniz:
            </p>

            <div className="space-y-6">
              
              <div className="flex items-start gap-4">
                <div className="shrink-0 mt-1 text-purple-500">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">Web Araması (Web Search)</h3>
                  <p className="text-sm">Mesaj yazma kutusunun yanındaki <strong>Dünya (Arama)</strong> ikonuna tıkladığınızda asistan İnternet Araması moduna geçer. Asistana sorduğunuz soru, yapay zeka tarafından doğrudan güncel internet sitelerinde taranır ve size en güncel akademik makaleler veya haberler referans linkleriyle birlikte özetlenerek sunulur. (Not: Bu özellik API maliyetini artırdığı için hastalara kapalıdır).</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="shrink-0 mt-1 text-purple-500">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">Görsel Üretme (Image Generation)</h3>
                  <p className="text-sm">Mesaj yazma kutusunun yanındaki <strong>Fırça (Görsel Üret)</strong> ikonuna tıkladığınızda, yazdığınız metin bir komut (prompt) olarak algılanır ve yapay zeka size tarif ettiğiniz görseli çizer. Üretilen görseller mesaj balonu içinde görüntülenir, üzerine tıklayarak büyütebilir, indirebilir veya üzerinde değişiklik yapılmasını isteyebilirsiniz. (Hastalara kapalıdır).</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="shrink-0 mt-1 text-purple-500">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">PDF ve Görsel Analizi (Vision & Document Processing)</h3>
                  <p className="text-sm">Ataç (Dosya Yükle) ikonuna tıklayarak bilgisayarınızdan veya telefonunuzdan hastaya ait MR/Röntgen görüntülerini veya laboratuvar sonucu PDF belgelerini yükleyebilirsiniz. Yapay zeka bu belgeleri satır satır okuyup analiz edebilir veya görüntülerdeki patolojileri raporlayabilir. Hastalar da kendi hesaplarından tahlil sonuçlarını yükleyebilirler.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="shrink-0 mt-1 text-purple-500">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">Sesli Okuma (Text-to-Speech) ve UX İyileştirmeleri</h3>
                  <p className="text-sm">Yapay zekanın gönderdiği her mesajın altında, fareyle üzerine geldiğinizde (mobilde ise her zaman) bir <strong>Sesli Oku (Hoparlör)</strong> ikonu belirir. Buna tıklayarak uzun metinleri dinleyebilirsiniz. Ayrıca, çok uzun yanıtlar sayfa akışını bozmasın diye otomatik olarak <strong>"Devamını Gör"</strong> butonuyla kısaltılır; tıklayarak genişletebilirsiniz.</p>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* Section 3: Modeller */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
            </div>
            3. Yapay Zeka Model Yönetimi
          </h2>
          
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-2xl p-6 md:p-8 space-y-6 text-[var(--text-secondary)] leading-relaxed">
            <p>
              Ayarlar sekmesinden "Kullanılacak Yapay Zeka Modeli" ve "Hastalar İçin Yapay Zeka Modeli" olmak üzere iki farklı motor seçebilirsiniz. Sistemin performansını ve API maliyetlerini doğrudan bu seçimler etkiler.
            </p>

            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-primary)]">
                <div className="mt-1">
                  <svg className="w-6 h-6 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </div>
                <div>
                  <h3 className="text-[var(--text-primary)] font-bold mb-1">Uzman (Admin) İçin Ağır Modeller (Örn: GPT-4o)</h3>
                  <p className="text-sm">Maksimum zeka ve karmaşık problemleri çözme yeteneğine sahiptir. Görüntü analizi, detaylı tıbbi makale araştırması ve uzun metin üretimi gibi yüksek bilişsel işlemler için gereklidir. Maliyetleri yüksektir. <strong>Öneri:</strong> Sadece kendi hesap ayarlarınızda "Kullanılacak Model" olarak seçilmelidir.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4 p-4 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-primary)]">
                <div className="mt-1">
                  <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <div>
                  <h3 className="text-[var(--text-primary)] font-bold mb-1">Hastalar İçin Hafif Modeller (Örn: GPT-4o-mini)</h3>
                  <p className="text-sm">Yanıt süreleri milisaniyeler seviyesindedir ve token başına API maliyetleri oldukça düşüktür. Rutin "Bugün egzersizimi yaptım", "Belim ağrıyor ne yapmalıyım?" gibi diyaloglar için fazlasıyla zekidir. <strong>Öneri:</strong> Hastalar için Ayarlar menüsünden mutlaka "mini" modellerden biri seçilmelidir.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: Prompt Engineering */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
            </div>
            4. Sistem Talimatları (Prompt Engineering)
          </h2>
          
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-2xl p-6 md:p-8 space-y-4 text-[var(--text-secondary)] leading-relaxed">
            <p>
              Sistem talimatları, yapay zekanın <strong>"karakterini, sınırlarını ve iletişim dilini"</strong> belirleyen temel komut setidir. Bu alanlara yazacağınız her kelime, yapay zekanın hastaya ve size vereceği yanıtları kökten değiştirir.
            </p>
            
            <div className="overflow-hidden rounded-xl border border-[var(--border-primary)] mt-6">
              <table className="min-w-full divide-y divide-[var(--border-primary)] text-sm">
                <thead className="bg-[var(--bg-primary)]">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left font-semibold text-[var(--text-primary)] w-1/3">Alan</th>
                    <th scope="col" className="px-4 py-3 text-left font-semibold text-[var(--text-primary)] w-2/3">Kullanım Amacı ve Örnek Komut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-primary)] bg-[var(--bg-secondary)]">
                  <tr>
                    <td className="px-4 py-4 text-[var(--text-primary)] font-medium align-top">Uzman Talimatı</td>
                    <td className="px-4 py-4 align-top">
                      Admin arayüzünde sizinle konuşurken takınacağı klinik ve profesyonel tavrı belirler.<br/>
                      <span className="inline-block mt-2 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded font-mono text-xs">Örn: Sen uzman bir asistan fizyoterapistsin. Bana tıbbi literatüre dayanarak cevaplar ver, kanıtsız bilgi sunma.</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-4 text-[var(--text-primary)] font-medium align-top">Hasta Talimatı</td>
                    <td className="px-4 py-4 align-top">
                      Hastalarla konuşurken takınacağı kısıtlayıcı tavrı belirler. Hukuki ve tıbbi güvenlik için çok önemlidir.<br/>
                      <span className="inline-block mt-2 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded font-mono text-xs">Örn: Sen bu kliniğin hasta destek asistanısın. Asla hastalara yeni teşhis koyma. Sadece onlara moral ver ve kliniğin verdiği egzersizleri hatırlat. Acil bir durum belirtilirse kliniği aramalarını söyle.</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Section 5: Hasta Yönetimi */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            </div>
            5. Tıbbi Veri, Context Injection ve Hasta Yönetimi
          </h2>
          
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-2xl p-6 md:p-8 space-y-8 text-[var(--text-secondary)] leading-relaxed">
            
            <p>
              "Hastalarım" modülü sadece bir rehber veya liste değildir. Bu modül sistemin <strong>Veri Besleme (Context Injection)</strong> merkezidir. Yeni bir hasta kaydettiğinizde ve tıbbi alanlarını doldurduğunuzda, bu bilgiler sistemin arka planında otomatik olarak o hastanın yapay zekasına "hafıza" olarak enjekte edilir.
            </p>

            <div className="space-y-6">
              
              <div className="flex gap-4">
                <div className="shrink-0 mt-1 text-rose-500">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">Teşhis, Uzun Detaylar ve Klinik Görüş</h3>
                  <p className="text-sm">Hastanın <strong>Kısa Tanıtım</strong> alanına "Bel Fıtığı L4", <strong>Uzun Detaylar</strong> alanına "Geçmişte iki kez operasyon geçirmiş, sabahları ağrısı artıyor", <strong>Klinik Görüş</strong> alanına ise "Kesinlikle ağırlık kaldırmamalı, günde 20 dk yürüyüş yapmalı" yazdığınızı varsayalım. Hasta yapay zekaya "Sabahları belim ağrıyor ne yapmalıyım?" diye sorduğunda, yapay zeka bu verileri birleştirerek: "Geçmiş operasyonlarınızdan dolayı bu normal olabilir, ancak fizyoterapistimizin de belirttiği gibi ağırlık kaldırmamaya özen gösterin ve yürüyüşünüzü aksatmayın" şeklinde kişiselleştirilmiş bir yanıt üretir.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="shrink-0 mt-1 text-rose-500">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">Egzersiz Video Atamaları ve Önizleme Kartları</h3>
                  <p className="text-sm">Hasta düzenleme sayfasındaki "Video Ekle" alanına hastanın yapmasını istediğiniz YouTube egzersiz videolarının linkini tek tek ekleyebilirsiniz. Yapay zeka, hastaya egzersiz tavsiyesi verirken bu linkleri otomatik olarak kullanır. Sistem, sohbet ekranında YouTube linklerini sıradan bir metin olarak göstermek yerine, <strong>videonun kapağını (thumbnail) ve ortasında bir 'Play' tuşunu</strong> içeren şık ve interaktif bir karta dönüştürür.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="shrink-0 mt-1 text-rose-500">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">Hesap Yönetimi ve Şifre İşlemleri</h3>
                  <p className="text-sm">Hasta ilk eklendiğinde sisteme girmesi için zorunlu olan 8 haneli rastgele şifre otomatik oluşturulur. Hasta listesinde ilgili hastanın satırında yer alan kalem ikonuna basıp düzenleme ekranına girerek veya doğrudan <strong>"SMS"</strong> butonuna basarak mevcut şifreyi görebilir, değiştirebilir ve hastaya mesaj olarak iletebilirsiniz.</p>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* Section 6: Kota & SMS */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
            </div>
            6. SMS Otomasyonu ve Kullanım Kotaları
          </h2>
          
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-2xl p-6 md:p-8 space-y-6 text-[var(--text-secondary)] leading-relaxed">
            
            <p>
              Sistem, hastalarla doğrudan ve kurumsal bir iletişim kurabilmeniz için <strong>NetGSM API</strong> altyapısı ile entegredir. Ayrıca, finansal kontrolü sağlamak amacıyla her kullanıcının bir soru sorma kotası bulunur.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-5 h-5 text-[var(--text-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  <h3 className="font-bold text-[var(--text-primary)]">Kullanım Hakları (Yapay Zeka Limiti)</h3>
                </div>
                <p className="text-sm mb-3">Her hastanın yapay zeka ile haftalık konuşma limiti vardır. Hasta her bir mesaj yazdığında, veritabanındaki <code>remainingRights</code> değeri 1 düşer. 0'a ulaştığında yapay zeka cevap vermeyi reddeder. Bu döngü, her haftanın başlangıcında (sıfırlanma tarihinde) otomatik olarak yenilenir.</p>
                <p className="text-sm text-[var(--brand)] font-medium">Manuel Hak Tanımlama ve Limitsiz Kullanım: Hastanın düzenleme ekranındaki "Hak Tanımla" butonu ile ona ek kota verebilirsiniz. Eğer "Limitsiz" seçeneğini kullanırsanız hak değeri 999.999 olarak güncellenir ve asla tükenmez.</p>
              </div>

              <div className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-5 h-5 text-[var(--text-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  <h3 className="font-bold text-[var(--text-primary)]">SMS Gönderim Senaryoları</h3>
                </div>
                <ul className="text-sm space-y-2 list-disc pl-4">
                  <li><strong>Şifre Hatırlatma:</strong> Hasta listesindeki SMS butonuna bastığınızda, hastanın şifresi sistem tarafından anında deşifre edilip SMS metnine eklenir ve doğrudan hastanın telefonuna gönderilebilir.</li>
                  <li><strong>Hak Bildirimi:</strong> Hastaya manuel olarak hak tanımladığınızda, sistem arka planda otomatik olarak "Hesabınıza yeni danışma hakkı tanımlanmıştır" şeklinde bir bilgilendirme SMS'i atar.</li>
                </ul>
              </div>
            </div>

            <div className="mt-4 p-4 rounded-xl border border-teal-200 dark:border-teal-900/50 bg-teal-50 dark:bg-teal-900/10 flex items-start gap-3">
              <svg className="w-5 h-5 text-teal-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <div className="text-sm text-teal-900 dark:text-teal-200">
                <strong>NetGSM Başlığı (Header) Önemli:</strong> SMS'lerin onaylı kurumsal adınızla iletilebilmesi için, Ayarlar menüsünden NetGSM Başlığınızı (Örn: MYFIZYO) tanımladığınızdan emin olun. Aksi halde operatör SMS'i reddedebilir.
              </div>
            </div>

          </div>
        </section>

      </div>
    </div>
  );
}
